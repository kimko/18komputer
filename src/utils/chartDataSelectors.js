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
 * 1. Asset Breakdown (Stacked Bar Chart)
 * Returns players sorted by net worth, broken down by Stock, Cash, and Op Income.
 */
export const getPlayerAssetBreakdownData = (dashboardState, activeCompanies, maxOr, players) => {
  return players.map(p => {
    const cash = Number(dashboardState.playerAssets[p]?.cash || 0);
    const stockValue = getPlayerShareValue(dashboardState, activeCompanies, p);
    const opIncome = getPlayerOperatingIncome(dashboardState, activeCompanies, maxOr, p);
    const netWorth = cash + stockValue + opIncome;

    return {
      name: p,
      Cash: cash,
      'Stock Value': stockValue,
      'Op Income': opIncome,
      netWorth
    };
  }).sort((a, b) => b.netWorth - a.netWorth);
};

/**
 * 2. Dividend Dependency (Stacked Bar Chart)
 * Returns total operating income for each player, broken down by paying company.
 */
export const getPlayerDividendDependencyData = (dashboardState, activeCompanies, maxOr, players) => {
  return players.map(p => {
    const playerRecord = { name: p };
    let totalIncome = 0;
    
    activeCompanies.forEach(c => {
      const sharePct = Number(dashboardState.playerAssets[p]?.shares?.[c.shortName] || 0);
      const totalShares = c.totalShares || 10;
      const companyTotalIncome = getCompanyOrTotal(dashboardState, maxOr, c.shortName);
      
      const incomeFromCompany = totalShares > 0 ? (sharePct / 100) * companyTotalIncome : 0;
      if (incomeFromCompany > 0) {
        playerRecord[c.shortName] = incomeFromCompany;
        totalIncome += incomeFromCompany;
      }
    });
    
    playerRecord.totalIncome = totalIncome;
    return playerRecord;
  }).sort((a, b) => b.totalIncome - a.totalIncome);
};

/**
 * 3. Controlling Interest (Radar Chart)
 * Returns radar data weighted by the market cap of the owned shares.
 */
export const getControllingInterestData = (dashboardState, activeCompanies, players) => {
  return activeCompanies.map(c => {
    const sharePrice = getShareValue(dashboardState, activeCompanies, c.shortName);
    const totalShares = c.totalShares || 10;
    const marketCap = sharePrice * (100 / (100 / totalShares));
    
    const dataPoint = { company: c.shortName, marketCap };
    
    players.forEach(p => {
      const sharePct = Number(dashboardState.playerAssets[p]?.shares?.[c.shortName] || 0);
      // Weight the ownership by the market cap (value of shares held)
      const ownedValue = (sharePct / 100) * marketCap;
      dataPoint[p] = ownedValue;
    });
    
    return dataPoint;
  });
};
