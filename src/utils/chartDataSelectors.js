import {
  getShareValue,
  getCompanyOrTotal,
  getPlayerNetWorth,
  getPlayerShareValue,
  getPlayerOperatingIncome
} from './dashboardMath.js';
import { getContrastColor } from './colorUtils.js';

/**
 * Common color palette for players
 */
export const PLAYER_COLORS = ['#3182CE', '#38A169', '#D69E2E', '#E53E3E', '#805AD5', '#D53F8C', '#319795', '#DD6B20'];

/**
 * 1. Revenue Trajectory (Line Chart)
 * Returns array of operating rounds with income data for each company.
 */
export const getRevenueTrajectoryData = (dashboardState, activeCompanies, maxOr) => {
  const data = [];
  for (let i = 1; i <= maxOr; i++) {
    const roundData = { name: `OR ${i}` };
    activeCompanies.forEach(c => {
      const val = Number(dashboardState.ors[c.shortName]?.[`or${i}`] || 0);
      if (val > 0) {
        roundData[c.shortName] = val;
      }
    });
    data.push(roundData);
  }
  return data;
};

/**
 * 2. & 3. Dividend Yield & Market Dominance (Bar Chart & Donut Chart)
 * Returns company data with yield calculations and market caps.
 */
export const getCompanyYieldAndDominanceData = (dashboardState, activeCompanies, maxOr) => {
  return activeCompanies.map(c => {
    const sharePrice = getShareValue(dashboardState, activeCompanies, c.shortName);
    const operatingIncome = getCompanyOrTotal(dashboardState, maxOr, c.shortName);
    const totalShares = c.totalShares || 10;
    const marketCap = sharePrice > 0 ? sharePrice * (100 / (100 / totalShares)) : 0;
    
    // Dividend Yield = Income / Market Cap (represented as a percentage)
    const yieldPct = marketCap > 0 ? (operatingIncome / marketCap) * 100 : 0;
    
    return {
      name: c.shortName,
      fullName: c.name,
      yieldPct: Math.round(yieldPct),
      marketCap,
      fill: c.color || '#718096',
      contrast: getContrastColor(c.color || '#718096')
    };
  }).filter(c => c.marketCap > 0 || c.yieldPct > 0);
};



/**
 * 4. Market Power Grid (Bubble Chart)
 * Returns flat array of points for a Scatter Chart representing ownership value.
 */
export const getBubbleChartData = (dashboardState, activeCompanies, maxOr, players, includeCash = false) => {
  const data = [];
  players.forEach((p, pIndex) => {
    let playerTotalShares = 0;
    let playerTotalShareValue = 0;
    let playerTotalOpIncome = 0;

    activeCompanies.forEach((c, cIndex) => {
      const sharePrice = getShareValue(dashboardState, activeCompanies, c.shortName);
      const totalShares = c.totalShares || 10;
      const marketCap = sharePrice * (100 / (100 / totalShares));
      
      const sharePct = Number(dashboardState.playerAssets[p]?.shares?.[c.shortName] || 0);
      const shareCount = sharePct / (100 / totalShares);
      
      // 1. Share Value
      const shareValue = (sharePct / 100) * marketCap;
      
      // 2. Operating Income
      const companyTotalIncome = getCompanyOrTotal(dashboardState, maxOr, c.shortName);
      const opIncome = totalShares > 0 ? (sharePct / 100) * companyTotalIncome : 0;

      if (shareCount > 0) {
        // Deterministic Jitter
        const xBase = (pIndex + 1) * 10;
        const xJitter = (cIndex - (activeCompanies.length / 2)) * 0.8;
        const yBase = shareCount;
        const yJitter = ((cIndex % 3) - 1) * 0.2; // -0.2, 0, or 0.2
        const valJitter = ((cIndex % 3) - 1) * 15; // $15 jitter

        data.push({
          player: p,
          company: c.shortName,
          x: xBase + xJitter,
          y: yBase + yJitter,
          trueShares: shareCount,
          shareValue: shareValue,
          shareValueJitter: Math.max(0, shareValue + valJitter),
          opIncome: opIncome,
          opIncomeJitter: Math.max(0, opIncome + valJitter),
          totalValue: shareValue + opIncome,
          totalValueJitter: Math.max(0, shareValue + opIncome + valJitter),
          fill: c.color || '#8884d8'
        });
      }

      playerTotalShares += shareCount;
      playerTotalShareValue += shareValue;
      playerTotalOpIncome += opIncome;
    });

    if (playerTotalShares > 0) {
      const xBase = (pIndex + 1) * 10;
      const cash = Number(dashboardState.playerAssets[p]?.cash || 0);

      // Separate Cash Bubble
      if (includeCash && cash > 0) {
        data.push({
          player: p,
          company: 'Cash',
          x: xBase, // Perfectly centered
          y: 0, // Cash has 0 shares
          trueShares: 0,
          shareValue: 0, // Cash isn't stock
          shareValueJitter: 0,
          opIncome: 0, // Cash isn't income
          opIncomeJitter: 0,
          totalValue: cash, // Cash ONLY counts toward Total Value
          totalValueJitter: cash,
          fill: '#48BB78', // Green for cash
          stroke: 'none',
          isCumulative: false
        });
      }

      // Cumulative Bubble
      const cumulativeCash = includeCash ? cash : 0;
      const playerTotalValue = playerTotalShareValue + playerTotalOpIncome + cumulativeCash;
      
      data.push({
        player: p,
        company: 'Cumulative Total',
        x: xBase, // Perfectly centered, no jitter
        y: playerTotalShares, // Exact total shares, no jitter
        trueShares: playerTotalShares,
        shareValue: playerTotalShareValue,
        shareValueJitter: playerTotalShareValue, // Exact value, no jitter
        opIncome: playerTotalOpIncome,
        opIncomeJitter: playerTotalOpIncome,
        totalValue: playerTotalValue,
        totalValueJitter: playerTotalValue,
        fill: '#A0AEC0',
        stroke: 'none',
        isCumulative: true
      });
    }
  });
  return data;
};
