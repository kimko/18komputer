import { describe, it, expect } from 'vitest';
import {
  getStructures,
  getStructure,
  hasStructureChoice,
  getHoldingOptions,
  canUseStructure
} from './corporateStructures.js';

const oneEightSeventeen = { corporateStructures: [0, 1, 2], maxPlayerHolding: 60 };
// 1824 names its structure rather than leaving the list empty, and lets one player hold the lot.
const eighteenTwentyFour = { corporateStructures: [0], maxPlayerHolding: 100 };

describe('getStructures', () => {
  it('maps 1817 ids to a 10, 5 and 2 share structure', () => {
    expect(getStructures(oneEightSeventeen)).toEqual([
      { name: '10 Share', totalShares: 10, holdingStep: 10, maxPlayerHolding: 60 },
      { name: '5 Share', totalShares: 5, holdingStep: 20, maxPlayerHolding: 60 },
      { name: '2 Share', totalShares: 2, holdingStep: 100, maxPlayerHolding: 100 }
    ]);
  });

  it('falls back to a single 10-share structure when the game says nothing usable', () => {
    const expected = [{ name: '10 Share', totalShares: 10, holdingStep: 10, maxPlayerHolding: 60 }];
    expect(getStructures({ corporateStructures: [], maxPlayerHolding: 60 })).toEqual(expected);
    expect(getStructures({ maxPlayerHolding: 60 })).toEqual(expected);
    expect(getStructures({ corporateStructures: [3, 4], maxPlayerHolding: 60 })).toEqual(expected);
    expect(getStructures(undefined)).toEqual(expected);
  });

  it('uses the game own maximum holding for the fallback structure', () => {
    expect(getStructures({ maxPlayerHolding: 50 })[0].maxPlayerHolding).toBe(50);
  });

  it('drops ids it does not recognise', () => {
    expect(getStructures({ corporateStructures: [0, 7] }).map(s => s.totalShares)).toEqual([10]);
  });

  it('uses the game own maximum holding for a named structure too', () => {
    expect(getStructures(eighteenTwentyFour)[0].maxPlayerHolding).toBe(100);
  });

  it('carries a whole-company title through every structure it names', () => {
    const config = { corporateStructures: [0, 1, 2], maxPlayerHolding: 100 };
    expect(getStructures(config).map(s => s.maxPlayerHolding)).toEqual([100, 100, 100]);
  });

  it('never caps a structure below a single share', () => {
    // One share of a 2-share company is the whole company, so 1817's 60% cannot apply to it.
    expect(getStructures(oneEightSeventeen)[2].maxPlayerHolding).toBe(100);
    expect(getStructures({ corporateStructures: [1], maxPlayerHolding: 10 })[0].maxPlayerHolding).toBe(20);
  });
});

describe('hasStructureChoice', () => {
  it('is true only when the game offers more than one structure', () => {
    expect(hasStructureChoice(oneEightSeventeen)).toBe(true);
    expect(hasStructureChoice({ corporateStructures: [0] })).toBe(false);
    expect(hasStructureChoice({ corporateStructures: [] })).toBe(false);
    expect(hasStructureChoice(undefined)).toBe(false);
  });
});

describe('getStructure', () => {
  it('finds the structure matching a share count', () => {
    expect(getStructure(oneEightSeventeen, 5).name).toBe('5 Share');
    expect(getStructure(oneEightSeventeen, 2).name).toBe('2 Share');
  });

  it('falls back to 10 share when the company has no share count yet', () => {
    expect(getStructure(oneEightSeventeen, undefined).totalShares).toBe(10);
  });

  it('falls back to 10 share when the game list has no matching structure', () => {
    expect(getStructure({ corporateStructures: [2] }, 10).totalShares).toBe(10);
  });
});

describe('canUseStructure', () => {
  const [tenShare, fiveShare, twoShare] = getStructures(oneEightSeventeen);

  it('allows anything while nobody holds shares', () => {
    expect(canUseStructure(tenShare, [])).toBe(true);
    expect(canUseStructure(fiveShare, [])).toBe(true);
    expect(canUseStructure(twoShare, [])).toBe(true);
  });

  it('allows a switch to 5 share when every holding is a multiple of 20', () => {
    expect(canUseStructure(tenShare, [20, 40])).toBe(true);
    expect(canUseStructure(fiveShare, [20, 40])).toBe(true);
    expect(canUseStructure(twoShare, [20, 40])).toBe(false);
  });

  it('refuses a switch that would leave somebody on 30 percent', () => {
    expect(canUseStructure(tenShare, [30])).toBe(true);
    expect(canUseStructure(fiveShare, [30])).toBe(false);
    expect(canUseStructure(twoShare, [30])).toBe(false);
  });

  it('refuses a switch away from a company somebody owns outright', () => {
    expect(canUseStructure(twoShare, [100])).toBe(true);
    expect(canUseStructure(tenShare, [100])).toBe(false);
    expect(canUseStructure(fiveShare, [100])).toBe(false);
  });

  it('allows 60 and 40 on both the 10 and 5 share structures', () => {
    expect(canUseStructure(tenShare, [60, 40])).toBe(true);
    expect(canUseStructure(fiveShare, [60, 40])).toBe(true);
    expect(canUseStructure(twoShare, [60, 40])).toBe(false);
  });

  it('allows one player the whole company where the title does', () => {
    expect(canUseStructure(getStructures(eighteenTwentyFour)[0], [100])).toBe(true);
    expect(canUseStructure(tenShare, [100])).toBe(false);
  });
});

describe('getHoldingOptions', () => {
  const [tenShare, fiveShare, twoShare] = getStructures(oneEightSeventeen);

  it('offers tens up to 60 percent on a 10-share company', () => {
    expect(getHoldingOptions(tenShare, 100)).toEqual([0, 10, 20, 30, 40, 50, 60]);
  });

  it('offers twenties up to 60 percent on a 5-share company', () => {
    expect(getHoldingOptions(fiveShare, 100)).toEqual([0, 20, 40, 60]);
  });

  it('is all or nothing on a 2-share company', () => {
    expect(getHoldingOptions(twoShare, 100)).toEqual([0, 100]);
  });

  it('offers only zero on a 2-share company somebody else already owns outright', () => {
    expect(getHoldingOptions(twoShare, 0)).toEqual([0]);
  });

  it('stops at what the bank has left', () => {
    expect(getHoldingOptions(tenShare, 30)).toEqual([0, 10, 20, 30]);
    expect(getHoldingOptions(fiveShare, 20)).toEqual([0, 20]);
  });

  it('offers only zero when the bank has nothing left', () => {
    expect(getHoldingOptions(tenShare, 0)).toEqual([0]);
  });

  describe('on a title that lets one player hold the whole company', () => {
    const [tenShareOf1824] = getStructures(eighteenTwentyFour);

    it('offers tens all the way to 100 percent', () => {
      expect(getHoldingOptions(tenShareOf1824, 100)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    });

    it('still stops at what the bank has left', () => {
      expect(getHoldingOptions(tenShareOf1824, 40)).toEqual([0, 10, 20, 30, 40]);
    });
  });
});
