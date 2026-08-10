import { describe, it, expect } from 'vitest';
import { getShareValue, getPlayerShareValue, getCompanyOrTotal, getPlayerOperatingIncome, getPlayerNetWorth, getCalculatorGrandTotal, getCompanyShareCount, getPlayerTotalShares, getCompanyHoldings } from './dashboardMath';

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

  it('comprehensively calculates player business logic (share value, operating income, net worth)', () => {
    const state = {
      shareValues: { BNO: 67 },
      ors: {
        BNO: { or1: 100, or2: 200, or3: 150 }
      },
      playerAssets: {
        Alice: {
          shares: { BNO: 20 }, // 20%
          cash: 1000
        }
      }
    };
    const companies = [{ shortName: 'BNO', totalShares: 10, parValue: 50 }];
    const maxOr = 3;
    const player = 'Alice';
    
    // 1. Share value checks out
    // 20% is 2 shares (out of 10). 2 shares @ $67 = $134
    expect(getPlayerShareValue(state, companies, player)).toBe(134);
    
    // 2. Operating income checks out
    // Total OR = 100 + 200 + 150 = 450. 20% of 450 = 90
    expect(getPlayerOperatingIncome(state, companies, maxOr, player)).toBe(90);
    
    // 3. Net worth checks out
    // Cash (1000) + Share Value (134) + Operating Income (90) = 1224
    expect(getPlayerNetWorth(state, companies, maxOr, player)).toBe(1224);
  });

  describe('getCompanyHoldings', () => {
    const assets = {
      Alice: { shares: { PRR: 40 } },
      Bob: { shares: { PRR: 20, NYC: 30 } },
      Ghost: { shares: { PRR: 60 } }
    };

    it('counts only the players on the list', () => {
      expect(getCompanyHoldings(assets, ['Alice', 'Bob'], 'PRR').sort((a, b) => a - b)).toEqual([20, 40]);
    });

    it('ignores holdings left behind by somebody who is no longer a player', () => {
      // 60% would otherwise make a 5-share structure look reachable when it is not.
      expect(getCompanyHoldings(assets, ['Alice', 'Bob'], 'PRR')).not.toContain(60);
    });

    it('skips players holding nothing in that company', () => {
      expect(getCompanyHoldings(assets, ['Alice', 'Bob'], 'NYC')).toEqual([30]);
    });

    it('copes with missing assets or players', () => {
      expect(getCompanyHoldings(undefined, ['Alice'], 'PRR')).toEqual([]);
      expect(getCompanyHoldings(assets, undefined, 'PRR')).toEqual([]);
    });
  });

  describe('share counts', () => {
    it('getCompanyShareCount turns a percentage into shares', () => {
      expect(getCompanyShareCount(40, 10)).toBe(4);
      expect(getCompanyShareCount(40, 5)).toBe(2);
      expect(getCompanyShareCount(100, 2)).toBe(2);
      expect(getCompanyShareCount(0, 5)).toBe(0);
    });

    it('getCompanyShareCount treats a company with no structure as 10-share', () => {
      expect(getCompanyShareCount(40, undefined)).toBe(4);
    });

    it('getPlayerTotalShares adds up across mixed corporate structures', () => {
      const state = {
        shareValues: {},
        ors: {},
        playerAssets: { Alice: { shares: { TWO: 100, FIVE: 40, TEN: 40 } } }
      };
      const companies = [
        { shortName: 'TWO', totalShares: 2 },
        { shortName: 'FIVE', totalShares: 5 },
        { shortName: 'TEN', totalShares: 10 }
      ];

      // 2 + 2 + 4
      expect(getPlayerTotalShares(state, companies, 'Alice')).toBe(8);
    });

    it('getPlayerShareValue prices each share by the structure', () => {
      const state = {
        shareValues: { TWO: 100 },
        ors: {},
        playerAssets: { Alice: { shares: { TWO: 100 } } }
      };
      // The whole company is 2 shares at $100
      expect(getPlayerShareValue(state, [{ shortName: 'TWO', totalShares: 2 }], 'Alice')).toBe(200);
    });
  });

  it('getCalculatorGrandTotal correctly calculates train revenue', () => {
    const mockGameInstance = {
      state: {
        calculatorState: {
          BNO: {
            trains: [
              { stops: [10, 20, 30], bonusStops: [{ val: 10 }, { val: 20 }] },
              { stops: [40, 50], isExcluded: true }, // Should be ignored
              { stops: [10], bonusStops: [] }
            ]
          }
        }
      }
    };
    
    // Train 1: 10+20+30 + 10+20 = 90
    // Train 2: Excluded = 0
    // Train 3: 10 = 10
    // Total = 100
    expect(getCalculatorGrandTotal(mockGameInstance, 'BNO')).toBe(100);
    
    // Test missing state
    expect(getCalculatorGrandTotal({}, 'BNO')).toBe(0);
  });
});
