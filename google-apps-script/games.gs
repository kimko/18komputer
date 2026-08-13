const SHEET_NAME = 'games';
const HEADERS = ['game_id', 'ruleset', 'name', 'players', 'created', 'updated', 'data'];

// A Google Sheets cell holds 50000 characters, so an oversized game is refused rather than truncated.
const MAX_DATA_LENGTH = 45000;
// Loose enough for the extra segment that historical CSV imports add to an id.
const ID_PATTERN = /^game_[A-Za-z0-9_-]{1,60}$/;

function doGet(e) {
  try {
    const id = (e && e.parameter && e.parameter.id) || '';
    if (!ID_PATTERN.test(id)) return json({ ok: false, error: 'bad_id' });

    const sheet = getSheet();
    const rowIndex = findRowIndex(sheet, id);
    if (rowIndex === -1) return json({ ok: false, error: 'not_found' });

    const row = sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0];

    // Confirming a stalled save only needs to know the stored game matches, not carry it back over
    // a connection that is already struggling.
    if (e.parameter.hash) {
      const stored = String(row[6] || '');
      return json({ ok: true, id: row[0], hash: hashOf(stored), length: stored.length, updated: toIso(row[5]) });
    }

    return json({
      ok: true,
      id: row[0],
      name: row[2],
      players: row[3],
      updated: toIso(row[5]),
      data: row[6]
    });
  } catch (err) {
    // Without this the caller gets an HTML error page it cannot parse.
    report('error', err, { handler: 'doGet' });
    return json({ ok: false, error: 'server_error' });
  }
}

function doPost(e) {
  try {
    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (err) {
      return json({ ok: false, error: 'bad_json' });
    }

    const invalid = validate(body);
    if (invalid) {
      // Only the refusals that mean somebody lost a save; the rest is strangers poking a public URL.
      if (invalid === 'too_large') {
        report('warning', 'A save was refused: the game is too big for the sheet', {
          handler: 'doPost',
          id: String(body.id || ''),
          length: String(body.data).length
        });
      }
      return json({ ok: false, error: invalid });
    }

    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(15000);
    } catch (err) {
      report('warning', 'A save was refused: the sheet stayed locked', {
        handler: 'doPost',
        id: String(body.id)
      });
      return json({ ok: false, error: 'busy' });
    }

    try {
      const sheet = getSheet();
      const updated = new Date();
      const row = [body.id, body.ruleset, body.name, body.players, body.created, updated, body.data];
      const rowIndex = findRowIndex(sheet, body.id);
      const created = rowIndex === -1;
      if (created) sheet.appendRow(row);
      else sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([row]);
      return json({ ok: true, id: body.id, updated: updated.toISOString(), created: created });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    report('error', err, { handler: 'doPost' });
    return json({ ok: false, error: 'server_error' });
  }
}

function validate(body) {
  if (!body || typeof body !== 'object') return 'bad_body';
  if (!ID_PATTERN.test(String(body.id || ''))) return 'bad_id';
  if (!body.ruleset || !body.data) return 'missing_fields';
  if (String(body.data).length > MAX_DATA_LENGTH) return 'too_large';
  return null;
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRowIndex(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id) return i + 2;
  }
  return -1;
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : String(value || '');
}

// FNV-1a. Must stay identical to hashOf in src/services/remote/gamesSheet.js or a save that worked
// will be reported as lost.
function hashOf(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// Set SENTRY_DSN under Project Settings -> Script Properties. Unset means reporting is off, which
// is what a copy of this public repo running under someone else's account should do.
function report(level, problem, context) {
  try {
    const dsn = PropertiesService.getScriptProperties().getProperty('SENTRY_DSN') || '';
    const parts = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(.+)$/);
    if (!parts) return;

    const key = parts[1];
    const host = parts[2];
    const projectId = parts[3];
    const eventId = Utilities.getUuid().replace(/-/g, '');
    const extra = context || {};

    const event = {
      event_id: eventId,
      timestamp: new Date().toISOString(),
      platform: 'javascript',
      level: level,
      logger: 'games.gs',
      server_name: 'apps-script',
      environment: 'production',
      tags: { source: 'apps-script', handler: extra.handler || 'unknown' },
      extra: extra
    };

    if (typeof problem === 'string') {
      event.message = { formatted: problem };
    } else {
      event.exception = {
        values: [{ type: (problem && problem.name) || 'Error', value: String((problem && problem.message) || problem) }]
      };
      if (problem && problem.stack) event.extra = Object.assign({}, extra, { stack: String(problem.stack) });
    }

    // No `length` in the item header: this counts characters and Sentry counts bytes, and an
    // accented player name would make the two disagree.
    const envelope = [
      JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }),
      JSON.stringify({ type: 'event' }),
      JSON.stringify(event)
    ].join('\n');

    const response = UrlFetchApp.fetch('https://' + host + '/api/' + projectId + '/envelope/', {
      method: 'post',
      contentType: 'application/x-sentry-envelope',
      headers: {
        'X-Sentry-Auth': 'Sentry sentry_version=7, sentry_key=' + key + ', sentry_client=18komputer-appsscript/1.0'
      },
      payload: envelope,
      muteHttpExceptions: true
    });
    if (response.getResponseCode() >= 300) {
      console.error('Sentry refused the report', response.getResponseCode(), response.getContentText().slice(0, 200));
    }
  } catch (err) {
    // Never breaks a save, but must stay findable in Executions: usually a missing oauth scope.
    console.error('Could not report to Sentry', err);
  }
}
