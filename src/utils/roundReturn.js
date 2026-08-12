import { parseCell, cellAt, move, findStartCell } from './stockMarket.js';
import { getShareValue, getCompanyShareCount, getBankShares, getPlayerShareValue } from './dashboardMath.js';

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

// A payout worth less than the share price earns nothing, which is what the reference ladder does.
function squaresFor(rule, revenue, price) {
  if (typeof rule.squares === 'number') return rule.squares;
  if (!price) return 1;

  const step = rule.squares === 'perHalfMultipleOfPrice' ? price / 2 : price;
  if (rule.squares !== 'perMultipleOfPrice' && rule.squares !== 'perHalfMultipleOfPrice') return 1;

  const multiples = Math.floor(revenue / step);
  return multiples < 1 ? 0 : Math.min(multiples, rule.maxSquares || multiples);
}

function applyRule(market, position, rule, revenue, reason) {
  if (!rule?.move) return null;
  const squares = squaresFor(rule, revenue, cellAt(market.grid, position)?.price);
  if (squares < 1) return null;

  let next = position;
  for (let step = 0; step < squares; step += 1) next = move(market, next, rule.move);
  return { reason, move: rule.move, squares, revenue, from: position, to: next };
}

export function walk(market, start, { rounds, soldOut, rules }) {
  let position = start;
  const steps = [];

  const record = (step) => {
    if (!step) return;
    steps.push(step);
    position = step.to;
  };

  if (soldOut) record(applyRule(market, position, rules?.soldOut, 0, 'soldOut'));

  rounds.forEach((revenue, index) => {
    if (revenue === null) return;
    const rule = revenue > 0 ? rules?.dividendPaid : rules?.dividendWithheld;
    record(applyRule(market, position, rule, revenue, `or${index + 1}`));
  });

  return { position, steps };
}

const samePosition = (a, b) => a?.[0] === b?.[0] && a?.[1] === b?.[1];

// The starting square is not recorded, so try every square and keep the ones that land on the price.
export function findBaselines(market, endPosition, context) {
  const found = [];
  market.grid.forEach((row, rowIndex) => {
    row.forEach((code, colIndex) => {
      if (!parseCell(code)) return;
      const start = [rowIndex, colIndex];
      if (samePosition(walk(market, start, context).position, endPosition)) found.push(start);
    });
  });
  return found;
}

function summariseBaseline(market, candidates) {
  if (!candidates.length) return { certainty: 'unexplained', price: null, position: null, range: null };

  const prices = [...new Set(candidates.map((position) => cellAt(market.grid, position).price))].sort((a, b) => a - b);
  if (prices.length === 1) {
    return { certainty: 'exact', price: prices[0], position: candidates[0], range: null };
  }

  // The highest baseline claims the smallest gain, so an uncertain figure errs on the cautious side.
  const price = prices[prices.length - 1];
  const position = candidates.find((candidate) => cellAt(market.grid, candidate).price === price);
  return { certainty: 'approximate', price, position, range: [prices[0], price] };
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

  const empty = {
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
    returnOnBaseline: null,
    steps: [],
    baseline: { certainty: 'unexplained', price: null, position: null, range: null }
  };

  if (!market || !rules) return empty;

  const endPosition = dashboardState?.sharePositions?.[shortName]
    || findStartCell(market, company.parValue, priceNow);
  if (!endPosition || !cellAt(market.grid, endPosition)) return empty;

  const context = { rounds, soldOut, rules };
  const baseline = summariseBaseline(market, findBaselines(market, endPosition, context));
  if (baseline.certainty === 'unexplained') return { ...empty, baseline };

  const stockReturnPerShare = priceNow - baseline.price;
  return {
    ...empty,
    baseline,
    steps: walk(market, baseline.position, context).steps,
    stockReturnPerShare,
    totalReturnPerShare: orIncomePerShare + stockReturnPerShare,
    returnOnBaseline: baseline.price ? (orIncomePerShare + stockReturnPerShare) / baseline.price : null
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
  const { shortName, soldOut, orIncomePerShare, stockReturnPerShare, baseline } = company;
  const opening = `${shortName} ${describeRounds(company)}${soldOut ? ' and was sold out' : ''}`;

  if (baseline.certainty === 'unexplained') {
    return `${opening}. A share collected ${money(orIncomePerShare)} in dividends, but the recorded price `
      + 'cannot be reached from those rounds, so the price gain is unknown.';
  }

  const priceMove = stockReturnPerShare > 0
    ? `gained ${money(stockReturnPerShare)} in price`
    : (stockReturnPerShare < 0 ? `lost ${money(stockReturnPerShare)} in price` : 'ended where it started');
  const hedge = baseline.certainty === 'approximate'
    ? ` Its price before those rounds was somewhere between ${money(baseline.range[0])} and ${money(baseline.range[1])}, so that gain is approximate.`
    : '';

  return `${opening}, ${describeMoves(company)}. A share collected ${money(orIncomePerShare)} in dividends and ${priceMove}.${hedge}`;
}

export function describePlayer(player) {
  const { player: name, holdings, incomeReturn, stockReturn, totalReturn, partial } = player;
  if (!holdings.length) return `${name} holds no shares, so there is nothing to report.`;

  const best = [...holdings].sort((a, b) => (b.income + (b.stock || 0)) - (a.income + (a.stock || 0)))[0];
  const priceMove = stockReturn >= 0 ? `gained ${money(stockReturn)} in price` : `lost ${money(stockReturn)} in price`;
  const share = totalReturn > 0 ? Math.round(((best.income + (best.stock || 0)) / totalReturn) * 100) : 0;

  return `${name}'s shares collected ${money(incomeReturn)} in dividends and ${priceMove}`
    + `, ${money(totalReturn)} in all${share >= 40 ? `, mostly from ${best.shortName}` : ''}.`
    + (partial ? ' One holding has a price we could not explain, so the price half is incomplete.' : '');
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
      // A holding whose price we could not explain leaves the stock half of this incomplete.
      partial: holdings.some((holding) => holding.stock === null)
    };
  });
}
