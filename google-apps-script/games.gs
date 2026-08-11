const SHEET_NAME = 'games';
const HEADERS = ['game_id', 'ruleset', 'name', 'players', 'created', 'updated', 'data'];

// A Google Sheets cell holds 50000 characters, so an oversized game is refused rather than truncated.
const MAX_DATA_LENGTH = 45000;
// Loose enough for the extra segment that historical CSV imports add to an id.
const ID_PATTERN = /^game_[A-Za-z0-9_-]{1,60}$/;

function doGet(e) {
  const id = (e && e.parameter && e.parameter.id) || '';
  if (!ID_PATTERN.test(id)) return json({ ok: false, error: 'bad_id' });

  const sheet = getSheet();
  const rowIndex = findRowIndex(sheet, id);
  if (rowIndex === -1) return json({ ok: false, error: 'not_found' });

  const row = sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0];
  return json({
    ok: true,
    id: row[0],
    name: row[2],
    players: row[3],
    updated: toIso(row[5]),
    data: row[6]
  });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'bad_json' });
  }

  const invalid = validate(body);
  if (invalid) return json({ ok: false, error: invalid });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (err) {
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

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
