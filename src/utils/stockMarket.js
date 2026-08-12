const PAR_LETTERS = new Set(['p', 'P', 'x', 'z', 'w']);
const ZONE_LETTERS = new Set(['y', 'o', 'b']);

export const parseCell = (code) => {
  if (code === undefined || code === null || code === '') return null;
  const match = String(code).match(/^(\d+)([a-zA-Z]*)$/);
  if (!match) return null;
  const letters = match[2].split('');
  return {
    price: Number(match[1]),
    isPar: letters.some((letter) => PAR_LETTERS.has(letter)),
    zone: letters.find((letter) => ZONE_LETTERS.has(letter)) || null
  };
};

export const cellAt = (grid, position) => {
  const [row, col] = position || [];
  if (!(row >= 0) || !(col >= 0)) return null;
  return parseCell(grid?.[row]?.[col]);
};

const rowLength = (grid, row) => grid[row]?.length || 0;

const stepTwoD = (grid, position, direction) => {
  const [row, col] = position;
  switch (direction) {
    case 'up':
      return row > 0 ? [row - 1, col] : position;
    case 'down':
      return row + 1 < grid.length ? [row + 1, col] : position;
    case 'left':
      return col > 0 && cellAt(grid, [row, col - 1])
        ? [row, col - 1]
        : stepTwoD(grid, position, 'down');
    case 'right':
      return col + 1 < rowLength(grid, row)
        ? [row, col + 1]
        : stepTwoD(grid, position, 'up');
    default:
      return position;
  }
};

const stepOneD = (grid, position, direction) => {
  const [row, col] = position;
  if (direction === 'right' || direction === 'up') {
    return col + 1 < rowLength(grid, row) ? [row, col + 1] : position;
  }
  if (direction === 'left' || direction === 'down') {
    return col > 0 ? [row, col - 1] : position;
  }
  return position;
};

// A step may land on a blank cell or past the end of a shorter row, and that is what a ledge is.
export const move = (market, position, direction) => {
  const grid = market?.grid;
  if (!grid || !position) return position;
  const next = (market.type === '2d' ? stepTwoD : stepOneD)(grid, position, direction);
  return cellAt(grid, next) ? next : position;
};

export const canMove = (market, position, direction) => {
  if (!market?.grid || !position) return false;
  const [row, col] = move(market, position, direction);
  return row !== position[0] || col !== position[1];
};

export const findStartCell = (market, parValue, currentValue) => {
  const grid = market?.grid;
  if (!grid) return null;

  const target = Number(currentValue ?? parValue);
  if (!Number.isFinite(target)) return null;

  const matches = [];
  grid.forEach((cells, row) => {
    cells.forEach((code, col) => {
      const cell = parseCell(code);
      if (cell?.price === target) matches.push({ position: [row, col], isPar: cell.isPar });
    });
  });
  if (!matches.length) return null;

  const parMatch = target === Number(parValue) && matches.find((match) => match.isPar);
  return (parMatch || matches[0]).position;
};
