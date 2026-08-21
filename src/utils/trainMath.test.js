import { describe, it, expect } from 'vitest';
import {
  bonusKey,
  bonusValue,
  toBonusEntry,
  trainStopsTotal,
  trainBonusTotal,
  trainRevenue,
  trainsRevenue,
  bonusesLeft
} from './trainMath.js';

const plus = { label: '+', adds: [20], maxPerTrain: 1 };
const offboard = { label: 'offboard', adds: [100], maxPerTrain: 1 };
const doubler = { label: '2x', doubles: 'highestStop', maxPerTrain: 1 };
const bridge = { label: 'Bridge', adds: [10] };

describe('bonusKey', () => {
  it('is the first letter of a long label, which is what a saved entry carries', () => {
    expect(bonusKey(offboard)).toBe('o');
    expect(bonusKey(bridge)).toBe('B');
  });

  it('keeps a label that is already short, so 2x does not become a bare 2', () => {
    expect(bonusKey(plus)).toBe('+');
    expect(bonusKey(doubler)).toBe('2x');
  });

  it('copes with a bonus that has no label at all', () => {
    expect(bonusKey({})).toBe('');
    expect(bonusKey(undefined)).toBe('');
  });
});

describe('bonusValue', () => {
  it('reads the amount written into a fixed bonus', () => {
    expect(bonusValue({ val: 20, label: '+' })).toBe(20);
    expect(bonusValue({ val: 100, label: 'o' }, [30, 40])).toBe(100);
  });

  it('is worth the best stop on the train for a doubling bonus', () => {
    expect(bonusValue({ label: '2', doubles: 'highestStop' }, [30, 60, 40])).toBe(60);
  });

  it('is worth nothing while a doubling bonus has no stop to double', () => {
    expect(bonusValue({ label: '2', doubles: 'highestStop' }, [])).toBe(0);
  });

  it('ignores whatever amount a doubling entry happens to carry', () => {
    expect(bonusValue({ val: 999, label: '2', doubles: 'highestStop' }, [30])).toBe(30);
  });

  it('treats a missing or unreadable amount as nothing', () => {
    expect(bonusValue({ label: '+' })).toBe(0);
    expect(bonusValue(undefined)).toBe(0);
  });
});

describe('toBonusEntry', () => {
  it('writes the amount and the bonus letter', () => {
    expect(toBonusEntry(plus, 20)).toEqual({ val: 20, label: '+' });
  });

  it('carries the doubling rule so the entry can be revalued later', () => {
    expect(toBonusEntry(doubler, 0)).toEqual({ val: 0, label: '2x', doubles: 'highestStop' });
  });
});

describe('train totals', () => {
  const train = { stops: [30, 60, 40], bonusStops: [{ val: 20, label: '+' }] };

  it('adds the stops on their own', () => {
    expect(trainStopsTotal(train)).toBe(130);
  });

  it('adds the bonuses on their own', () => {
    expect(trainBonusTotal(train)).toBe(20);
  });

  it('doubles the best stop through the train total', () => {
    const doubled = { stops: [30, 60, 40], bonusStops: [{ label: '2', doubles: 'highestStop' }] };
    expect(trainRevenue(doubled)).toBe(190);
  });

  it('revalues a doubling bonus when the best stop changes', () => {
    const bonusStops = [{ label: '2', doubles: 'highestStop' }];
    expect(trainRevenue({ stops: [30], bonusStops })).toBe(60);
    expect(trainRevenue({ stops: [30, 80], bonusStops })).toBe(190);
  });

  it('adds stops and bonuses together', () => {
    expect(trainRevenue(train)).toBe(150);
  });

  it('copes with an empty or missing train', () => {
    expect(trainRevenue({})).toBe(0);
    expect(trainRevenue(undefined)).toBe(0);
  });
});

describe('trainsRevenue', () => {
  it('adds every train that is not excluded', () => {
    expect(trainsRevenue([
      { stops: [30, 40] },
      { stops: [50], bonusStops: [{ val: 20, label: '+' }] }
    ])).toBe(140);
  });

  it('leaves out an excluded train', () => {
    expect(trainsRevenue([
      { stops: [30, 40] },
      { stops: [1000], isExcluded: true }
    ])).toBe(70);
  });

  it('is nothing when there are no trains', () => {
    expect(trainsRevenue([])).toBe(0);
    expect(trainsRevenue()).toBe(0);
  });
});

describe('bonusesLeft', () => {
  it('is unlimited when the title sets no cap', () => {
    expect(bonusesLeft(bridge, { bonusStops: [{ val: 10, label: 'B' }] })).toBe(Infinity);
  });

  it('counts down as the bonus is claimed', () => {
    expect(bonusesLeft(plus, { bonusStops: [] })).toBe(1);
    expect(bonusesLeft(plus, { bonusStops: [{ val: 20, label: '+' }] })).toBe(0);
  });

  it('counts each bonus separately', () => {
    const train = { bonusStops: [{ val: 20, label: '+' }] };
    expect(bonusesLeft(plus, train)).toBe(0);
    expect(bonusesLeft(offboard, train)).toBe(1);
  });

  it('never goes below zero on a game saved before the cap existed', () => {
    const train = { bonusStops: [{ val: 20, label: '+' }, { val: 20, label: '+' }] };
    expect(bonusesLeft(plus, train)).toBe(0);
  });
});
