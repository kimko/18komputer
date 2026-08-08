import { describe, it, expect } from 'vitest';
import { trainLabel } from './receiptLayout.js';

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
