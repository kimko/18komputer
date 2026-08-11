import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveGameToSheet, loadGameFromSheet } from './gamesSheet.js';

const ENDPOINT = 'https://script.google.com/macros/s/TEST/exec';

vi.mock('./sheetConfig.js', () => ({
  SHEET_ENDPOINT: 'https://script.google.com/macros/s/TEST/exec',
  isSheetConfigured: () => true
}));

const gameInstance = {
  id: 'game_1786043602870_246',
  gameId: '1817',
  gameName: 'Friday night',
  players: ['Kim', 'Liam'],
  createdAt: '2026-08-07T23:02:46.066Z',
  staticConfig: { maxOr: 3 },
  state: {
    activeCompanies: [
      { name: 'Arcade and Attica Railroad', shortName: 'A&A', color: '#cca978', totalShares: 5, parValue: 50 }
    ],
    dashboardState: { ors: {}, shareValues: {}, playerAssets: {} }
  }
};
const dashboardState = {
  ors: { 'A&A': { or1: 410 } },
  shareValues: { 'A&A': 440 },
  playerAssets: { Kim: { cash: 2765, shares: { 'A&A': 60 } } }
};

const answers = (payload, { status = 200 } = {}) =>
  vi.fn().mockResolvedValue({ ok: status === 200, status, json: async () => payload });

const postedBody = (fetchMock) => JSON.parse(fetchMock.mock.calls[0][1].body);

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('saveGameToSheet', () => {
  it('sends the readable columns and the packed game', async () => {
    global.fetch = answers({ ok: true, updated: '2026-08-11T19:02:00.000Z' });

    const result = await saveGameToSheet(gameInstance, dashboardState);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(options.method).toBe('POST');
    expect(postedBody(global.fetch)).toMatchObject({
      id: 'game_1786043602870_246',
      ruleset: '1817',
      name: 'Friday night',
      players: 'Kim, Liam',
      created: '2026-08-07'
    });
    expect(postedBody(global.fetch).data.length).toBeGreaterThan(0);
    expect(result.updatedAt).toBe('2026-08-11T19:02:00.000Z');
  });

  it('posts as plain text, because asking permission first would fail', async () => {
    global.fetch = answers({ ok: true });

    await saveGameToSheet(gameInstance, dashboardState);

    expect(global.fetch.mock.calls[0][1].headers['Content-Type']).toBe('text/plain;charset=utf-8');
  });

  it('refuses a game too big for a cell without asking the sheet', async () => {
    const noise = Array.from({ length: 120000 }, () => String.fromCharCode(33 + Math.floor(Math.random() * 94))).join('');
    const huge = { ...gameInstance, players: [noise] };

    await expect(saveGameToSheet(huge, dashboardState)).rejects.toThrow(/too big/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fails when the sheet turns the game away', async () => {
    global.fetch = answers({ ok: false, error: 'bad_id' });

    await expect(saveGameToSheet(gameInstance, dashboardState)).rejects.toThrow(/refused/);
  });

  it('fails when the sheet answers with an error code', async () => {
    global.fetch = answers({}, { status: 500 });

    await expect(saveGameToSheet(gameInstance, dashboardState)).rejects.toThrow(/error \(500\)/);
  });

  it('fails when the network is gone', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(saveGameToSheet(gameInstance, dashboardState)).rejects.toThrow(/Could not reach/);
  });

  it('gives up when the sheet never answers', async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const aborted = new Error('aborted');
        aborted.name = 'AbortError';
        reject(aborted);
      });
    }));

    const pending = saveGameToSheet(gameInstance, dashboardState);
    vi.advanceTimersByTime(15000);

    await expect(pending).rejects.toThrow(/took too long/);
  });
});

describe('loadGameFromSheet', () => {
  it('reads back the same game that was saved', async () => {
    global.fetch = answers({ ok: true });
    await saveGameToSheet(gameInstance, dashboardState);
    const data = postedBody(global.fetch).data;

    global.fetch = answers({ ok: true, data, updated: '2026-08-11T19:02:00.000Z' });
    const { game, updatedAt } = await loadGameFromSheet('game_1786043602870_246');

    expect(global.fetch.mock.calls[0][0]).toBe(`${ENDPOINT}?id=game_1786043602870_246`);
    expect(game.id).toBe('game_1786043602870_246');
    expect(game.gameId).toBe('1817');
    expect(game.gameName).toBe('Friday night');
    expect(game.players).toEqual(['Kim', 'Liam']);
    expect(game.state.dashboardState.playerAssets).toEqual(dashboardState.playerAssets);
    expect(game.state.dashboardState.ors).toEqual(dashboardState.ors);
    expect(game.state.dashboardState.shareValues['A&A']).toBe(440);
    expect(updatedAt).toBe('2026-08-11T19:02:00.000Z');
  });

  it('fails for a game the sheet does not have', async () => {
    global.fetch = answers({ ok: false, error: 'not_found' });

    await expect(loadGameFromSheet('game_1_2')).rejects.toThrow(/not in the sheet/);
  });

  it('fails when the cell holds something unreadable', async () => {
    global.fetch = answers({ ok: true, data: 'not-a-token' });

    await expect(loadGameFromSheet('game_1_2')).rejects.toThrow(/could not be read/);
  });
});
