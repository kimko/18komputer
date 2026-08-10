import { describe, it, expect } from 'vitest';
import { trainLabel, shareLabel, payoutLabel, toReceiptTrain } from './receiptLayout.js';

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

  it('still marks the bonus when nothing counted against the train limit', () => {
    expect(trainLabel({ stopCount: 0, hasBonus: true }, 0)).toBe('0s+');
  });
});

describe('toReceiptTrain', () => {
  const withBonuses = {
    stops: [10, 20, 30],
    bonusStops: [{ val: 10, label: 'C' }, { val: 10, label: 'C' }]
  };

  it('counts only the stops that fill the train, not the bonuses', () => {
    expect(toReceiptTrain(withBonuses).stopCount).toBe(3);
  });

  it('labels that train 3s+, since three stops filled it and a bonus was collected', () => {
    expect(trainLabel(toReceiptTrain(withBonuses), 0)).toBe('3s+');
  });

  it('still writes every stop and bonus into the route', () => {
    expect(toReceiptTrain(withBonuses).route).toBe('10+20+30+10(C)+10(C)');
  });

  it('adds the bonuses into the revenue even though they do not count as stops', () => {
    expect(toReceiptTrain(withBonuses).revenue).toBe(80);
  });

  it('says a train collected no bonus when it did not', () => {
    const plain = toReceiptTrain({ stops: [40, 40, 50, 50] });
    expect(plain.hasBonus).toBe(false);
    expect(trainLabel(plain, 0)).toBe('4s');
  });

  it('handles a run of nothing at all', () => {
    const empty = toReceiptTrain({ stops: [] });
    expect(empty).toMatchObject({ route: '0', revenue: 0, stopCount: 0, hasBonus: false });
    expect(trainLabel(empty, 0)).toBe('T1');
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
