import { describe, it, expect } from 'vitest';
import {
  marketFor, readRounds, walk, findBaselines,
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

describe('findBaselines', () => {
  it('finds the one square the rounds could have started from', () => {
    expect(findBaselines(market, [1, 9], context([100, 200, 300]))).toEqual([PAR_90]);
  });

  it('finds several when the moves run into the top of the market', () => {
    // Right from 350 stays at 350, so both 325 and 350 end there.
    const found = findBaselines(market, [0, 18], context([100]));
    expect(found).toContainEqual([0, 17]);
    expect(found).toContainEqual([0, 18]);
  });

  it('finds none when no square could have reached the recorded price', () => {
    expect(findBaselines(market, [0, 0], context([100]))).toEqual([]);
  });
});

describe('getCompanyReturn', () => {
  const company = { shortName: 'PRR', name: 'Pennsylvania', parValue: 90, totalShares: 10 };
  const state = (over = {}) => ({
    ors: { PRR: { or1: 100, or2: 200, or3: 300 } },
    shareValues: { PRR: 126 },
    sharePositions: { PRR: [1, 9] },
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
    expect(result.baseline.price).toBe(90);
    expect(result.stockReturnPerShare).toBe(36);
    expect(result.totalReturnPerShare).toBe(96);
    expect(result.baseline.certainty).toBe('exact');
  });

  it('counts the sold out move as part of the price gain', () => {
    const result = getCompanyReturn(company, args({
      dashboardState: {
        sharePositions: { PRR: [1, 9] },
        shareValues: { PRR: 126 },
        playerAssets: { Kim: { cash: 0, shares: { PRR: 100 } } }
      }
    }));

    // 82 up to 90, then three squares right to 126.
    expect(result.soldOut).toBe(true);
    expect(result.baseline.price).toBe(82);
    expect(result.stockReturnPerShare).toBe(44);
    expect(result.steps[0]).toMatchObject({ reason: 'soldOut', move: 'up' });
  });

  it('cannot pin the baseline down when the top of the market swallows the sold out move', () => {
    const result = getCompanyReturn(company, args({
      dashboardState: {
        sharePositions: { PRR: [0, 9] },
        shareValues: { PRR: 142 },
        playerAssets: { Kim: { cash: 0, shares: { PRR: 100 } } }
      }
    }));

    // From 90 the up move lands on 100; from 100 it has nowhere to go, so both reach 142.
    expect(result.baseline.certainty).toBe('approximate');
    expect(result.baseline.range).toEqual([90, 100]);
    expect(result.stockReturnPerShare).toBe(42);
  });

  it('says so when the rounds cannot explain the recorded price', () => {
    const result = getCompanyReturn(company, args({
      dashboardState: { sharePositions: { PRR: [0, 0] }, shareValues: { PRR: 60 } }
    }));

    expect(result.baseline.certainty).toBe('unexplained');
    expect(result.stockReturnPerShare).toBeNull();
    expect(result.totalReturnPerShare).toBeNull();
    expect(result.orIncomePerShare).toBe(60);
  });

  it('takes the most cautious baseline when several squares would do', () => {
    const result = getCompanyReturn(company, args({
      dashboardState: {
        ors: { PRR: { or1: 100 } },
        sharePositions: { PRR: [0, 18] },
        shareValues: { PRR: 350 }
      }
    }));

    expect(result.baseline.certainty).toBe('approximate');
    // 300 and 325 both move right to 350, and 350 has nowhere further to go.
    expect(result.baseline.range).toEqual([300, 350]);
    expect(result.baseline.price).toBe(350);
    expect(result.stockReturnPerShare).toBe(0);
  });

  it('works from the flat price list when a title has no grid', () => {
    const flatTitle = { sharePrices: [80, 90, 100, 112], priceMovement: rules };
    const result = getCompanyReturn(company, args({
      staticConfig: flatTitle,
      dashboardState: { ors: { PRR: { or1: 100 } }, shareValues: { PRR: 100 }, sharePositions: {} }
    }));

    expect(result.baseline.price).toBe(90);
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
      sharePositions: { PRR: [1, 9] }
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
      sharePositions: { PRR: [1, 6] }
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
      playerAssets: { Kim: { shares: { PRR: 100 } } }
    }));

    expect(story).toContain('was sold out');
    expect(story).toContain('up one');
  });

  it('says plainly when the price cannot be explained', () => {
    const story = describeCompany(build({
      ors: { PRR: { or1: 100 } },
      shareValues: { PRR: 60 },
      sharePositions: { PRR: [0, 0] }
    }));

    expect(story).toContain('cannot be reached');
  });

  it('says when a price fell rather than rose', () => {
    const story = describeCompany(build({
      ors: { PRR: { or1: 0, or2: 0 } },
      shareValues: { PRR: 76 },
      sharePositions: { PRR: [1, 4] }
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

  const run = (staticConfig, ors, priceNow, shares = 50) => getCompanyReturn(company, {
    dashboardState: {
      ors: { PRR: ors },
      shareValues: { PRR: priceNow },
      sharePositions: {},
      playerAssets: { Kim: { cash: 0, shares: { PRR: shares } } }
    },
    staticConfig,
    maxOr: 2,
    players: ['Kim']
  });

  // The reference moves right one on any payout unless a title says otherwise.
  it('moves right one square on a payout when the title names no rule', () => {
    const result = run({ sharePrices: flatPrices, priceMovement: { dividendWithheld: { move: 'left', squares: 1 } } },
      { or1: 500 }, 100);

    expect(result.baseline.price).toBe(90);
    expect(result.stockReturnPerShare).toBe(10);
  });

  it('moves left one square on a withheld round when the title names no rule', () => {
    const result = run({ sharePrices: flatPrices, priceMovement: { dividendPaid: { move: 'right', squares: 1 } } },
      { or1: 0 }, 90);

    expect(result.baseline.price).toBe(100);
    expect(result.stockReturnPerShare).toBe(-10);
  });

  it('works at all for a title carrying no price rules whatsoever', () => {
    const result = run({ sharePrices: flatPrices }, { or1: 500 }, 100);

    expect(result.baseline.certainty).toBe('exact');
    expect(result.baseline.price).toBe(90);
  });

  // A rule that is written down as moving nothing is a rule, not an absence.
  it('leaves a company still when the title says sold out moves nothing', () => {
    const rules = {
      soldOut: { move: null, squares: 0 },
      dividendPaid: { move: 'right', squares: 1 },
      dividendWithheld: { move: 'left', squares: 1 }
    };
    const result = run({ sharePrices: flatPrices, priceMovement: rules }, { or1: 500 }, 100, 100);

    expect(result.soldOut).toBe(true);
    expect(result.baseline.price).toBe(90);
    expect(result.steps.every((step) => step.reason !== 'soldOut')).toBe(true);
  });

  it('still takes the sold out move up when the title leaves the rule out', () => {
    const result = run({ sharePrices: flatPrices, priceMovement: { dividendPaid: { move: 'right', squares: 1 } } },
      { or1: 500 }, 110, 100);

    expect(result.soldOut).toBe(true);
    expect(result.steps[0]).toMatchObject({ reason: 'soldOut', move: 'up' });
    expect(result.baseline.price).toBe(90);
  });

  it('leaves a small payout alone where the title counts multiples of the price', () => {
    const rules = { dividendPaid: { move: 'right', squares: 'perMultipleOfPrice', maxSquares: 2 } };
    const result = run({ sharePrices: flatPrices, priceMovement: rules }, { or1: 10 }, 100);

    expect(result.baseline.price).toBe(100);
    expect(result.stockReturnPerShare).toBe(0);
  });
});
