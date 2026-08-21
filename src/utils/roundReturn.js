import { cellAt, move, findStartCell } from './stockMarket.js';
import {
  getShareValue,
  getCompanyShareCount,
  getBankShares,
  getPlayerShareValue,
  getCompanyHoldings
} from './dashboardMath.js';

export const marketFor = (staticConfig) => {
  if (staticConfig?.stockMarket) return staticConfig.stockMarket;
  const prices = staticConfig?.sharePrices;
  return prices?.length ? { type: '1d', grid: [prices.map(String)] } : null;
};

export function readRounds(dashboardState, maxOr, shortName) {
  const recorded = dashboardState?.ors?.[shortName] || {};
  return Array.from({ length: maxOr }, (_, index) => {
    const value = recorded[`or${index + 1}`];
    return value === undefined || value === '' ? null : Number(value);
  });
}

// What the reference engine does when a title names no rule of its own.
const DEFAULT_RULES = {
  soldOut: { move: 'up', squares: 1 },
  dividendPaid: { move: 'right', squares: 1 },
  dividendWithheld: { move: 'left', squares: 1 }
};

// Absent means the title never said. A rule written down as moving nothing is a rule, and is kept.
const ruleFor = (rules, name) => (rules && name in rules ? rules[name] : DEFAULT_RULES[name]);

// A payout worth less than the share price earns nothing, which is what the reference ladder does.
function squaresFor(rule, revenue, price) {
  if (typeof rule.squares === 'number') return rule.squares;
  if (!price) return 1;

  const step = rule.squares === 'perHalfMultipleOfPrice' ? price / 2 : price;
  if (rule.squares !== 'perMultipleOfPrice' && rule.squares !== 'perHalfMultipleOfPrice') return 1;

  const multiples = Math.floor(revenue / step);
  return multiples < 1 ? 0 : Math.min(multiples, rule.maxSquares || multiples);
}

// A few titles pay a sold out company more than the usual one square, depending on where it stands
// or on who holds it. 1894 adds one square when a player holds most of the company and another
// when it is still in the grey zone, so a single sold out round can carry it three squares up.
// The conditions are read against the square the company is leaving, not the one it arrives on.
function extraSquaresFor(rule, market, position, context) {
  return (rule.extraSquares || []).reduce((total, extra) => {
    const squares = Number(extra.squares) || 0;
    if (extra.when === 'inZone') {
      return total + (cellAt(market.grid, position)?.zone === extra.zone ? squares : 0);
    }
    if (extra.when === 'playerHoldsAtLeast') {
      const most = Math.max(0, ...(context?.holdings || []));
      return total + (most >= Number(extra.percent) ? squares : 0);
    }
    return total;
  }, 0);
}

function applyRule(market, position, rule, revenue, reason, context) {
  if (!rule?.move) return null;
  const base = squaresFor(rule, revenue, cellAt(market.grid, position)?.price);
  if (base < 1) return null;
  const squares = base + extraSquaresFor(rule, market, position, context);

  let next = position;
  for (let step = 0; step < squares; step += 1) next = move(market, next, rule.move);
  return { reason, move: rule.move, squares, revenue, from: position, to: next };
}

export function walk(market, start, { rounds, soldOut, rules, holdings }) {
  let position = start;
  const steps = [];
  const context = { holdings };

  const record = (step) => {
    if (!step) return;
    steps.push(step);
    position = step.to;
  };

  if (soldOut) record(applyRule(market, position, ruleFor(rules, 'soldOut'), 0, 'soldOut', context));

  rounds.forEach((revenue, index) => {
    if (revenue === null) return;
    const rule = ruleFor(rules, revenue > 0 ? 'dividendPaid' : 'dividendWithheld');
    record(applyRule(market, position, rule, revenue, `or${index + 1}`, context));
  });

  return { position, steps };
}

// One round at a time, for callers stepping a game forward rather than walking a whole window.
export function stepPrice(market, position, rules, name, revenue, context) {
  const step = applyRule(market, position, ruleFor(rules, name), revenue, name, context);
  return step ? step.to : position;
}

export function readStartPrice(dashboardState, shortName) {
  const recorded = dashboardState?.startValues?.[shortName];
  return recorded === undefined || recorded === '' ? null : Number(recorded);
}

export function getCompanyReturn(company, { dashboardState, staticConfig, maxOr, players }) {
  const { shortName, totalShares } = company;
  const market = marketFor(staticConfig);
  const rules = staticConfig?.priceMovement;

  const rounds = readRounds(dashboardState, maxOr, shortName);
  const revenue = rounds.reduce((total, value) => total + (value || 0), 0);
  const shares = Number(totalShares) || 10;
  const orIncomePerShare = revenue / shares;

  const priceNow = getShareValue(dashboardState, [company], shortName);
  const bankShares = getBankShares(dashboardState, players, shortName);
  const soldOut = bankShares === 0;
  const holdings = getCompanyHoldings(dashboardState?.playerAssets, players, shortName);

  const startPrice = readStartPrice(dashboardState, shortName);
  const startPosition = dashboardState?.startPositions?.[shortName]
    || (market && startPrice !== null ? findStartCell(market, company.parValue, startPrice) : null);

  const base = {
    shortName,
    name: company.name,
    color: company.color,
    priceNow,
    soldOut,
    bankShares,
    rounds,
    orIncomePerShare,
    stockReturnPerShare: null,
    totalReturnPerShare: null,
    returnOnStart: null,
    steps: [],
    start: { price: startPrice, position: startPosition }
  };

  if (startPrice === null) return base;

  const placed = market && startPosition && cellAt(market.grid, startPosition);
  const stockReturnPerShare = priceNow - startPrice;
  return {
    ...base,
    steps: placed ? walk(market, startPosition, { rounds, soldOut, rules, holdings }).steps : [],
    stockReturnPerShare,
    totalReturnPerShare: orIncomePerShare + stockReturnPerShare,
    returnOnStart: startPrice ? (orIncomePerShare + stockReturnPerShare) / startPrice : null
  };
}

export function getCompanyReturns({ dashboardState, staticConfig, maxOr, players, activeCompanies }) {
  return activeCompanies.map((company) =>
    getCompanyReturn(company, { dashboardState, staticConfig, maxOr, players }));
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const count = (n) => WORDS[n] || String(n);
const money = (value) => `$${Math.round(Math.abs(value)).toLocaleString()}`;

const list = (parts) => {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
};

function describeRounds({ rounds }) {
  const played = rounds.filter((revenue) => revenue !== null);
  if (!played.length) return 'has no operating rounds recorded';

  const paid = played.filter((revenue) => revenue > 0).length;
  const withheld = played.length - paid;
  const total = count(played.length);

  if (paid === played.length) return `paid in ${played.length === 1 ? 'its one operating round' : `all ${total} operating rounds`}`;
  if (paid === 0) return `withheld in ${played.length === 1 ? 'its one operating round' : `all ${total} operating rounds`}`;
  return `paid in ${count(paid)} of ${total} operating rounds and withheld in ${count(withheld)}`;
}

function describeMoves({ steps }) {
  const squares = steps.reduce((tally, step) => ({ ...tally, [step.move]: (tally[step.move] || 0) + step.squares }), {});
  const parts = Object.entries(squares).map(([direction, total]) => `${direction} ${count(total)}`);
  return parts.length ? `moving ${list(parts)}` : 'without moving its price';
}

export function describeCompany(company) {
  const { shortName, soldOut, orIncomePerShare, stockReturnPerShare, start } = company;
  const opening = `${shortName} ${describeRounds(company)}${soldOut ? ' and was sold out' : ''}`;

  if (start.price === null) {
    return `${opening}. A share collected ${money(orIncomePerShare)} in dividends, but no starting price `
      + 'was recorded, so the price gain is unknown.';
  }

  const priceMove = stockReturnPerShare > 0
    ? `gained ${money(stockReturnPerShare)} in price`
    : (stockReturnPerShare < 0 ? `lost ${money(stockReturnPerShare)} in price` : 'ended where it started');

  return `${opening}, ${describeMoves(company)}. A share collected ${money(orIncomePerShare)} in dividends and ${priceMove}.`;
}

export function describePlayer(player) {
  const { player: name, holdings, incomeReturn, stockReturn, totalReturn, partial } = player;
  if (!holdings.length) return `${name} holds no shares, so there is nothing to report.`;

  const best = [...holdings].sort((a, b) => (b.income + (b.stock || 0)) - (a.income + (a.stock || 0)))[0];
  const priceMove = stockReturn >= 0 ? `gained ${money(stockReturn)} in price` : `lost ${money(stockReturn)} in price`;
  const share = totalReturn > 0 ? Math.round(((best.income + (best.stock || 0)) / totalReturn) * 100) : 0;

  return `${name}'s shares collected ${money(incomeReturn)} in dividends and ${priceMove}`
    + `, ${money(totalReturn)} in all${share >= 40 ? `, mostly from ${best.shortName}` : ''}.`
    + (partial ? ' One holding has no starting price recorded, so the price half is incomplete.' : '');
}

export function getPlayerReturns({ dashboardState, staticConfig, maxOr, players, activeCompanies }) {
  const companies = getCompanyReturns({ dashboardState, staticConfig, maxOr, players, activeCompanies });

  return players.map((player) => {
    const assets = dashboardState?.playerAssets?.[player] || { shares: {} };
    const holdings = companies.map((company) => {
      const source = activeCompanies.find((c) => c.shortName === company.shortName);
      const shares = getCompanyShareCount(assets.shares?.[company.shortName], source?.totalShares);
      return {
        shortName: company.shortName,
        color: company.color,
        shares,
        income: shares * company.orIncomePerShare,
        stock: company.stockReturnPerShare === null ? null : shares * company.stockReturnPerShare
      };
    }).filter((holding) => holding.shares > 0);

    const incomeReturn = holdings.reduce((total, holding) => total + holding.income, 0);
    const stockReturn = holdings.reduce((total, holding) => total + (holding.stock || 0), 0);
    const cash = Number(assets.cash || 0);
    const shareValue = getPlayerShareValue(dashboardState, activeCompanies, player);

    return {
      player,
      holdings,
      incomeReturn,
      stockReturn,
      totalReturn: incomeReturn + stockReturn,
      // The cash was written down at the end of the last share round, so the dividends the
      // recorded rounds paid land on top of it rather than coming out of it.
      cash,
      shareValue,
      netWorth: cash + shareValue + incomeReturn,
      // A holding with no starting price recorded leaves the stock half of this incomplete.
      partial: holdings.some((holding) => holding.stock === null)
    };
  });
}
