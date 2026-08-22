import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveGameToSheet, loadGameFromSheet, TIMEOUT_MS } from './gamesSheet.js';
import { reportProblem } from '../monitoring/monitoring.js';

const ENDPOINT = 'https://script.google.com/macros/s/TEST/exec';

vi.mock('./sheetConfig.js', () => ({
  SHEET_ENDPOINT: 'https://script.google.com/macros/s/TEST/exec',
  isSheetConfigured: () => true
}));

vi.mock('../monitoring/monitoring.js', () => ({
  reportProblem: vi.fn()
}));

// Kept real; spread only so a single test can stand in for readShareToken.
vi.mock('../printer/shareLink.js', async (importOriginal) => ({ ...(await importOriginal()) }));
import * as shareLink from '../printer/shareLink.js';

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

const stalls = (signal) => new Promise((_resolve, reject) => {
  signal.addEventListener('abort', () => {
    const aborted = new Error('aborted');
    aborted.name = 'AbortError';
    reject(aborted);
  });
});

const sheetHolds = (data, updated) => Promise.resolve({
  ok: true,
  status: 200,
  json: async () => ({ ok: true, data, updated })
});

// Written out longhand on purpose: if this and hashOf in games.gs ever disagree, the tests should
// notice rather than agree with a shared mistake.
const fnv1a = (text) => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  }
  return (hash >>> 0).toString(16);
};

beforeEach(() => {
  localStorage.clear();
  global.fetch = vi.fn();
  reportProblem.mockReset();
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

  it('reports whether the sheet added a row or overwrote one', async () => {
    global.fetch = answers({ ok: true, created: true });
    expect((await saveGameToSheet(gameInstance, dashboardState)).outcome).toBe('created');

    localStorage.clear();
    global.fetch = answers({ ok: true, created: false });
    expect((await saveGameToSheet(gameInstance, dashboardState)).outcome).toBe('updated');
  });

  it('guesses from what it has seen when the sheet does not say', async () => {
    global.fetch = answers({ ok: true });
    expect((await saveGameToSheet(gameInstance, dashboardState)).outcome).toBe('created');

    const changed = { ...dashboardState, shareValues: { 'A&A': 500 } };
    global.fetch = answers({ ok: true });
    expect((await saveGameToSheet(gameInstance, changed)).outcome).toBe('updated');
  });

  it('posts as plain text, because asking permission first would fail', async () => {
    global.fetch = answers({ ok: true });

    await saveGameToSheet(gameInstance, dashboardState);

    expect(global.fetch.mock.calls[0][1].headers['Content-Type']).toBe('text/plain;charset=utf-8');
  });

  it('does not ask the sheet again when nothing about the game changed', async () => {
    global.fetch = answers({ ok: true, created: true });
    await saveGameToSheet(gameInstance, dashboardState);

    global.fetch = answers({ ok: true });
    const result = await saveGameToSheet(gameInstance, dashboardState);

    expect(result).toEqual({ outcome: 'unchanged', updatedAt: null });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('asks the sheet again once a value changes', async () => {
    global.fetch = answers({ ok: true, created: true });
    await saveGameToSheet(gameInstance, dashboardState);

    global.fetch = answers({ ok: true, created: false });
    const moved = { ...dashboardState, ors: { 'A&A': { or1: 420 } } };
    const result = await saveGameToSheet(gameInstance, moved);

    expect(result.outcome).toBe('updated');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('remembers nothing after a failure, so the next attempt still tries', async () => {
    global.fetch = answers({ ok: false, error: 'busy' });
    await expect(saveGameToSheet(gameInstance, dashboardState)).rejects.toThrow();

    global.fetch = answers({ ok: true, created: true });
    const result = await saveGameToSheet(gameInstance, dashboardState);

    expect(result.outcome).toBe('created');
    expect(global.fetch).toHaveBeenCalledTimes(1);
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

  it('gives up when the sheet never answers, and cannot confirm the game landed', async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn((_url, options) => stalls(options.signal));

    const pending = saveGameToSheet(gameInstance, dashboardState);
    const rejects = expect(pending).rejects.toThrow(/took too long/);
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);

    await rejects;
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('confirms a stalled save from a hash, without pulling the whole game back', async () => {
    vi.useFakeTimers();
    let sent;
    global.fetch = vi.fn((url, options) => {
      if (options.method !== 'POST') {
        expect(url).toContain('hash=1');
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ok: true, hash: fnv1a(sent), length: sent.length, updated: 'then' })
        });
      }
      sent = JSON.parse(options.body).data;
      return stalls(options.signal);
    });

    const pending = saveGameToSheet(gameInstance, dashboardState);
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);

    await expect(pending).resolves.toMatchObject({ outcome: 'created', updatedAt: 'then' });
  });

  it('does not accept a hash that belongs to a different game', async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn((_url, options) => (
      options.method === 'POST'
        ? stalls(options.signal)
        : Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ok: true, hash: fnv1a('a different game'), length: 16, updated: 'then' })
        })
    ));

    const pending = saveGameToSheet(gameInstance, dashboardState);
    const rejects = expect(pending).rejects.toThrow(/took too long/);
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);

    await rejects;
  });

  it('falls back to the whole game for deployments that predate the hash flag', async () => {
    vi.useFakeTimers();
    let sent;
    global.fetch = vi.fn((_url, options) => {
      if (options.method !== 'POST') return sheetHolds(sent, '2026-08-13T21:19:29.597Z');
      sent = JSON.parse(options.body).data;
      return stalls(options.signal);
    });

    const pending = saveGameToSheet(gameInstance, dashboardState);
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);

    await expect(pending).resolves.toMatchObject({
      outcome: 'created',
      updatedAt: '2026-08-13T21:19:29.597Z'
    });
  });

  it('still fails when the sheet holds a different game than the one just sent', async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn((_url, options) => (
      options.method === 'POST' ? stalls(options.signal) : sheetHolds('an older version', 'whenever')
    ));

    const pending = saveGameToSheet(gameInstance, dashboardState);
    const rejects = expect(pending).rejects.toThrow(/took too long/);
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);

    await rejects;
  });

  it('does not go looking when the sheet gave a clear answer', async () => {
    global.fetch = answers({ ok: false, error: 'bad_id' });

    await expect(saveGameToSheet(gameInstance, dashboardState)).rejects.toThrow(/refused/);
    expect(global.fetch).toHaveBeenCalledTimes(1);
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

  it('counts a freshly fetched game as already saved', async () => {
    global.fetch = answers({ ok: true });
    await saveGameToSheet(gameInstance, dashboardState);
    const data = postedBody(global.fetch).data;
    localStorage.clear();

    global.fetch = answers({ ok: true, data, updated: '2026-08-11T19:02:00.000Z' });
    await loadGameFromSheet('game_1786043602870_246');

    global.fetch = answers({ ok: true });
    const result = await saveGameToSheet(gameInstance, dashboardState);

    expect(result.outcome).toBe('unchanged');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('gives up when the answer arrives but its body never does', async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => new Promise(() => {})
    });

    const pending = loadGameFromSheet('game_1_2');
    const rejects = expect(pending).rejects.toThrow(/took too long/);
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);

    await rejects;
    expect(reportProblem).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ stage: 'reading the answer', cause: 'stalled' })
    );
  });

  it('gives up when unpacking the game stalls on the ruleset it needs', async () => {
    vi.useFakeTimers();
    global.fetch = answers({ ok: true, data: 'a-token', updated: 'then' });
    vi.spyOn(shareLink, 'readShareToken').mockReturnValue(new Promise(() => {}));

    const pending = loadGameFromSheet('game_1_2');
    const rejects = expect(pending).rejects.toThrow(/took too long/);
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);

    await rejects;
    expect(reportProblem).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ stage: 'unpacking the shared game', cause: 'stalled' })
    );
    vi.mocked(shareLink.readShareToken).mockRestore();
  });

  // Otherwise a load that stalls in two places would keep them waiting for twice the timeout.
  it('spends one timeout on the whole load, not one per stage', async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve({ ok: true, status: 200, json: () => new Promise(() => {}) }), 20000);
    }));

    const pending = loadGameFromSheet('game_1_2');
    const rejects = expect(pending).rejects.toThrow(/took too long/);

    // 20s reaching the answer leaves 10s for the body, so the whole thing is over at 30s.
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
    await rejects;
  });

  it('fails for a game the sheet does not have', async () => {
    global.fetch = answers({ ok: false, error: 'not_found' });

    await expect(loadGameFromSheet('game_1_2')).rejects.toThrow(/not in the sheet/);
    expect(reportProblem).not.toHaveBeenCalled();
  });

  it('fails when the cell holds something unreadable', async () => {
    global.fetch = answers({ ok: true, data: 'not-a-token' });

    await expect(loadGameFromSheet('game_1_2')).rejects.toThrow(/could not be read/);
    expect(reportProblem).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ stage: 'loading shared game', id: 'game_1_2', code: 'invalid_data' })
    );
  });
});
