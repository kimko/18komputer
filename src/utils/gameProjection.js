import { cellAt } from './stockMarket.js';
import { getCompanyShareCount, getBankShares, getShareValue, getCompanyHoldings } from './dashboardMath.js';
import { marketFor, readRounds, getCompanyReturn, stepPrice } from './roundReturn.js';

const MAX_TICKS = 12;

// A round recorded as zero is a withheld round, which is a result and counts.
export function countRecordedRounds(dashboardState, maxOr, activeCompanies) {
  let last = 0;
  activeCompanies.forEach(({ shortName }) => {
    readRounds(dashboardState, maxOr, shortName).forEach((revenue, index) => {
      if (revenue !== null) last = Math.max(last, index + 1);
    });
  });
  return last;
}

// One share round then its operating rounds, over and over, until the chart is full.
export function buildTimeline(roundsPerSet) {
  if (roundsPerSet < 1) return [];

  const ticks = [];
  for (let set = 1; ticks.length < MAX_TICKS; set += 1) {
    ticks.push({ id: `t${ticks.length}`, label: `SR${set}`, kind: 'sr', set, recorded: set === 1 });
    for (let round = 1; round <= roundsPerSet && ticks.length < MAX_TICKS; round += 1) {
      ticks.push({ id: `t${ticks.length}`, label: `OR${round}`, kind: 'or', set, round, recorded: set === 1 });
    }
  }
  return ticks.slice(0, MAX_TICKS);
}

const lastRecorded = (rounds) => {
  for (let index = rounds.length - 1; index >= 0; index -= 1) {
    if (rounds[index] !== null) return rounds[index];
  }
  return null;
};

function readCompanies({ dashboardState, staticConfig, maxOr, players, activeCompanies }) {
  const market = marketFor(staticConfig);

  return activeCompanies.map((company) => {
    const { shortName } = company;
    const derived = getCompanyReturn(company, { dashboardState, staticConfig, maxOr, players });
    const rounds = readRounds(dashboardState, maxOr, shortName);
    const placed = market && derived.start.position;

    return {
      shortName,
      shares: Number(company.totalShares) || 10,
      soldOut: getBankShares(dashboardState, players, shortName) === 0,
      // Titles that pay a bigger sold out jump to a mostly held company need to know who holds it.
      holdings: getCompanyHoldings(dashboardState?.playerAssets, players, shortName),
      rounds,
      // Every projected round repeats whatever the last recorded one did.
      repeatRevenue: lastRecorded(rounds),
      position: placed ? derived.start.position : null,
      // With nowhere to stand on the chart, a price can only be held where it was recorded.
      flatPrice: placed ? null : getShareValue(dashboardState, activeCompanies, shortName)
    };
  });
}

export function projectNetWorth({ dashboardState, staticConfig, maxOr, players, activeCompanies }) {
  const roundsPerSet = countRecordedRounds(dashboardState, maxOr, activeCompanies);
  const timeline = buildTimeline(roundsPerSet);
  if (!timeline.length) return [];

  const market = marketFor(staticConfig);
  const rules = staticConfig?.priceMovement;
  const companies = readCompanies({ dashboardState, staticConfig, maxOr, players, activeCompanies });
  const unexplained = companies.filter((c) => !c.position).map((c) => c.shortName);

  const cash = Object.fromEntries(players.map((player) => (
    [player, Number(dashboardState?.playerAssets?.[player]?.cash || 0)]
  )));
  const dividends = Object.fromEntries(players.map((player) => [player, 0]));

  const heldBy = (player, shortName) => getCompanyShareCount(
    dashboardState?.playerAssets?.[player]?.shares?.[shortName],
    activeCompanies.find((c) => c.shortName === shortName)?.totalShares
  );

  const priceOf = (company) => (
    company.position ? cellAt(market.grid, company.position).price : company.flatPrice
  );

  const payOut = (company, revenue) => {
    if (revenue === null) return;
    players.forEach((player) => {
      dividends[player] += (Number(dashboardState?.playerAssets?.[player]?.shares?.[company.shortName] || 0) / 100) * revenue;
    });
  };

  const movePrice = (company, name, revenue) => {
    if (!company.position) return;
    company.position = stepPrice(market, company.position, rules, name, revenue, { holdings: company.holdings });
  };

  return timeline.map((tick) => {
    companies.forEach((company) => {
      if (tick.kind === 'sr') {
        if (company.soldOut) movePrice(company, 'soldOut', 0);
        return;
      }

      const revenue = tick.recorded ? company.rounds[tick.round - 1] : company.repeatRevenue;
      if (revenue === null || revenue === undefined) return;

      payOut(company, revenue);
      movePrice(company, revenue > 0 ? 'dividendPaid' : 'dividendWithheld', revenue);
    });

    const prices = Object.fromEntries(companies.map((company) => [company.shortName, priceOf(company)]));
    const shareValue = Object.fromEntries(players.map((player) => [player, companies.reduce(
      (total, company) => total + heldBy(player, company.shortName) * prices[company.shortName], 0
    )]));

    return {
      ...tick,
      unexplained,
      prices,
      cash: { ...cash },
      dividends: { ...dividends },
      shareValue,
      netWorth: Object.fromEntries(players.map((player) => (
        [player, cash[player] + dividends[player] + shareValue[player]]
      )))
    };
  });
}
