import { describe, it, expect } from 'vitest';
import LZString from 'lz-string';
import { buildShareToken, buildShareLink, readShareToken } from './shareLink.js';

const gameInstance = {
  id: 'inst_1',
  gameId: '1817',
  gameName: '1817 4p Aug-07',
  players: ['Liam', 'Kim'],
  createdAt: '2026-08-07T23:02:46.066Z',
  staticConfig: { name: 'should not travel', maxOr: 3 },
  state: {
    activeCompanies: [
      { name: 'Arcade and Attica Railroad', shortName: 'A&A', color: '#cca978', totalShares: 5, parValue: 50 }
    ],
    calculatorState: { 'A&A': { trains: [{ id: 1, stops: [100, 100] }], isHalfPay: true } },
    dashboardState: { ors: {}, shareValues: {}, playerAssets: {} }
  }
};
const dashboardState = {
  ors: { 'A&A': { or1: 410 } },
  shareValues: { 'A&A': 440 },
  playerAssets: { Liam: { cash: 2765, shares: { 'A&A': 60 } } }
};

const decode = (token) => JSON.parse(LZString.decompressFromEncodedURIComponent(token));
const roundTrip = (game = gameInstance, dash = dashboardState, opts) =>
  readShareToken(buildShareToken(game, dash, opts));

describe('buildShareToken', () => {
  it('carries the game and the freshest dashboard state', async () => {
    const back = await roundTrip();
    expect(back.gameName).toBe('1817 4p Aug-07');
    expect(back.state.dashboardState.ors).toEqual(dashboardState.ors);
    expect(back.state.dashboardState.playerAssets).toEqual(dashboardState.playerAssets);
  });

  it('leaves the static game config behind, since the app already has it', async () => {
    expect((await roundTrip()).staticConfig).toBeUndefined();
  });

  it('keeps the calculator state by default', async () => {
    expect((await roundTrip()).state.calculatorState).toBeDefined();
  });

  it('drops the calculator state when asked', async () => {
    const back = await roundTrip(gameInstance, dashboardState, { includeCalculator: false });
    expect(back.state.calculatorState).toBeUndefined();
  });

  it('is much shorter without the calculator state', () => {
    const full = buildShareToken(gameInstance, dashboardState);
    const slim = buildShareToken(gameInstance, dashboardState, { includeCalculator: false });
    expect(slim.length).toBeLessThan(full.length);
  });

  it('does not send the company name and colour, which the app already has', () => {
    const wire = decode(buildShareToken(gameInstance, dashboardState));
    expect(wire.state.activeCompanies[0].name).toBeUndefined();
    expect(wire.state.activeCompanies[0].color).toBeUndefined();
    expect(wire.state.activeCompanies[0].shortName).toBe('A&A');
  });

  it('puts the company name and colour back when the link is opened', async () => {
    const company = (await roundTrip()).state.activeCompanies[0];
    expect(company.name).toBe('Arcade and Attica Railroad');
    expect(company.color).toBe('#cca978');
    expect(company.parValue).toBe(50);
    expect(company.totalShares).toBe(5);
  });

  it('does not send an export timestamp nothing reads', () => {
    expect(decode(buildShareToken(gameInstance, dashboardState)).exportedAt).toBeUndefined();
  });

  it('does not send the two dead fields left over from creating a game', () => {
    const withDead = { ...gameInstance, state: { ...gameInstance.state, playerAssets: {}, companyORs: [] } };
    const wire = decode(buildShareToken(withDead, dashboardState));
    expect(wire.state.playerAssets).toBeUndefined();
    expect(wire.state.companyORs).toBeUndefined();
  });

  it('keeps a title the player typed themselves', async () => {
    const renamed = { ...gameInstance, gameName: '1862 hot in the basement' };
    expect((await roundTrip(renamed)).gameName).toBe('1862 hot in the basement');
  });

  it('rebuilds an automatic title rather than sending it', async () => {
    const auto = { ...gameInstance, gameId: '1817', players: ['Liam', 'Kim'], gameName: '1817 2p Aug-07' };
    expect(decode(buildShareToken(auto, dashboardState)).gameName).toBeUndefined();
    expect((await roundTrip(auto)).gameName).toBe('1817 2p Aug-07');
  });

  it('leaves out values that are zero or blank, which read back as zero anyway', async () => {
    const sparse = {
      ors: { 'A&A': { or1: 410, or2: 0, or3: '' } },
      shareValues: { 'A&A': 440 },
      playerAssets: { Liam: { cash: 0, shares: { 'A&A': 60, 'B&A': 0 } } }
    };
    const wire = decode(buildShareToken(gameInstance, sparse));
    expect(wire.state.dashboardState.ors['A&A']).toEqual({ or1: 410 });
    expect(wire.state.dashboardState.playerAssets.Liam.shares).toEqual({ 'A&A': 60 });
    expect(wire.state.dashboardState.playerAssets.Liam.cash).toBeUndefined();
    expect((await roundTrip(gameInstance, sparse)).state.dashboardState.playerAssets.Liam).toBeDefined();
  });

  it('leaves out a share price that is just the par value, and puts it back', async () => {
    const atPar = { ...dashboardState, shareValues: { 'A&A': 50 } };
    expect(decode(buildShareToken(gameInstance, atPar)).state.dashboardState.shareValues['A&A'])
      .toBeUndefined();
    expect((await roundTrip(gameInstance, atPar)).state.dashboardState.shareValues['A&A']).toBe(50);
  });

  it('keeps numbers and text-that-looks-like-numbers apart', async () => {
    const mixed = {
      ors: { 'A&A': { or1: '380', or2: 380 } },
      shareValues: { 'A&A': 440 },
      playerAssets: { Liam: { cash: '1923', shares: { 'A&A': 60 } } }
    };
    const back = (await roundTrip(gameInstance, mixed)).state.dashboardState;
    expect(back.ors['A&A'].or1).toBe('380');
    expect(back.ors['A&A'].or2).toBe(380);
    expect(back.playerAssets.Liam.cash).toBe('1923');
  });
});

describe('readShareToken', () => {
  it('still opens a link made before the format changed', async () => {
    const legacy = LZString.compressToEncodedURIComponent(JSON.stringify({
      id: 'old_1',
      gameId: '1817',
      gameName: '1817 4p Aug-07',
      players: ['Liam'],
      exportedAt: '2026-08-07T00:00:00.000Z',
      state: {
        activeCompanies: [{ name: 'Arcade and Attica Railroad', shortName: 'A&A', color: '#cca978' }],
        dashboardState: { ors: {}, shareValues: {}, playerAssets: { Liam: { cash: 10, shares: {} } } }
      }
    }));

    const back = await readShareToken(legacy);
    expect(back.id).toBe('old_1');
    expect(back.state.activeCompanies[0].name).toBe('Arcade and Attica Railroad');
    expect(back.state.dashboardState.playerAssets.Liam.cash).toBe(10);
  });

  it('gives nothing back for a token that is not a token', async () => {
    expect(await readShareToken('not-a-real-token')).toBeNull();
    expect(await readShareToken('')).toBeNull();
  });

  it('opens a game whose type has no stored definition, without losing the rest', async () => {
    const unknown = { ...gameInstance, gameId: 'not_a_real_game' };
    const back = await roundTrip(unknown);
    expect(back.state.activeCompanies[0].shortName).toBe('A&A');
    expect(back.players).toEqual(['Liam', 'Kim']);
  });
});

describe('buildShareLink', () => {
  it('keeps the repo path segment on GitHub Pages', () => {
    expect(buildShareLink('https://kimko.github.io', '/18komputer/game/inst_1/dashboard', 'TOKEN'))
      .toBe('https://kimko.github.io/18komputer/resume#import=TOKEN');
  });

  it('uses the site root when the app is served from it', () => {
    expect(buildShareLink('http://localhost:5173', '/game/inst_1/dashboard', 'TOKEN'))
      .toBe('http://localhost:5173/resume#import=TOKEN');
  });
});
