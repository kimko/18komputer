import { describe, it, expect } from 'vitest';
import {
  getRevenueTrajectoryData,
  getCompanyYieldAndDominanceData,
  getBubbleChartData
} from './chartDataSelectors.js';

// PRR is a ten-share company at $100; NYC is a five-share company at $200.
// Both are therefore worth $1,000 in total, which keeps the market cap sums easy to read.
const companies = [
  { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#237333', totalShares: 10 },
  { shortName: 'NYC', name: 'New York Central', color: '#000000', totalShares: 5 }
];

const state = {
  shareValues: { PRR: 100, NYC: 200 },
  ors: {
    PRR: { or1: 100, or2: 200 },
    NYC: { or1: 50 }
  },
  playerAssets: {
    Alice: { cash: 250, shares: { PRR: 40, NYC: 20 } },
    Bob: { cash: 80, shares: { PRR: 10 } },
    Cara: { cash: 500, shares: {} }
  }
};
const players = ['Alice', 'Bob', 'Cara'];

describe('getRevenueTrajectoryData', () => {
  it('gives one row per operating round, in order', () => {
    expect(getRevenueTrajectoryData(state, companies, 3).map(r => r.name))
      .toEqual(['OR 1', 'OR 2', 'OR 3']);
  });

  it('carries the revenue each company earned in that round', () => {
    const [or1, or2] = getRevenueTrajectoryData(state, companies, 3);
    expect(or1).toEqual({ name: 'OR 1', PRR: 100, NYC: 50 });
    expect(or2).toEqual({ name: 'OR 2', PRR: 200 });
  });

  it('leaves a company out of a round it did not run, rather than plotting a zero', () => {
    const [, or2, or3] = getRevenueTrajectoryData(state, companies, 3);
    expect(or2.NYC).toBeUndefined();
    expect(or3).toEqual({ name: 'OR 3' });
  });

  it('returns nothing when there are no rounds to show', () => {
    expect(getRevenueTrajectoryData(state, companies, 0)).toEqual([]);
  });
});

describe('getCompanyYieldAndDominanceData', () => {
  const data = getCompanyYieldAndDominanceData(state, companies, 3);
  const byName = Object.fromEntries(data.map(d => [d.name, d]));

  it('values a company at its share price times its shares, whatever the structure', () => {
    expect(byName.PRR.marketCap).toBe(1000); // $100 x 10
    expect(byName.NYC.marketCap).toBe(1000); // $200 x 5
  });

  it('works out yield as payouts against market value', () => {
    expect(byName.PRR.yieldPct).toBe(30); // $300 of $1,000
    expect(byName.NYC.yieldPct).toBe(5);  // $50 of $1,000
  });

  it('rounds yield to a whole percentage for the axis', () => {
    const [only] = getCompanyYieldAndDominanceData(
      { shareValues: { X: 100 }, ors: { X: { or1: 333 } }, playerAssets: {} },
      [{ shortName: 'X', name: 'X', totalShares: 10 }],
      3
    );
    expect(only.yieldPct).toBe(33); // 33.3 rounded
  });

  it('carries the name and a readable text colour for the label', () => {
    expect(byName.PRR.fullName).toBe('Pennsylvania Railroad');
    expect(byName.PRR.fill).toBe('#237333');
    expect(byName.PRR.contrast).toBe('white');
  });

  it('leaves out a company that is worth nothing and has paid nothing', () => {
    const data = getCompanyYieldAndDominanceData(
      { shareValues: {}, ors: {}, playerAssets: {} },
      [{ shortName: 'Z', name: 'Zero', totalShares: 10, parValue: 0 }],
      3
    );
    expect(data).toEqual([]);
  });

  it('falls back to the par value when no share price has been set', () => {
    const [only] = getCompanyYieldAndDominanceData(
      { shareValues: {}, ors: {}, playerAssets: {} },
      [{ shortName: 'P', name: 'Par', totalShares: 10, parValue: 67 }],
      3
    );
    expect(only.marketCap).toBe(670);
  });
});

describe('getBubbleChartData', () => {
  const points = getBubbleChartData(state, companies, 3, players, false, false);
  const find = (player, company) => points.find(d => d.player === player && d.company === company);

  it('plots one bubble per holding', () => {
    expect(points).toHaveLength(3); // Alice in two companies, Bob in one
    expect(find('Alice', 'PRR')).toBeDefined();
    expect(find('Alice', 'NYC')).toBeDefined();
    expect(find('Bob', 'PRR')).toBeDefined();
  });

  it('leaves out a company a player does not hold', () => {
    expect(find('Bob', 'NYC')).toBeUndefined();
  });

  it('leaves out a player holding nothing, even with cash in hand', () => {
    expect(points.some(d => d.player === 'Cara')).toBe(false);
  });

  it('counts shares by the company structure, not by percentage', () => {
    expect(find('Alice', 'PRR').trueShares).toBe(4);  // 40% of ten shares
    expect(find('Alice', 'NYC').trueShares).toBe(1);  // 20% of five shares
  });

  it('values a holding at its share of the company and its share of the payouts', () => {
    const prr = find('Alice', 'PRR');
    expect(prr.shareValue).toBe(400);  // 40% of $1,000
    expect(prr.opIncome).toBe(120);    // 40% of $300
    expect(prr.totalValue).toBe(520);
  });

  it('never jitters a value below zero, which would flip the bubble inside out', () => {
    const tiny = getBubbleChartData(
      { shareValues: { PRR: 1 }, ors: {}, playerAssets: { Alice: { shares: { PRR: 10 } } } },
      [{ shortName: 'PRR', totalShares: 10 }],
      3, ['Alice'], false, false
    );
    expect(tiny[0].shareValue).toBeLessThan(15);
    expect(tiny[0].shareValueJitter).toBeGreaterThanOrEqual(0);
    expect(tiny[0].opIncomeJitter).toBeGreaterThanOrEqual(0);
  });

  describe('the optional cash and total bubbles', () => {
    it('adds no cash bubble unless asked', () => {
      expect(points.some(d => d.company === 'Cash')).toBe(false);
    });

    it('adds a cash bubble holding only cash, sitting at zero shares', () => {
      const withCash = getBubbleChartData(state, companies, 3, players, true, false);
      const cash = withCash.find(d => d.player === 'Alice' && d.company === 'Cash');
      expect(cash.totalValue).toBe(250);
      expect(cash.trueShares).toBe(0);
      expect(cash.shareValue).toBe(0);
      expect(cash.opIncome).toBe(0);
    });

    it('leaves out a cash bubble for a player with no cash', () => {
      const broke = { ...state, playerAssets: { ...state.playerAssets, Alice: { cash: 0, shares: { PRR: 40 } } } };
      const withCash = getBubbleChartData(broke, companies, 3, ['Alice'], true, false);
      expect(withCash.some(d => d.company === 'Cash')).toBe(false);
    });

    it('totals a player up across every company, without jitter', () => {
      const withTotal = getBubbleChartData(state, companies, 3, players, false, true);
      const total = withTotal.find(d => d.player === 'Alice' && d.company === 'Cumulative Total');
      expect(total.trueShares).toBe(5);          // 4 + 1
      expect(total.shareValue).toBe(600);        // $400 + $200
      expect(total.opIncome).toBe(130);          // $120 + $10
      expect(total.totalValue).toBe(730);
      expect(total.totalValueJitter).toBe(total.totalValue);
      expect(total.isCumulative).toBe(true);
    });

    it('counts cash into the total only when cash is being shown', () => {
      const both = getBubbleChartData(state, companies, 3, players, true, true);
      const total = both.find(d => d.player === 'Alice' && d.company === 'Cumulative Total');
      expect(total.totalValue).toBe(980); // $600 + $130 + $250 cash
    });
  });
});
