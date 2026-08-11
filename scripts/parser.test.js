import { describe, it, expect } from 'vitest';
import { parseGameFile } from './parse-games.js';

describe('Game Data Parser', () => {
  it('should extract simple primitive values', () => {
    const mockContent = `
Name: '1817: Modern Trains'
bggId: 12345
max or: 3
`;
    const result = parseGameFile(mockContent);
    expect(result.name).toBe('1817: Modern Trains');
    expect(result.bggId).toBe(12345);
    expect(result.maxOr).toBe(3);
  });

  describe('the payout rule', () => {
    const payout = (line) => parseGameFile(`\nName: 'x'\n${line}\n`).allowsHalfPay;

    it('gives a Partial title the half pay rule', () => {
      expect(payout('payout: PayoutOption.Partial')).toBe(true);
    });

    it('gives a Custom title the half pay rule, since the source does not say otherwise', () => {
      expect(payout('payout: PayoutOption.Custom')).toBe(true);
    });

    it('leaves a Full title without the half pay rule', () => {
      expect(payout('payout: PayoutOption.Full')).toBeUndefined();
    });

    it('leaves a title with no payout line without the half pay rule', () => {
      expect(payout('max or: 3')).toBeUndefined();
    });
  });

  it('should parse arrays of numbers', () => {
    const mockContent = `
revenue stops: [10, 20, 30]
par values: [67, 71, 76]
`;
    const result = parseGameFile(mockContent);
    expect(result.revenueStops).toEqual([10, 20, 30]);
    expect(result.parValues).toEqual([67, 71, 76]);
  });

  it('should ignore nulls in arrays', () => {
    const mockContent = `
corporate structures: [0, null, 1, , 2, ]
`;
    const result = parseGameFile(mockContent);
    // Based on "corporate structures: [0, , 1, , 2, ]" from 1817.txt
    // We expect it to parse the valid numbers and ignore empty commas or nulls.
    expect(result.corporateStructures).toEqual([0, 1, 2]);
  });

  it('should parse nested company blocks', () => {
    const mockContent = `
companies:
\t name: 'Union Railroad'
\t short name: 'UR'
\t color: Color(alpha: 1.0000, red: 0.5, green: 0.5, blue: 0.5, colorSpace: ColorSpace.sRGB)

\t name: 'Strasburg Railroad'
\t short name: 'SR'
\t color: Color(alpha: 1.0000, red: 1.0, green: 0.0, blue: 0.0, colorSpace: ColorSpace.sRGB)
`;
    const result = parseGameFile(mockContent);
    expect(result.companies).toHaveLength(2);
    expect(result.companies[0]).toEqual({
      name: 'Union Railroad',
      shortName: 'UR',
      color: '#808080' // Math.round(0.5 * 255) = 128 = 80
    });
    expect(result.companies[1]).toEqual({
      name: 'Strasburg Railroad',
      shortName: 'SR',
      color: '#ff0000'
    });
  });

  it('should parse revenue bonuses', () => {
    const mockContent = `
revenue bonuses:
\t label: 'Bridge'
\t adds: [10]

\t label: 'Coal'
\t adds: [20]
`;
    const result = parseGameFile(mockContent);
    expect(result.revenueBonuses).toHaveLength(2);
    expect(result.revenueBonuses[0]).toEqual({ label: 'Bridge', adds: [10] });
    expect(result.revenueBonuses[1]).toEqual({ label: 'Coal', adds: [20] });
  });
});
