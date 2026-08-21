import { describe, it, expect } from 'vitest';
import { findStartCandidates, solveStartPrice, solveStartPrices, toStartFields } from './startPrice.js';
import { walk } from './roundReturn.js';
import { cellAt } from './stockMarket.js';
import oneEightNinetyFour from '../data/games/1894.json';

// Two rows, so a left move at the left edge drops down and a right move off the end climbs up.
const market = {
  type: '2d',
  grid: [
    ['60', '70', '80', '90'],
    ['30', '40', '50p', '60']
  ]
};

const flat = { type: '1d', grid: [['30', '40', '50', '60', '70']] };

const company = { shortName: 'PRR', parValue: 50 };
const noRules = undefined;

describe('findStartCandidates', () => {
  const find = (opts) => findStartCandidates(market, {
    priceNow: 70, rounds: [], soldOut: false, rules: noRules, ...opts
  }).map((c) => c.price);

  it('is the price itself when nothing was recorded', () => {
    expect(find({})).toEqual([70]);
  });

  it('walks one square right per paying round', () => {
    // 40 -> 50 -> 60 -> 70 on the bottom row, and 60 -> 70 needs only one.
    expect(find({ priceNow: 70, rounds: [100] }).sort((a, b) => a - b)).toEqual([60]);
  });

  it('walks left for a round recorded as zero', () => {
    expect(find({ priceNow: 70, rounds: [0] })).toEqual([80]);
  });

  // A company already on the top row has nowhere to climb, so standing still explains the finish
  // just as well as arriving from below. Both are real answers and both are reported.
  it('adds a square up for a sold out company', () => {
    expect(findStartCandidates(market, {
      priceNow: 80, rounds: [], soldOut: true, rules: noRules
    }).map((c) => c.price)).toEqual([80, 50]);
  });

  it('takes the sold out jump before the operating rounds', () => {
    // [1,1]=40 climbs to [0,1]=70, then one paying round right to [0,2]=80. From 70 the climb
    // is blocked by the top row, so the same paying round gets there too.
    expect(findStartCandidates(market, {
      priceNow: 80, rounds: [100], soldOut: true, rules: noRules
    }).map((c) => c.price)).toEqual([70, 40]);
  });

  it('finds nothing when no square explains the price', () => {
    expect(find({ priceNow: 999 })).toEqual([]);
  });

  it('works on a flat market too', () => {
    expect(findStartCandidates(flat, {
      priceNow: 60, rounds: [100, 100], soldOut: false, rules: noRules
    }).map((c) => c.price)).toEqual([40]);
  });
});

describe('solveStartPrice', () => {
  const staticConfig = { stockMarket: market };
  const players = ['Ada', 'Grace'];
  const state = (overrides = {}) => ({
    ors: {}, shareValues: {}, playerAssets: {}, ...overrides
  });

  it('reports the square and the price it settled on', () => {
    const solved = solveStartPrice(company, {
      dashboardState: state({ shareValues: { PRR: 70 }, ors: { PRR: { or1: 100 } } }),
      staticConfig,
      maxOr: 1,
      players
    });

    expect(solved).toMatchObject({ shortName: 'PRR', found: true, price: 60, position: [0, 0] });
  });

  it('marks the answer approximate when several squares would explain it', () => {
    // 60 sits on both rows, so a company now on 60 with nothing recorded has two explanations.
    const solved = solveStartPrice(company, {
      dashboardState: state({ shareValues: { PRR: 60 } }),
      staticConfig,
      maxOr: 1,
      players
    });

    expect(solved.found).toBe(true);
    expect(solved.approximate).toBe(true);
    expect(solved.price).toBe(60);
  });

  it('says so rather than inventing a number when nothing fits', () => {
    const solved = solveStartPrice(company, {
      dashboardState: state({ shareValues: { PRR: 999 } }),
      staticConfig,
      maxOr: 3,
      players
    });

    expect(solved).toEqual({ shortName: 'PRR', found: false });
  });

  it('picks the dearest of several explanations, which is the cautious one', () => {
    // 80 sits on the top row where a sold out company cannot climb, and 50 sits below it.
    const solved = solveStartPrice(company, {
      dashboardState: state({ shareValues: { PRR: 80 }, playerAssets: { Ada: { shares: { PRR: 100 } } } }),
      staticConfig,
      maxOr: 1,
      players: ['Ada']
    });

    expect(solved).toMatchObject({ found: true, price: 80, approximate: true });
  });

  it('has nothing to say about a title with no market at all', () => {
    const solved = solveStartPrice(company, {
      dashboardState: state({ shareValues: { PRR: 70 } }),
      staticConfig: {},
      maxOr: 1,
      players
    });

    expect(solved.found).toBe(false);
  });
});

// 1894 is the one title where a sold out company can climb more than a single square, so the jump
// itself is checked here rather than through the search, which would blur it with other answers.
describe('1894 sold out jumps', () => {
  const marketOf1894 = oneEightNinetyFour.stockMarket;
  const rules = oneEightNinetyFour.priceMovement;
  const priceAt = (position) => cellAt(marketOf1894.grid, position).price;

  const PLAIN = [4, 2];  // 74, no zone letter
  const GREY = [6, 1];   // 56o, in the grey zone

  const jump = (from, holdings, soldOut = true) =>
    walk(marketOf1894, from, { rounds: [], soldOut, rules, holdings });

  it('leaves a company that was not sold out where it stands', () => {
    expect(priceAt(jump(GREY, [50, 50], false).position)).toBe(56);
  });

  it('climbs one square for a plain sold out company', () => {
    const { position, steps } = jump(PLAIN, [50, 50]);
    expect(steps[0].squares).toBe(1);
    expect(priceAt(position)).toBe(81);
  });

  it('climbs two when one player holds 80 percent or more', () => {
    const { position, steps } = jump(PLAIN, [80, 20]);
    expect(steps[0].squares).toBe(2);
    expect(priceAt(position)).toBe(89);
  });

  it('climbs two from the grey zone with the holding split', () => {
    const { position, steps } = jump(GREY, [50, 50]);
    expect(steps[0].squares).toBe(2);
    expect(priceAt(position)).toBe(69);
  });

  it('climbs three from the grey zone with a dominant holder', () => {
    const { position, steps } = jump(GREY, [90, 10]);
    expect(steps[0].squares).toBe(3);
    expect(priceAt(position)).toBe(75);
  });

  it('reads the grey zone off the square it leaves, not the one it lands on', () => {
    // 64 at [5,1] is one square above the grey 56, so it gets no grey bonus of its own.
    expect(jump([5, 1], [50, 50]).steps[0].squares).toBe(1);
  });

  it('still finds the grey square among the answers when solving backwards', () => {
    const found = findStartCandidates(marketOf1894, {
      priceNow: 75,
      rounds: [null, null, null],
      soldOut: true,
      rules,
      holdings: [90, 10]
    });

    expect(found.map((c) => c.price)).toContain(56);
  });
});

describe('solveStartPrices and toStartFields', () => {
  const staticConfig = { stockMarket: market };
  const players = ['Ada'];
  const dashboardState = {
    ors: { PRR: { or1: 100 } },
    shareValues: { PRR: 70, NYC: 999 },
    playerAssets: { Ada: { shares: { PRR: 50, NYC: 50 } } },
    startValues: { OLD: 25 },
    startPositions: { OLD: [1, 1] }
  };
  const activeCompanies = [{ shortName: 'PRR' }, { shortName: 'NYC' }];

  it('answers for every company', () => {
    const solved = solveStartPrices({ dashboardState, staticConfig, maxOr: 1, players, activeCompanies });
    expect(solved.map((s) => [s.shortName, s.found])).toEqual([['PRR', true], ['NYC', false]]);
  });

  it('writes only what it worked out, leaving everything else alone', () => {
    const solved = solveStartPrices({ dashboardState, staticConfig, maxOr: 1, players, activeCompanies });
    expect(toStartFields(solved, dashboardState)).toEqual({
      startValues: { OLD: 25, PRR: 60 },
      startPositions: { OLD: [1, 1], PRR: [0, 0] }
    });
  });
});
