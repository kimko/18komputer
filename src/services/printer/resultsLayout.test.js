import { describe, it, expect } from 'vitest';
import { buildResultsReceipt } from './resultsLayout.js';

const activeCompanies = [
  { shortName: 'UR', totalShares: 5, parValue: 50 },
  { shortName: 'R', totalShares: 10, parValue: 50 }
];

const resultsData = {
  gameName: '1817 4p Aug-07',
  players: ['Kim', 'Liam'],
  activeCompanies,
  maxOr: 3,
  printedAt: new Date('2026-08-10T09:00:00Z'),
  dashboardState: {
    shareValues: { UR: 440, R: 440 },
    ors: { UR: { or1: 410, or2: 410 }, R: { or1: 680, or2: 680 } },
    playerAssets: {
      // Liam: 3 UR shares ($1,320) + 6 R shares ($2,640), income 60% of 820 + 60% of 1360
      Liam: { cash: 2765, shares: { UR: 60, R: 60 } },
      // Kim: 2 R shares ($880), income 20% of 1360
      Kim: { cash: 1923, shares: { R: 20 } }
    }
  }
};

const lines = (data = resultsData) => {
  const { header, body } = buildResultsReceipt(data);
  return [...header, ...body.map((b) => b.text)];
};

describe('buildResultsReceipt', () => {
  it('never writes past the edge of the paper', () => {
    lines().forEach((line) => expect(line.length).toBeLessThanOrEqual(32));
  });

  it('titles the slip with the game and what it is', () => {
    const { header } = buildResultsReceipt(resultsData);
    expect(header[0].trim()).toBe('1817 4P AUG-07');
    expect(header[1].trim()).toBe('FINAL RESULTS');
  });

  it('lists players richest first, numbered', () => {
    const positions = lines().filter((l) => /^\d /.test(l));
    expect(positions[0]).toContain('1 LIAM');
    expect(positions[1]).toContain('2 KIM');
  });

  it('prints the winner in bold and nobody else', () => {
    const { body } = buildResultsReceipt(resultsData);
    const bold = body.filter((b) => b.bold).map((b) => b.text);
    expect(bold).toHaveLength(1);
    expect(bold[0]).toContain('LIAM');
  });

  it('breaks each player into shares, cash, stock and income', () => {
    const all = lines().join('\n');
    expect(all).toContain('SHARES');
    expect(all).toContain('CASH');
    expect(all).toContain('STOCK');
    expect(all).toContain('INCOME');
  });

  it('counts shares by corporate structure, not by percentage', () => {
    // Liam holds 60% of a five-share company (3) and 60% of a ten-share one (6)
    const liamShares = lines().find((l) => l.includes('SHARES'));
    expect(liamShares).toContain('9');
  });

  it('puts money against the right edge', () => {
    // Liam: 3 UR shares + 6 R shares at $440 = $3,960 stock, $1,308 income, $2,765 cash
    const winner = lines().find((l) => l.startsWith('1 LIAM'));
    expect(winner.endsWith('$8,033')).toBe(true);
  });

  it('truncates a name too long for the column instead of wrapping it', () => {
    const long = {
      ...resultsData,
      players: ['Bartholomew Fotheringay-Smythe'],
      dashboardState: {
        ...resultsData.dashboardState,
        playerAssets: { 'Bartholomew Fotheringay-Smythe': { cash: 100, shares: {} } }
      }
    };
    const position = lines(long).find((l) => l.startsWith('1 '));
    expect(position.length).toBe(32);
    expect(lines(long).filter((l) => l.includes('FOTHERINGAY'))).toHaveLength(1);
  });

  it('shows a fractional share count rather than rounding to a number that is not true', () => {
    const odd = {
      ...resultsData,
      players: ['Kim'],
      activeCompanies: [{ shortName: 'B', totalShares: 5, parValue: 50 }],
      dashboardState: {
        shareValues: { B: 100 }, ors: {},
        playerAssets: { Kim: { cash: 0, shares: { B: 30 } } }
      }
    };
    expect(lines(odd).join('\n')).toContain('1.5');
  });

  it('says so plainly when nobody has anything yet', () => {
    const empty = {
      ...resultsData, players: [], activeCompanies: [],
      dashboardState: { shareValues: {}, ors: {}, playerAssets: {} }
    };
    expect(lines(empty).join('\n')).toContain('NO RESULTS YET');
  });

  it('closes with an invitation to scan and the date it was printed', () => {
    const all = lines().join('\n');
    expect(all).toContain('SCAN TO OPEN RESULTS');
    expect(all).toContain('10 AUG 2026');
  });

  it('strips accents, since the printer only speaks plain ASCII', () => {
    const accented = {
      ...resultsData, players: ['Zoë'],
      dashboardState: { ...resultsData.dashboardState, playerAssets: { 'Zoë': { cash: 5, shares: {} } } }
    };
    expect(lines(accented).join('\n')).toContain('ZOE');
  });
});
