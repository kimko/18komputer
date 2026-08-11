import { buildShareToken, readShareToken } from '../printer/shareLink.js';
import { SHEET_ENDPOINT, isSheetConfigured } from './sheetConfig.js';
import { matchesSaved, rememberSaved, hasSavedGame } from './savedGames.js';

const MAX_DATA_LENGTH = 45000;
const TIMEOUT_MS = 15000;

const MESSAGES = {
  too_large: 'This game is too big to save to the sheet.',
  not_found: 'That game is not in the sheet.',
  busy: 'The sheet was busy. Try again in a moment.'
};

const NOT_SET_UP = 'The Google Sheet is not set up yet. See google-apps-script/README.md.';

// The request is attempted rather than refused up front, so a test can stand in for the sheet.
// A placeholder endpoint only shows up as a failure to connect, which is what NOT_SET_UP explains.
async function call(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (!isSheetConfigured()) throw new Error(NOT_SET_UP);
    if (err.name === 'AbortError') throw new Error('The sheet took too long to answer.');
    throw new Error('Could not reach the sheet. Check your connection.');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (!isSheetConfigured()) throw new Error(NOT_SET_UP);
    throw new Error(`The sheet answered with an error (${response.status}).`);
  }

  const body = await response.json().catch(() => null);
  if (!body?.ok) throw new Error(MESSAGES[body?.error] || 'The sheet refused the request.');
  return body;
}

export async function saveGameToSheet(gameInstance, dashboardState) {
  const data = buildShareToken(gameInstance, dashboardState);
  if (data.length > MAX_DATA_LENGTH) throw new Error(MESSAGES.too_large);

  if (matchesSaved(gameInstance.id, data)) return { outcome: 'unchanged', updatedAt: null };

  // Older deployments of the script do not say which they did, so fall back to what we know.
  const seenBefore = hasSavedGame(gameInstance.id);

  const body = await call(SHEET_ENDPOINT, {
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
  });

  rememberSaved(gameInstance.id, data);
  const created = body.created === undefined ? !seenBefore : Boolean(body.created);
  return { outcome: created ? 'created' : 'updated', updatedAt: body.updated };
}

export async function loadGameFromSheet(gameId) {
  const body = await call(`${SHEET_ENDPOINT}?id=${encodeURIComponent(gameId)}`);
  const game = await readShareToken(body.data);
  if (!game) throw new Error('The game in the sheet could not be read.');

  // What just came out of the sheet is by definition what is in the sheet.
  rememberSaved(gameId, body.data);
  return { game, updatedAt: body.updated };
}
