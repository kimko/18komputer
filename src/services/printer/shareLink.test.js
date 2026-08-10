import { describe, it, expect } from 'vitest';
import LZString from 'lz-string';
import { buildShareToken, buildShareLink } from './shareLink.js';

const gameInstance = {
  id: 'inst_1',
  gameId: '1817',
  gameName: '1817 4p Aug-07',
  players: ['Liam', 'Kim'],
  staticConfig: { name: 'should not travel' },
  state: {
    activeCompanies: [{ shortName: 'UR', name: 'Union Railroad', totalShares: 5, parValue: 50 }],
    calculatorState: { UR: { trains: [{ id: 1, stops: [100, 100] }], isHalfPay: true } },
    dashboardState: { ors: {}, shareValues: {}, playerAssets: {} }
  }
};
const dashboardState = {
  ors: { UR: { or1: 410 } },
  shareValues: { UR: 440 },
  playerAssets: { Liam: { cash: 2765, shares: { UR: 60 } } }
};

const decode = (token) => JSON.parse(LZString.decompressFromEncodedURIComponent(token));

describe('buildShareToken', () => {
  it('carries the game and the freshest dashboard state', () => {
    const back = decode(buildShareToken(gameInstance, dashboardState));
    expect(back.gameName).toBe('1817 4p Aug-07');
    expect(back.state.dashboardState).toEqual(dashboardState);
  });

  it('leaves the static game config behind, since the app already has it', () => {
    expect(decode(buildShareToken(gameInstance, dashboardState)).staticConfig).toBeUndefined();
  });

  it('stamps when it was exported', () => {
    expect(decode(buildShareToken(gameInstance, dashboardState)).exportedAt).toBeTypeOf('string');
  });

  it('keeps the calculator state by default', () => {
    expect(decode(buildShareToken(gameInstance, dashboardState)).state.calculatorState).toBeDefined();
  });

  it('drops the calculator state when asked, and nothing else', () => {
    const back = decode(buildShareToken(gameInstance, dashboardState, { includeCalculator: false }));
    expect(back.state.calculatorState).toBeUndefined();
    expect(back.state.activeCompanies).toEqual(gameInstance.state.activeCompanies);
    expect(back.state.dashboardState).toEqual(dashboardState);
  });

  it('is much shorter without the calculator state', () => {
    const full = buildShareToken(gameInstance, dashboardState);
    const slim = buildShareToken(gameInstance, dashboardState, { includeCalculator: false });
    expect(slim.length).toBeLessThan(full.length);
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
