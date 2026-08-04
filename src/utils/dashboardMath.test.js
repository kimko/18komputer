import { describe, it, expect } from 'vitest';
import { getShareValue, getPlayerShareValue, getPlayerTotalShares, getCompanyOrTotal, getPlayerOperatingIncome, getPlayerNetWorth, getBankShares, getCalculatorGrandTotal } from './dashboardMath';

describe('dashboardMath', () => {
  const mockDashboardState = {
    shareValues: { PRR: 100 },
    playerAssets: {
      P1: { shares: { PRR: 20 }, cash: 50 }
    },
    ors: {
      PRR: { or1: 200, or2: 300 }
    }
  };
  const mockActiveCompanies = [{ shortName: 'PRR', totalShares: 10, parValue: 90 }];
  
  it('getShareValue returns dashboard value or par', () => {
    expect(getShareValue(mockDashboardState, mockActiveCompanies, 'PRR')).toBe(100);
    expect(getShareValue({shareValues:{}}, mockActiveCompanies, 'PRR')).toBe(90);
  });
  
  it('getPlayerShareValue calculates correctly', () => {
    // 20% shares, totalShares=10 => 2 shares. 2 * 100 = 200
    expect(getPlayerShareValue(mockDashboardState, mockActiveCompanies, 'P1')).toBe(200);
  });
  
  it('getCompanyOrTotal sums up ORs', () => {
    expect(getCompanyOrTotal(mockDashboardState, 3, 'PRR')).toBe(500);
  });
});
