import { cellAt } from './stockMarket.js';
import { marketFor, readRounds, walk } from './roundReturn.js';
import { getShareValue, getBankShares, getCompanyHoldings } from './dashboardMath.js';

// Where a company's price must have stood when the last share round closed.
//
// Rather than trying to run the title's rules backwards, which a market grid does not allow
// cleanly — a left move at the left edge becomes a move down, and a down move stops dead at a
// ledge, so neither undoes reliably — this replays the recorded rounds forwards from every square
// on the chart and keeps the squares that land on the price recorded now.
export function findStartCandidates(market, { priceNow, rounds, soldOut, rules, holdings }) {
  const candidates = [];

  market.grid.forEach((row, rowIndex) => {
    row.forEach((_, colIndex) => {
      const from = [rowIndex, colIndex];
      const cell = cellAt(market.grid, from);
      if (!cell) return;

      const { position } = walk(market, from, { rounds, soldOut, rules, holdings });
      if (cellAt(market.grid, position)?.price === priceNow) {
        candidates.push({ position: from, price: cell.price });
      }
    });
  });

  return candidates;
}

export function solveStartPrice(company, { dashboardState, staticConfig, maxOr, players }) {
  const { shortName } = company;
  const market = marketFor(staticConfig);
  if (!market) return { shortName, found: false };

  const priceNow = getShareValue(dashboardState, [company], shortName);
  if (!priceNow) return { shortName, found: false };

  const candidates = findStartCandidates(market, {
    priceNow,
    rounds: readRounds(dashboardState, maxOr, shortName),
    soldOut: getBankShares(dashboardState, players, shortName) === 0,
    rules: staticConfig?.priceMovement,
    holdings: getCompanyHoldings(dashboardState?.playerAssets, players, shortName)
  });

  if (!candidates.length) return { shortName, found: false };

  // Several squares can explain the same finish. The dearest of them is the cautious answer,
  // because it credits the recorded rounds with the smallest price gain.
  const best = candidates.reduce((dearest, candidate) => (
    candidate.price > dearest.price ? candidate : dearest
  ));

  return {
    shortName,
    found: true,
    price: best.price,
    position: best.position,
    approximate: candidates.length > 1
  };
}

export function solveStartPrices({ dashboardState, staticConfig, maxOr, players, activeCompanies }) {
  return (activeCompanies || []).map((company) =>
    solveStartPrice(company, { dashboardState, staticConfig, maxOr, players }));
}

// The dashboard writes both: the price is what the grid shows, and the square is what keeps two
// cells sharing a money value from being confused with each other later.
export function toStartFields(solved, dashboardState) {
  const found = solved.filter((entry) => entry.found);

  return {
    startValues: found.reduce(
      (next, entry) => ({ ...next, [entry.shortName]: entry.price }),
      { ...(dashboardState?.startValues || {}) }
    ),
    startPositions: found.reduce(
      (next, entry) => ({ ...next, [entry.shortName]: entry.position }),
      { ...(dashboardState?.startPositions || {}) }
    )
  };
}
