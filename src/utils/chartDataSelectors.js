import {
  getShareValue,
  getCompanyOrTotal,
  getPlayerNetWorth,
  getPlayerShareValue,
  getPlayerOperatingIncome
} from './dashboardMath.js';
import { getContrastColor } from './colorUtils.js';

/**
 * Transforms dashboard state into an array of company metrics for Recharts
 * Used for Scatter/Bubble Chart (Value vs Income) and Bar Chart (Market Cap)
 */
export const getCompanyChartData = (dashboardState, activeCompanies, maxOr) => {
  return activeCompanies.map(c => {
    const sharePrice = getShareValue(dashboardState, activeCompanies, c.shortName);
    const operatingIncome = getCompanyOrTotal(dashboardState, maxOr, c.shortName);
    const totalShares = c.totalShares || 10;
    const marketCap = sharePrice * (100 / (100 / totalShares)); // typically sharePrice * 10
    
    return {
      name: c.shortName,
      fullName: c.name,
      sharePrice,
      operatingIncome,
      marketCap,
      fill: c.color || '#718096', // gray.500 fallback
      contrast: getContrastColor(c.color || '#718096')
    };
  }).filter(c => c.marketCap > 0 || c.operatingIncome > 0);
};

/**
 * Transforms dashboard state into a sorted array of players for Net Worth Leaderboard
 */
export const getPlayerLeaderboardData = (dashboardState, activeCompanies, maxOr, players) => {
  const colors = ['#3182CE', '#38A169', '#D69E2E', '#E53E3E', '#805AD5', '#D53F8C', '#319795', '#DD6B20'];
  
  return players.map((p, index) => {
    return {
      name: p,
      netWorth: getPlayerNetWorth(dashboardState, activeCompanies, maxOr, p),
      cash: Number(dashboardState.playerAssets[p]?.cash || 0),
      shareValue: getPlayerShareValue(dashboardState, activeCompanies, p),
      opIncome: getPlayerOperatingIncome(dashboardState, activeCompanies, maxOr, p),
      fill: colors[index % colors.length]
    };
  }).sort((a, b) => b.netWorth - a.netWorth);
};

/**
 * Transforms dashboard state into a format suitable for a Radar Chart 
 * Showing each company on an axis, and each player as a data polygon (their % ownership)
 */
export const getPortfolioRadarData = (dashboardState, activeCompanies, players) => {
  return activeCompanies.map(c => {
    const dataPoint = { company: c.shortName };
    players.forEach(p => {
      // Get raw percentage
      dataPoint[p] = Number(dashboardState.playerAssets[p]?.shares?.[c.shortName] || 0);
    });
    return dataPoint;
  });
};
