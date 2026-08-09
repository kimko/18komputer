import { describe, it, expect } from 'vitest';
import { calculatePayout, SHARE_COUNTS } from './payoutMath.js';

describe('calculatePayout', () => {
  describe('a $190 run', () => {
    it('pays $19 per share on a 10-share company at full pay', () => {
      expect(calculatePayout(190, 10, false)).toEqual({
        perShare: 19,
        distributed: 190,
        companyKeeps: 0
      });
    });

    it('rounds up to $10 per share on a 10-share company at half pay', () => {
      expect(calculatePayout(190, 10, true)).toEqual({
        perShare: 10,
        distributed: 100,
        companyKeeps: 90
      });
    });

    it('pays $38 per share on a 5-share company at full pay', () => {
      expect(calculatePayout(190, 5, false)).toEqual({
        perShare: 38,
        distributed: 190,
        companyKeeps: 0
      });
    });

    it('divides evenly to $19 per share on a 5-share company at half pay', () => {
      expect(calculatePayout(190, 5, true)).toEqual({
        perShare: 19,
        distributed: 95,
        companyKeeps: 95
      });
    });
  });

  it('halves cleanly when the revenue divides evenly', () => {
    expect(calculatePayout(100, 10, false).perShare).toBe(10);
    expect(calculatePayout(100, 10, true).perShare).toBe(5);
  });

  it('pays nothing on a zero run', () => {
    expect(calculatePayout(0, 10, false)).toEqual({ perShare: 0, distributed: 0, companyKeeps: 0 });
    expect(calculatePayout(0, 5, true)).toEqual({ perShare: 0, distributed: 0, companyKeeps: 0 });
  });

  it('defaults to a 10-share company at full pay', () => {
    expect(calculatePayout(190)).toEqual(calculatePayout(190, 10, false));
    expect(calculatePayout(190, 0, false)).toEqual(calculatePayout(190, 10, false));
  });

  it('never leaves the company owing money', () => {
    for (let revenue = 0; revenue <= 2000; revenue += 10) {
      for (const shares of SHARE_COUNTS) {
        for (const isHalfPay of [false, true]) {
          expect(calculatePayout(revenue, shares, isHalfPay).companyKeeps).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('offers 10-share and 5-share companies', () => {
    expect(SHARE_COUNTS).toEqual([10, 5]);
  });
});
