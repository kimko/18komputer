export const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(Number(val))) return '';
  return `$${Number(val).toLocaleString()}`;
};

export const getShareValue = (dashboardState, activeCompanies, shortName) => {
  const val = dashboardState.shareValues[shortName];
  if (val !== undefined && val !== '') return Number(val);
  const c = activeCompanies.find(comp => comp.shortName === shortName);
  return c?.parValue || 0;
};

export const getPlayerShareValue = (dashboardState, activeCompanies, player) => {
  const assets = dashboardState.playerAssets[player] || { shares: {} };
  let sv = 0;
  activeCompanies.forEach(c => {
    const totalShares = c.totalShares || 10;
    const sharePct = Number(assets.shares[c.shortName] || 0);
    sv += (totalShares > 0 ? (sharePct / (totalShares > 0 ? (100 / totalShares) : 1)) : 0) * getShareValue(dashboardState, activeCompanies, c.shortName);
  });
  return sv;
};

export const getPlayerTotalShares = (dashboardState, activeCompanies, player) => {
  const assets = dashboardState.playerAssets[player] || { shares: {} };
  let totalPct = 0;
  activeCompanies.forEach(c => {
    const totalShares = c.totalShares || 10;
    totalPct += Number(assets.shares[c.shortName] || 0) / (100 / totalShares);
  });
  return totalPct;
};

export const getCompanyOrTotal = (dashboardState, maxOr, shortName) => {
  let total = 0;
  for (let i = 1; i <= maxOr; i++) {
    const val = dashboardState.ors[shortName]?.[`or${i}`];
    if (val !== undefined && val !== '') total += Number(val);
  }
  return total;
};

export const getPlayerOperatingIncome = (dashboardState, activeCompanies, maxOr, player) => {
  const assets = dashboardState.playerAssets[player] || { shares: {} };
  let income = 0;
  activeCompanies.forEach(c => {
    const totalShares = c.totalShares || 10;
    const sharePct = Number(assets.shares[c.shortName] || 0);
    if (100 > 0) {
      income += (sharePct / 100) * getCompanyOrTotal(dashboardState, maxOr, c.shortName);
    }
  });
  return income;
};

export const getPlayerNetWorth = (dashboardState, activeCompanies, maxOr, player) => {
  const assets = dashboardState.playerAssets[player] || { cash: 0 };
  return Number(assets.cash || 0) + 
         getPlayerShareValue(dashboardState, activeCompanies, player) + 
         getPlayerOperatingIncome(dashboardState, activeCompanies, maxOr, player);
};

export const getBankShares = (dashboardState, players, companyId) => {
  let totalPlayerShares = 0;
  players.forEach(p => {
    const pShares = Number(dashboardState.playerAssets[p]?.shares?.[companyId] || 0);
    totalPlayerShares += pShares;
  });
  const cInfo = dashboardState.shareValues[companyId] !== undefined ? null : null; // activeCompanies not passed, but we can assume total is 100% or 10 shares
  return Math.max(0, 100 - totalPlayerShares);
};

export const getCalculatorGrandTotal = (gameInstance, companyId) => {
  const calcState = gameInstance?.state?.calculatorState?.[companyId];
  if (!calcState || !calcState.trains) return 0;
  
  return calcState.trains
    .filter(t => !t.isExcluded)
    .reduce((sum, t) => {
      const stopsSum = t.stops.reduce((s, v) => s + v, 0);
      const bonusSum = (t.bonusStops || []).reduce((s, b) => s + b.val, 0);
      return sum + stopsSum + bonusSum;
    }, 0);
};
