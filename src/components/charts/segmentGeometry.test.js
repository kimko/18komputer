import { describe, it, expect } from 'vitest';
import { segmentPath } from './segmentGeometry.js';

const box = { y: 0, height: 20 };

// Reads the horizontal coordinates out of a path so the tests talk about where the mark sits.
const xsOf = (path) => {
  const xs = [];
  const move = path.match(/M(-?[\d.]+),/);
  if (move) xs.push(Number(move[1]));
  [...path.matchAll(/H(-?[\d.]+)/g)].forEach((match) => xs.push(Number(match[1])));
  [...path.matchAll(/A[\d.,]+ \d \d \d (-?[\d.]+),/g)].forEach((match) => xs.push(Number(match[1])));
  return xs;
};

describe('segmentPath', () => {
  it('draws a bar that grows right from the baseline', () => {
    const path = segmentPath({ ...box, x: 100, width: 60, side: 'right' });
    const xs = xsOf(path);

    expect(Math.min(...xs)).toBe(100);
    expect(Math.max(...xs)).toBeCloseTo(160, 0);
  });

  // Recharts anchors a leftward bar at the baseline and hands back a negative width.
  it('draws a bar that grows left from the baseline, given a negative width', () => {
    const path = segmentPath({ ...box, x: 100, width: -60, side: 'left' });
    const xs = xsOf(path);

    expect(path).not.toBe('');
    expect(Math.min(...xs)).toBeCloseTo(40, 0);
    expect(Math.max(...xs)).toBe(100);
  });

  it('takes the gap out of the side that touches its neighbour', () => {
    const right = xsOf(segmentPath({ ...box, x: 100, width: 60, side: 'none', gapSide: 'right' }));
    expect(Math.max(...right)).toBe(158);

    const left = xsOf(segmentPath({ ...box, x: 100, width: -60, side: 'left', gapSide: 'right' }));
    expect(Math.max(...left)).toBe(98);
    expect(Math.min(...left)).toBeCloseTo(40, 0);
  });

  it('rounds the end the data grew to and leaves the baseline end square', () => {
    expect(segmentPath({ ...box, x: 0, width: 60, side: 'right' })).toContain('A4,4');
    expect(segmentPath({ ...box, x: 0, width: 60, side: 'none' })).not.toContain('A4,4');
  });

  it('draws nothing for a segment with no width', () => {
    expect(segmentPath({ ...box, x: 100, width: 0, side: 'right' })).toBe('');
  });
});
