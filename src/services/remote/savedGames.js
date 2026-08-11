const STORAGE_KEY = 'sheet.savedGames';

// FNV-1a. Paired with the length below, so two tokens have to collide on both to be confused.
function hash(text) {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return (value >>> 0).toString(16);
}

const fingerprint = (token) => `${token.length}:${hash(token)}`;

function read() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored && typeof stored === 'object' ? stored : {};
  } catch {
    return {};
  }
}

function write(record) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch (err) {
    console.error('Could not remember what was saved to the sheet:', err);
  }
}

export const hasSavedGame = (gameId) => Boolean(read()[gameId]);

export const matchesSaved = (gameId, token) => read()[gameId] === fingerprint(token);

export function rememberSaved(gameId, token) {
  write({ ...read(), [gameId]: fingerprint(token) });
}

export function forgetSaved(gameId) {
  const record = read();
  delete record[gameId];
  write(record);
}

export function forgetAllSaved() {
  write({});
}
