import { describe, it, expect } from 'vitest';
import { getBoardOwnership, getWorthByCompany } from './boardState';
import { getPlayerNetWorth } from './dashboardMath';
import game1830 from '../data/games/1830.json';

const companies = [
  { shortName: 'PRR', name: 'Pennsylvania', parValue: 90, totalShares: 10, color: '#237333' },
  { shortName: 'NYC', name: 'New York Central', parValue: 90, totalShares: 5, color: '#000000' },
  { shortName: 'B&O', name: 'Baltimore', parValue: 90, totalShares: 10, color: '#0189d1' }
];

const dashboardState = {
  ors: { PRR: { or1: 100, or2: 200 }, NYC: { or1: 100 }, 'B&O': {} },
  shareValues: { PRR: 100, NYC: 180, 'B&O': 50 },
  sharePositions: {},
  playerAssets: {
    Kim: { cash: 500, shares: { PRR: 60, NYC: 40 } },
    Sam: { cash: 300, shares: { PRR: 40 } }
  }
};

const args = {
  dashboardState,
  staticConfig: game1830,
  maxOr: 3,
  players: ['Kim', 'Sam'],
  activeCompanies: companies
};

describe('getBoardOwnership', () => {
  const board = () => getBoardOwnership(args);

  it('sizes each company by what the whole company is worth', () => {
    const [prr] = board().filter((c) => c.shortName === 'PRR');
    expect(prr.marketCap).toBe(1000);
  });

  it('splits a company into a slice per holder', () => {
    const prr = board().find((c) => c.shortName === 'PRR');
    const kim = prr.slices.find((s) => s.holder === 'Kim');

    expect(kim.percent).toBe(60);
    expect(kim.shares).toBe(6);
    expect(kim.value).toBe(600);
  });

  // A percentage means a different number of shares depending on the company.
  it('counts a five share company by fives, not by tens', () => {
    const nyc = board().find((c) => c.shortName === 'NYC');
    const kim = nyc.slices.find((s) => s.holder === 'Kim');

    expect(nyc.marketCap).toBe(900);
    expect(kim.percent).toBe(40);
    expect(kim.shares).toBe(2);
    expect(kim.value).toBe(360);
  });

  it('gives whatever is left to the bank', () => {
    const nyc = board().find((c) => c.shortName === 'NYC');
    const bank = nyc.slices.find((s) => s.isBank);

    expect(bank.percent).toBe(60);
    expect(bank.value).toBe(540);
  });

  it('leaves out a bank slice for a company held in full', () => {
    const prr = board().find((c) => c.shortName === 'PRR');
    expect(prr.slices.some((s) => s.isBank)).toBe(false);
  });

  it('hands a company nobody bought entirely to the bank', () => {
    const bo = board().find((c) => c.shortName === 'B&O');

    expect(bo.slices).toHaveLength(1);
    expect(bo.slices[0].isBank).toBe(true);
    expect(bo.slices[0].value).toBe(bo.marketCap);
  });

  it('accounts for every penny of a company in its slices', () => {
    board().forEach((company) => {
      const total = company.slices.reduce((sum, slice) => sum + slice.value, 0);
      expect(total).toBeCloseTo(company.marketCap, 6);
    });
  });

  it('puts the biggest company first, so the picture reads by size', () => {
    const caps = board().map((company) => company.marketCap);
    expect(caps).toEqual([...caps].sort((a, b) => b - a));
  });
});

describe('getWorthByCompany', () => {
  const worth = () => getWorthByCompany(args);

  it('splits a player into their cash and a figure per company', () => {
    const kim = worth().find((row) => row.player === 'Kim');

    expect(kim.cash).toBe(500);
    // Six shares at $100, plus the $30 a share those rounds paid ($300 over ten shares).
    expect(kim.byCompany.PRR).toBe(780);
  });

  // The whole tab hangs off this number agreeing with the results table.
  it('adds up to the net worth the results table shows', () => {
    worth().forEach((row) => {
      const total = row.cash + Object.values(row.byCompany).reduce((sum, value) => sum + value, 0);

      expect(total).toBeCloseTo(row.netWorth, 6);
      expect(row.netWorth).toBeCloseTo(getPlayerNetWorth(dashboardState, companies, 3, row.player), 6);
    });
  });

  it('leaves out a company the player never held', () => {
    const sam = worth().find((row) => row.player === 'Sam');

    expect(sam.byCompany.PRR).toBeGreaterThan(0);
    expect(sam.byCompany.NYC).toBeUndefined();
  });

  it('gives a player holding nothing their cash and nothing else', () => {
    const [alex] = getWorthByCompany({
      ...args,
      players: ['Alex'],
      dashboardState: { ...dashboardState, playerAssets: { Alex: { cash: 120, shares: {} } } }
    });

    expect(alex.byCompany).toEqual({});
    expect(alex.netWorth).toBe(120);
  });

  it('orders the companies the same way for every player', () => {
    const rows = worth();
    expect(rows[0].order).toEqual(rows[1].order);
    expect(rows[0].order[0]).toBe('PRR');
  });
});
