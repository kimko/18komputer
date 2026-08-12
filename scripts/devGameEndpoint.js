import LZString from 'lz-string';
import { SHEET_ENDPOINT } from '../src/services/remote/sheetConfig.js';

// Dev only: game state lives in the browser's localStorage, which nothing outside the browser can
// read. The app mirrors it here as it saves, and anything not seen yet is fetched from the sheet.
const GAME_ROUTE = /^\/__debug\/game\/([^/?]+)/;
const LIST_ROUTE = /^\/__debug\/games\b/;

let mirrored = {};

const send = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload, null, 2));
};

const readBody = (req) => new Promise((resolve) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => resolve(body));
});

// Apps Script now and then answers a redirect with an HTML page instead of the JSON, so ask again.
async function fetchFromSheet(id, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(`${SHEET_ENDPOINT}?id=${encodeURIComponent(id)}`);
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      lastError = `the sheet answered with ${response.status} and ${text.slice(0, 40).trim()}…`;
    }
  }
  throw new Error(lastError);
}

export default function devGameEndpoint() {
  return {
    name: 'dev-game-endpoint',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (LIST_ROUTE.test(req.url || '')) {
          if (req.method === 'POST') {
            try {
              mirrored = JSON.parse(await readBody(req));
            } catch {
              return send(res, 400, { error: 'could not read the games' });
            }
            return send(res, 200, { ok: true, games: Object.keys(mirrored).length });
          }
          return send(res, 200, Object.values(mirrored).map((game) => ({
            id: game.id,
            name: game.gameName,
            ruleset: game.gameId,
            players: game.players
          })));
        }

        const match = GAME_ROUTE.exec(req.url || '');
        if (!match) return next();

        const id = decodeURIComponent(match[1]);
        const raw = /[?&]raw\b/.test(req.url);

        if (mirrored[id] && !raw) return send(res, 200, { id, source: 'browser', game: mirrored[id] });

        try {
          const body = await fetchFromSheet(id);
          if (!body?.ok) {
            return send(res, 404, {
              error: body?.error === 'not_found'
                ? 'not in the sheet, and the browser has not saved it here yet — open it once in the app'
                : body?.error || 'the sheet refused the request',
              id
            });
          }
          if (raw) return send(res, 200, body);

          const game = JSON.parse(LZString.decompressFromEncodedURIComponent(body.data));
          return send(res, 200, { id: body.id, source: 'sheet', name: body.name, updated: body.updated, game });
        } catch (err) {
          return send(res, 502, { error: err.message, id });
        }
      });
    }
  };
}
