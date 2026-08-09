import { describe, it, expect } from 'vitest';
import { trainLabel, shareLabel, payoutLabel } from './receiptLayout.js';

describe('trainLabel', () => {
  it('reports the stop count', () => {
    expect(trainLabel({ stopCount: 4, hasBonus: false }, 0)).toBe('4s');
  });

  it('marks a train that collected a bonus', () => {
    expect(trainLabel({ stopCount: 3, hasBonus: true }, 0)).toBe('3s+');
  });

  it('falls back to the train position when there are no stops', () => {
    expect(trainLabel({ stopCount: 0 }, 0)).toBe('T1');
    expect(trainLabel({}, 2)).toBe('T3');
  });
});

describe('shareLabel', () => {
  it('names the company type', () => {
    expect(shareLabel(10)).toBe('10-SHARE');
    expect(shareLabel(5)).toBe('5-SHARE');
  });

  it('assumes ten shares when the receipt carries no setting', () => {
    expect(shareLabel(undefined)).toBe('10-SHARE');
    expect(shareLabel(0)).toBe('10-SHARE');
  });
});

describe('payoutLabel', () => {
  it('names the pay mode', () => {
    expect(payoutLabel(true)).toBe('HALF PAY');
    expect(payoutLabel(false)).toBe('FULL PAY');
  });

  it('assumes full pay when the receipt carries no setting', () => {
    expect(payoutLabel(undefined)).toBe('FULL PAY');
  });
});
