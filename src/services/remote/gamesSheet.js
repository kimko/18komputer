import { buildShareToken, readShareToken } from '../printer/shareLink.js';
import { SHEET_ENDPOINT, isSheetConfigured } from './sheetConfig.js';
import { matchesSaved, rememberSaved, hasSavedGame } from './savedGames.js';
import { reportProblem } from '../monitoring/monitoring.js';

const MAX_DATA_LENGTH = 45000;
const TIMEOUT_MS = 15000;

const MESSAGES = {
  too_large: 'This game is too big to save to the sheet.',
  not_found: 'That game is not in the sheet.',
  busy: 'The sheet was busy. Try again in a moment.',
  server_error: 'The sheet hit a problem at its end. It has been reported.'
};

const NOT_SET_UP = 'The Google Sheet is not set up yet. See google-apps-script/README.md.';

// The request is attempted rather than refused up front, so a test can stand in for the sheet.
// A placeholder endpoint only shows up as a failure to connect, which is what NOT_SET_UP explains.
async function call(url, options = {}, { silent = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (!isSheetConfigured()) throw new Error(NOT_SET_UP);
    const problem = err.name === 'AbortError'
      ? new Error('The sheet took too long to answer.')
      : new Error('Could not reach the sheet. Check your connection.');
    // Nothing came back either way, so a write may still have happened.
    problem.unanswered = true;
    if (!silent) reportProblem(problem, { stage: 'reaching the sheet', cause: err.name });
    throw problem;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (!isSheetConfigured()) throw new Error(NOT_SET_UP);
    const problem = new Error(`The sheet answered with an error (${response.status}).`);
    if (!silent) reportProblem(problem, { stage: 'answer', status: response.status });
    throw problem;
  }

  // An unreadable body is the script returning its HTML error page, which usually means the
  // deployment was never republished after an edit.
  const body = await response.json().catch(() => null);
  if (!body?.ok) {
    const problem = new Error(MESSAGES[body?.error] || 'The sheet refused the request.');
    // Asking for a game that is not in the sheet is a normal thing to do, not a fault.
    if (!silent && body?.error !== 'not_found') {
      reportProblem(problem, { stage: 'refused', code: body?.error ?? 'unreadable answer' });
    }
    throw problem;
  }
  return body;
}

// FNV-1a. Must stay identical to hashOf in google-apps-script/games.gs or a save that worked will
// be reported as lost.
function hashOf(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

// The script answers through a redirect that sometimes stalls long after the row was written, so
// a save that never came back is not proof the game failed to land.
async function landedAnyway(gameId, data) {
  try {
    const body = await call(`${SHEET_ENDPOINT}?id=${encodeURIComponent(gameId)}&hash=1`, {}, { silent: true });
    // Deployments older than the hash flag answer with the whole game instead.
    const matches = body.hash === undefined
      ? body.data === data
      : body.hash === hashOf(data) && body.length === data.length;
    return matches ? body : null;
  } catch {
    return null;
  }
}

export async function saveGameToSheet(gameInstance, dashboardState) {
  const data = buildShareToken(gameInstance, dashboardState);
  if (data.length > MAX_DATA_LENGTH) {
    const problem = new Error(MESSAGES.too_large);
    reportProblem(problem, { level: 'warning', stage: 'size', id: gameInstance.id, length: data.length });
    throw problem;
  }

  if (matchesSaved(gameInstance.id, data)) return { outcome: 'unchanged', updatedAt: null };

  // Older deployments of the script do not say which they did, so fall back to what we know.
  const seenBefore = hasSavedGame(gameInstance.id);

  let body;
  try {
    body = await call(SHEET_ENDPOINT, {
      method: 'POST',
      // Not application/json: that makes the browser ask permission first, which Apps Script ignores.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        id: gameInstance.id,
        ruleset: gameInstance.gameId,
        name: gameInstance.gameName || '',
        players: (gameInstance.players || []).join(', '),
        created: gameInstance.createdAt ? new Date(gameInstance.createdAt).toISOString().slice(0, 10) : '',
        data
      })
    }, { silent: true });
  } catch (err) {
    const landed = err.unanswered ? await landedAnyway(gameInstance.id, data) : null;
    if (!landed) {
      reportProblem(err, { stage: 'saving', id: gameInstance.id, answered: err.unanswered ? 'no' : 'yes' });
      throw err;
    }
    rememberSaved(gameInstance.id, data);
    return { outcome: seenBefore ? 'updated' : 'created', updatedAt: landed.updated };
  }

  rememberSaved(gameInstance.id, data);
  const created = body.created === undefined ? !seenBefore : Boolean(body.created);
  return { outcome: created ? 'created' : 'updated', updatedAt: body.updated };
}

export async function loadGameFromSheet(gameId) {
  const body = await call(`${SHEET_ENDPOINT}?id=${encodeURIComponent(gameId)}`);
  const game = await readShareToken(body.data);
  if (!game) {
    const problem = new Error('The game in the sheet could not be read.');
    reportProblem(problem, { stage: 'loading shared game', id: gameId, code: 'invalid_data' });
    throw problem;
  }

  // What just came out of the sheet is by definition what is in the sheet.
  rememberSaved(gameId, body.data);
  return { game, updatedAt: body.updated };
}
