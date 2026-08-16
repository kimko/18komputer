import { describe, it, expect } from 'vitest';
import {
  marketFor, readRounds, walk,
  getCompanyReturn, getPlayerReturns, describeCompany, describePlayer
} from './roundReturn';
import { getPlayerNetWorth } from './dashboardMath';
import game1830 from '../data/games/1830.json';

const market = game1830.stockMarket;
const rules = game1830.priceMovement;

// 1830 row 1 runs 53 60 66 70 76 82 90p 100 112 126, so [1,6] is the 90 par square.
const PAR_90 = [1, 6];

const context = (rounds, soldOut = false) => ({ rounds, soldOut, rules });

describe('marketFor', () => {
  it('uses the title grid when it has one', () => {
    expect(marketFor(game1830).type).toBe('2d');
  });

  it('falls back to the flat price list for a title with no grid', () => {
    const flat = marketFor({ sharePrices: [50, 60, 70] });
    expect(flat).toEqual({ type: '1d', grid: [['50', '60', '70']] });
  });

  it('has nothing to offer a title with neither', () => {
    expect(marketFor({})).toBeNull();
  });
});

describe('readRounds', () => {
  const ors = { PRR: { or1: 100, or2: 0, or3: '' } };

  it('tells a withheld round from one nobody played', () => {
    expect(readRounds({ ors }, 3, 'PRR')).toEqual([100, 0, null]);
  });

  it('reads a value typed on the numpad, which arrives as text', () => {
    expect(readRounds({ ors: { PRR: { or1: '380' } } }, 1, 'PRR')).toEqual([380]);
  });

  it('has nothing for a company with no rounds at all', () => {
    expect(readRounds({ ors: {} }, 2, 'PRR')).toEqual([null, null]);
  });
});

describe('walk', () => {
  it('moves right once for each round that paid', () => {
    const { position, steps } = walk(market, PAR_90, context([100, 200, 300]));
    expect(position).toEqual([1, 9]);
    expect(steps.map((step) => step.move)).toEqual(['right', 'right', 'right']);
  });

  it('moves left for a round that withheld', () => {
    expect(walk(market, PAR_90, context([100, 0, 100])).position).toEqual([1, 7]);
  });

  it('ignores a round nobody played', () => {
    expect(walk(market, PAR_90, context([100, null, null])).position).toEqual([1, 7]);
  });

  it('takes the sold out move before the operating rounds', () => {
    const { position, steps } = walk(market, PAR_90, context([100], true));
    expect(steps[0]).toMatchObject({ reason: 'soldOut', move: 'up' });
    expect(position).toEqual([0, 7]);
  });

  it('earns a square per whole multiple of the price, up to the title cap', () => {
    const generous = {
      ...rules,
      dividendPaid: { move: 'right', squares: 'perMultipleOfPrice', maxSquares: 3 }
    };
    // The 90 square pays 3 times over, so three squares right: 100, 112, 126.
    const { position } = walk(market, PAR_90, { rounds: [280], soldOut: false, rules: generous });
    expect(position).toEqual([1, 9]);
  });

  it('holds still when a payout is too small to earn a square', () => {
    const generous = {
      ...rules,
      dividendPaid: { move: 'right', squares: 'perMultipleOfPrice', maxSquares: 3 }
    };
    const { position } = walk(market, PAR_90, { rounds: [40], soldOut: false, rules: generous });
    expect(position).toEqual(PAR_90);
  });
});

describe('getCompanyReturn', () => {
  const company = { shortName: 'PRR', name: 'Pennsylvania', parValue: 90, totalShares: 10 };
  const state = (over = {}) => ({
    ors: { PRR: { or1: 100, or2: 200, or3: 300 } },
    shareValues: { PRR: 126 },
    sharePositions: { PRR: [1, 9] },
    startValues: { PRR: 90 },
    startPositions: { PRR: PAR_90 },
    playerAssets: { Kim: { cash: 0, shares: { PRR: 60 } } },
    ...over
  });
  const args = ({ dashboardState, ...rest } = {}) => ({
    dashboardState: state(dashboardState),
    staticConfig: game1830,
    maxOr: 3,
    players: ['Kim'],
    ...rest
  });

  it('splits what a share earned into income and price', () => {
    const result = getCompanyReturn(company, args());

    expect(result.orIncomePerShare).toBe(60);
    expect(result.start.price).toBe(90);
    expect(result.stockReturnPerShare).toBe(36);
    expect(result.totalReturnPerShare).toBe(96);
  });

  // The rounds no longer have a say in where the price started; only the recorded value does.
  it('takes the recorded start even where the rounds could never have produced it', () => {
    const result = getCompanyReturn(company, args({
      dashboardState: { startValues: { PRR: 76 }, startPositions: { PRR: [1, 4] } }
    }));

    expect(result.start.price).toBe(76);
    expect(result.stockReturnPerShare).toBe(50);
  });

  it('walks the recorded rounds from the recorded square to describe the moves', () => {
    expect(getCompanyReturn(company, args()).steps.map((step) => step.move))
      .toEqual(['right', 'right', 'right']);
  });

  it('takes the sold out move before the rounds', () => {
    const result = getCompanyReturn(company, args({
      dashboardState: { playerAssets: { Kim: { cash: 0, shares: { PRR: 100 } } } }
    }));

    expect(result.soldOut).toBe(true);
    expect(result.steps[0]).toMatchObject({ reason: 'soldOut', move: 'up' });
  });

  it('has no price half at all when no start was recorded', () => {
    const result = getCompanyReturn(company, args({
      dashboardState: { startValues: {}, startPositions: {} }
    }));

    expect(result.start.price).toBeNull();
    expect(result.stockReturnPerShare).toBeNull();
    expect(result.totalReturnPerShare).toBeNull();
    expect(result.returnOnStart).toBeNull();
    expect(result.orIncomePerShare).toBe(60);
  });

  it('finds the square from the price when only the price was recorded', () => {
    const result = getCompanyReturn(company, args({
      dashboardState: { startPositions: {} }
    }));

    expect(result.start.position).toEqual(PAR_90);
    expect(result.steps.map((step) => step.move)).toEqual(['right', 'right', 'right']);
  });

  it('measures the return against the recorded start', () => {
    expect(getCompanyReturn(company, args()).returnOnStart).toBeCloseTo(96 / 90);
  });

  it('works from the flat price list when a title has no grid', () => {
    const flatTitle = { sharePrices: [80, 90, 100, 112], priceMovement: rules };
    const result = getCompanyReturn(company, args({
      staticConfig: flatTitle,
      dashboardState: {
        ors: { PRR: { or1: 100 } },
        shareValues: { PRR: 100 },
        sharePositions: {},
        startValues: { PRR: 90 },
        startPositions: {}
      }
    }));

    expect(result.start.price).toBe(90);
    expect(result.stockReturnPerShare).toBe(10);
  });
});

describe('getPlayerReturns', () => {
  const companies = [
    { shortName: 'PRR', name: 'Pennsylvania', parValue: 90, totalShares: 10, color: '#237333' },
    { shortName: 'NYC', name: 'New York Central', parValue: 90, totalShares: 10, color: '#000000' }
  ];
  const dashboardState = {
    ors: { PRR: { or1: 100, or2: 200, or3: 300 }, NYC: { or1: 100 } },
    shareValues: { PRR: 126, NYC: 100 },
    sharePositions: { PRR: [1, 9], NYC: [1, 7] },
    startValues: { PRR: 90, NYC: 90 },
    startPositions: { PRR: PAR_90, NYC: PAR_90 },
    // 90% of PRR is held, so it is not sold out and earns no upward move.
    playerAssets: { Kim: { cash: 500, shares: { PRR: 60, NYC: 20 } }, Sam: { cash: 200, shares: { PRR: 30 } } }
  };

  it('turns each holding into money earned and money gained', () => {
    const [kim] = getPlayerReturns({
      dashboardState, staticConfig: game1830, maxOr: 3, players: ['Kim', 'Sam'], activeCompanies: companies
    });

    // Six PRR shares at $60 a share, plus two NYC shares at $10 a share.
    expect(kim.player).toBe('Kim');
    expect(kim.incomeReturn).toBe(380);
    // Six PRR shares gaining $36, plus two NYC shares gaining $10.
    expect(kim.stockReturn).toBe(236);
    expect(kim.totalReturn).toBe(616);
  });

  // The recorded cash predates these rounds, so their dividends are never a part of it.
  it('leaves the recorded cash alone rather than reading the dividends into it', () => {
    const [kim] = getPlayerReturns({
      dashboardState, staticConfig: game1830, maxOr: 3, players: ['Kim', 'Sam'], activeCompanies: companies
    });

    expect(kim.cash).toBe(500);
    expect(kim.incomeReturn).toBe(380);
    expect(kim.netWorth).toBe(kim.cash + kim.shareValue + kim.incomeReturn);
  });
});

describe('describeCompany', () => {
  const company = { shortName: 'PRR', name: 'Pennsylvania', parValue: 90, totalShares: 10 };
  const build = (dashboardState) => getCompanyReturn(company, {
    dashboardState: { playerAssets: { Kim: { shares: { PRR: 60 } } }, ...dashboardState },
    staticConfig: game1830,
    maxOr: 3,
    players: ['Kim']
  });

  it('tells the story of a company that paid every round', () => {
    const story = describeCompany(build({
      ors: { PRR: { or1: 100, or2: 200, or3: 300 } },
      shareValues: { PRR: 126 },
      sharePositions: { PRR: [1, 9] },
      startValues: { PRR: 90 },
      startPositions: { PRR: PAR_90 }
    }));

    expect(story).toContain('paid in all three operating rounds');
    expect(story).toContain('right three');
    expect(story).toContain('collected $60');
    expect(story).toContain('gained $36');
  });

  it('counts a withheld round separately from one nobody played', () => {
    const story = describeCompany(build({
      ors: { PRR: { or1: 100, or2: 0, or3: '' } },
      shareValues: { PRR: 90 },
      sharePositions: { PRR: PAR_90 },
      startValues: { PRR: 90 },
      startPositions: { PRR: PAR_90 }
    }));

    // Only two rounds were played, so the blank third is left out of the count entirely.
    expect(story).toContain('paid in one of two operating rounds');
    expect(story).toContain('withheld in one');
  });

  it('says when a company was sold out', () => {
    const story = describeCompany(build({
      ors: { PRR: { or1: 100 } },
      shareValues: { PRR: 100 },
      sharePositions: { PRR: [1, 7] },
      startValues: { PRR: 90 },
      startPositions: { PRR: PAR_90 },
      playerAssets: { Kim: { shares: { PRR: 100 } } }
    }));

    expect(story).toContain('was sold out');
    expect(story).toContain('up one');
  });

  it('says plainly when no starting price was recorded', () => {
    const story = describeCompany(build({
      ors: { PRR: { or1: 100 } },
      shareValues: { PRR: 60 },
      sharePositions: { PRR: [0, 0] }
    }));

    expect(story).toContain('no starting price');
  });

  it('says when a price fell rather than rose', () => {
    const story = describeCompany(build({
      ors: { PRR: { or1: 0, or2: 0 } },
      shareValues: { PRR: 76 },
      sharePositions: { PRR: [1, 4] },
      startValues: { PRR: 90 },
      startPositions: { PRR: PAR_90 }
    }));

    expect(story).toContain('lost $14');
  });
});

describe('describePlayer', () => {
  const companies = [
    { shortName: 'PRR', name: 'Pennsylvania', parValue: 90, totalShares: 10, color: '#237333' }
  ];

  it('tells a player what their shares did', () => {
    const [kim] = getPlayerReturns({
      dashboardState: {
        ors: { PRR: { or1: 100, or2: 200, or3: 300 } },
        shareValues: { PRR: 126 },
        sharePositions: { PRR: [1, 9] },
        startValues: { PRR: 90 },
        startPositions: { PRR: PAR_90 },
        playerAssets: { Kim: { cash: 500, shares: { PRR: 60 } } }
      },
      staticConfig: game1830,
      maxOr: 3,
      players: ['Kim'],
      activeCompanies: companies
    });

    const story = describePlayer(kim);
    expect(story).toContain('Kim');
    expect(story).toContain('$360');
    expect(story).toContain('$216');
    expect(story).toContain('PRR');
  });

  it('has something to say about a player holding nothing', () => {
    const [sam] = getPlayerReturns({
      dashboardState: { ors: {}, shareValues: {}, playerAssets: { Sam: { cash: 100, shares: {} } } },
      staticConfig: game1830,
      maxOr: 3,
      players: ['Sam'],
      activeCompanies: companies
    });

    expect(describePlayer(sam)).toContain('no shares');
  });
});

describe('what a player is worth', () => {
  const companies = [
    { shortName: 'PRR', name: 'Pennsylvania', parValue: 90, totalShares: 10, color: '#237333' }
  ];
  const args = {
    dashboardState: {
      ors: { PRR: { or1: 100, or2: 200, or3: 300 } },
      shareValues: { PRR: 126 },
      sharePositions: { PRR: [1, 9] },
      playerAssets: { Kim: { cash: 500, shares: { PRR: 60 } } }
    },
    staticConfig: game1830,
    maxOr: 3,
    players: ['Kim'],
    activeCompanies: companies
  };

  // The cash was written down at the end of the last share round, so the dividends the recorded
  // rounds paid arrive on top of it rather than out of it. Net worth adds all three.
  it('splits net worth into cash, dividends and the value of the shares', () => {
    const [kim] = getPlayerReturns(args);

    expect(kim.cash).toBe(500);
    expect(kim.incomeReturn).toBe(360);
    expect(kim.shareValue).toBe(756);
    expect(kim.netWorth).toBe(1616);
  });

  it('agrees with the net worth the results table shows', () => {
    const [kim] = getPlayerReturns(args);
    expect(kim.netWorth).toBe(getPlayerNetWorth(args.dashboardState, companies, args.maxOr, 'Kim'));
  });
});

describe('rules a title does not spell out', () => {
  const company = { shortName: 'PRR', name: 'Pennsylvania', parValue: 90, totalShares: 10 };
  const flatPrices = [80, 90, 100, 110, 120];

  const run = (staticConfig, ors, startPrice, shares = 50) => getCompanyReturn(company, {
    dashboardState: {
      ors: { PRR: ors },
      shareValues: { PRR: startPrice },
      sharePositions: {},
      startValues: { PRR: startPrice },
      startPositions: {},
      playerAssets: { Kim: { cash: 0, shares: { PRR: shares } } }
    },
    staticConfig,
    maxOr: 2,
    players: ['Kim']
  });

  // The reference moves right one on any payout unless a title says otherwise.
  it('moves right one square on a payout when the title names no rule', () => {
    const result = run({ sharePrices: flatPrices, priceMovement: { dividendWithheld: { move: 'left', squares: 1 } } },
      { or1: 500 }, 90);

    expect(result.steps.map((step) => step.move)).toEqual(['right']);
  });

  it('moves left one square on a withheld round when the title names no rule', () => {
    const result = run({ sharePrices: flatPrices, priceMovement: { dividendPaid: { move: 'right', squares: 1 } } },
      { or1: 0 }, 100);

    expect(result.steps.map((step) => step.move)).toEqual(['left']);
  });

  it('works at all for a title carrying no price rules whatsoever', () => {
    const result = run({ sharePrices: flatPrices }, { or1: 500 }, 90);

    expect(result.start.price).toBe(90);
    expect(result.steps.map((step) => step.move)).toEqual(['right']);
  });

  // A rule that is written down as moving nothing is a rule, not an absence.
  it('leaves a company still when the title says sold out moves nothing', () => {
    const rules = {
      soldOut: { move: null, squares: 0 },
      dividendPaid: { move: 'right', squares: 1 },
      dividendWithheld: { move: 'left', squares: 1 }
    };
    const result = run({ sharePrices: flatPrices, priceMovement: rules }, { or1: 500 }, 90, 100);

    expect(result.soldOut).toBe(true);
    expect(result.steps.every((step) => step.reason !== 'soldOut')).toBe(true);
  });

  it('still takes the sold out move up when the title leaves the rule out', () => {
    const result = run({ sharePrices: flatPrices, priceMovement: { dividendPaid: { move: 'right', squares: 1 } } },
      { or1: 500 }, 90, 100);

    expect(result.soldOut).toBe(true);
    expect(result.steps[0]).toMatchObject({ reason: 'soldOut', move: 'up' });
  });

  it('leaves a small payout alone where the title counts multiples of the price', () => {
    const rules = { dividendPaid: { move: 'right', squares: 'perMultipleOfPrice', maxSquares: 2 } };
    const result = run({ sharePrices: flatPrices, priceMovement: rules }, { or1: 10 }, 100);

    expect(result.steps).toEqual([]);
    expect(result.stockReturnPerShare).toBe(0);
  });
});
