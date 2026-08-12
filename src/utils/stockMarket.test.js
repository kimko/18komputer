import { describe, it, expect } from 'vitest';
import { parseCell, cellAt, move, canMove, findStartCell } from './stockMarket';
import game1830 from '../data/games/1830.json';

// A miniature 1830: a ragged grid whose lower rows are shorter and start blank.
const twoD = {
  type: '2d',
  grid: [
    ['60y', '67', '71', '76p'],
    ['53y', '60y', '66', '70'],
    ['', '40o', '50y'],
    ['', '20b', '30b']
  ]
};

const oneD = { type: '1d', grid: [['40', '45', '50p', '55']] };

describe('parseCell', () => {
  it('reads the price off a plain cell', () => {
    expect(parseCell('67')).toEqual({ price: 67, isPar: false, zone: null });
  });

  it('reads a par square', () => {
    expect(parseCell('76p')).toEqual({ price: 76, isPar: true, zone: null });
  });

  it('reads a colour zone', () => {
    expect(parseCell('40o')).toEqual({ price: 40, isPar: false, zone: 'o' });
  });

  it('treats a blank as no cell at all', () => {
    expect(parseCell('')).toBeNull();
    expect(parseCell(undefined)).toBeNull();
  });
});

describe('cellAt', () => {
  it('finds a cell', () => {
    expect(cellAt(twoD.grid, [1, 2])).toEqual({ price: 66, isPar: false, zone: null });
  });

  it('returns nothing for a blank cell, a short row, or a missing row', () => {
    expect(cellAt(twoD.grid, [2, 0])).toBeNull();
    expect(cellAt(twoD.grid, [2, 3])).toBeNull();
    expect(cellAt(twoD.grid, [4, 0])).toBeNull();
  });

  // Negative indexes count from the end in Ruby, so a direct port of the reference would wrap here.
  it('returns nothing for a negative position', () => {
    expect(cellAt(twoD.grid, [-1, 0])).toBeNull();
    expect(cellAt(twoD.grid, [0, -1])).toBeNull();
  });
});

describe('move on a two dimensional market', () => {
  it('moves right along a row', () => {
    expect(move(twoD, [1, 0], 'right')).toEqual([1, 1]);
  });

  it('moves up instead when there is no more room on the right', () => {
    expect(move(twoD, [1, 3], 'right')).toEqual([0, 3]);
  });

  it('does nothing moving right from the top right corner', () => {
    expect(move(twoD, [0, 3], 'right')).toEqual([0, 3]);
  });

  it('moves up a row', () => {
    expect(move(twoD, [1, 1], 'up')).toEqual([0, 1]);
  });

  it('does nothing moving up from the top row', () => {
    expect(move(twoD, [0, 1], 'up')).toEqual([0, 1]);
  });

  it('moves down a row', () => {
    expect(move(twoD, [0, 1], 'down')).toEqual([1, 1]);
  });

  it('moves left along a row', () => {
    expect(move(twoD, [1, 1], 'left')).toEqual([1, 0]);
  });

  it('moves down instead when it is already at the left edge', () => {
    expect(move(twoD, [0, 0], 'left')).toEqual([1, 0]);
  });

  it('moves down instead when the cell to the left is blank', () => {
    expect(move(twoD, [2, 1], 'left')).toEqual([3, 1]);
  });

  describe('the ledge', () => {
    it('stops a downward move where the row below is too short', () => {
      expect(move(twoD, [1, 3], 'down')).toEqual([1, 3]);
    });

    it('stops a downward move off the bottom row', () => {
      expect(move(twoD, [3, 1], 'down')).toEqual([3, 1]);
    });
  });
});

describe('move on a one dimensional market', () => {
  it('steps left and right', () => {
    expect(move(oneD, [0, 1], 'right')).toEqual([0, 2]);
    expect(move(oneD, [0, 1], 'left')).toEqual([0, 0]);
  });

  it('stops at both ends', () => {
    expect(move(oneD, [0, 3], 'right')).toEqual([0, 3]);
    expect(move(oneD, [0, 0], 'left')).toEqual([0, 0]);
  });
});

describe('canMove', () => {
  it('is false only where the press would change nothing', () => {
    expect(canMove(twoD, [1, 3], 'down')).toBe(false);
    expect(canMove(twoD, [0, 1], 'up')).toBe(false);
    expect(canMove(twoD, [1, 3], 'right')).toBe(true);
    expect(canMove(twoD, [0, 0], 'left')).toBe(true);
  });
});

describe('the real 1830 market', () => {
  const market = game1830.stockMarket;

  it('is two dimensional with the staircase intact', () => {
    expect(market.type).toBe('2d');
    expect(market.grid[0]).toHaveLength(19);
    expect(market.grid[10]).toEqual(['', '', '', '10b', '20b', '30b', '40o']);
  });

  it('starts a company on the par square it was floated at', () => {
    expect(findStartCell(market, 100, 100)).toEqual([0, 6]);
    expect(findStartCell(market, 67, 67)).toEqual([5, 6]);
  });

  it('runs off the end of a row into the row above', () => {
    expect(move(market, [1, 18], 'right')).toEqual([0, 18]);
  });

  it('holds at 350, the top of the market', () => {
    expect(move(market, [0, 18], 'right')).toEqual([0, 18]);
    expect(move(market, [0, 18], 'up')).toEqual([0, 18]);
  });

  // 68 sits above the short bottom row, so a company there cannot be driven down any further.
  it('holds at the ledge under 68', () => {
    expect(cellAt(market.grid, [7, 7])).toEqual({ price: 68, isPar: false, zone: null });
    expect(move(market, [7, 7], 'down')).toEqual([7, 7]);
    expect(canMove(market, [7, 7], 'down')).toBe(false);
  });

  it('turns left into down along the bottom left staircase', () => {
    expect(move(market, [7, 0], 'left')).toEqual([7, 0]);
    expect(move(market, [6, 0], 'left')).toEqual([7, 0]);
  });
});

describe('findStartCell', () => {
  it('prefers the par square matching the par value', () => {
    expect(findStartCell(twoD, 76, 76)).toEqual([0, 3]);
  });

  it('falls back to the first cell holding the current price', () => {
    expect(findStartCell(twoD, 76, 60)).toEqual([0, 0]);
  });

  it('returns nothing when neither value is on the grid', () => {
    expect(findStartCell(twoD, 999, 998)).toBeNull();
  });
});
