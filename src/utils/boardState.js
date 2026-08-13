import { getShareValue, getCompanyShareCount, getBankShares } from './dashboardMath.js';
import { getPlayerReturns } from './roundReturn.js';

const heldPercent = (dashboardState, player, shortName) =>
  Number(dashboardState?.playerAssets?.[player]?.shares?.[shortName] || 0);

// Who finished owning what, company by company, with whatever nobody bought left to the bank.
export function getBoardOwnership({ dashboardState, activeCompanies, players }) {
  return activeCompanies
    .map((company) => {
      const { shortName, totalShares } = company;
      const price = getShareValue(dashboardState, activeCompanies, shortName);
      const shares = Number(totalShares) || 10;

      const held = players
        .map((player) => ({ holder: player, percent: heldPercent(dashboardState, player, shortName) }))
        .filter((slice) => slice.percent > 0);

      const bankPercent = getBankShares(dashboardState, players, shortName);
      const slices = [...held, ...(bankPercent > 0 ? [{ holder: 'Bank', percent: bankPercent, isBank: true }] : [])]
        .map((slice) => {
          const count = getCompanyShareCount(slice.percent, shares);
          return { ...slice, shares: count, value: count * price };
        })
        .sort((a, b) => b.value - a.value);

      return {
        shortName,
        name: company.name,
        color: company.color,
        price,
        marketCap: shares * price,
        slices
      };
    })
    .sort((a, b) => b.marketCap - a.marketCap);
}

// What each player is worth, split by the company that earned it rather than by the kind of money.
export function getWorthByCompany({ dashboardState, staticConfig, maxOr, players, activeCompanies }) {
  const returns = getPlayerReturns({ dashboardState, staticConfig, maxOr, players, activeCompanies });
  // One order for everybody, so the same company sits in the same place in every bar.
  const order = getBoardOwnership({ dashboardState, activeCompanies, players }).map((c) => c.shortName);

  return players.map((player) => {
    const entry = returns.find((row) => row.player === player);
    const byCompany = {};

    order.forEach((shortName) => {
      const percent = heldPercent(dashboardState, player, shortName);
      if (percent <= 0) return;

      const company = activeCompanies.find((c) => c.shortName === shortName);
      const count = getCompanyShareCount(percent, company?.totalShares);
      const price = getShareValue(dashboardState, activeCompanies, shortName);
      const dividends = entry.holdings.find((h) => h.shortName === shortName)?.income || 0;

      byCompany[shortName] = count * price + dividends;
    });

    return { player, order, cash: entry.cash, byCompany, netWorth: entry.netWorth };
  });
}
