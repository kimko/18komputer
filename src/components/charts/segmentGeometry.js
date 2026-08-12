import { SEGMENT_GAP } from './chartTheme.js';

// Rounds only the end the data grew to, leaving the end that sits on the zero baseline square.
function endCapPath(x, y, width, height, side) {
  const r = Math.min(4, width, height / 2);
  if (width <= 0) return '';
  if (r <= 0 || side === 'none') return `M${x},${y} H${x + width} V${y + height} H${x} Z`;

  if (side === 'right') {
    return `M${x},${y} H${x + width - r} A${r},${r} 0 0 1 ${x + width},${y + r}`
      + ` V${y + height - r} A${r},${r} 0 0 1 ${x + width - r},${y + height} H${x} Z`;
  }
  return `M${x + r},${y} H${x + width} V${y + height} H${x + r}`
    + ` A${r},${r} 0 0 1 ${x},${y + height - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
}

// The gap is cut out of the fill itself, so nothing is drawn around a mark to separate it.
export function segmentPath({ x, y, width, height, side, gapSide }) {
  // A bar growing left of zero arrives with a negative width anchored at the baseline.
  const span = Math.abs(width);
  const origin = width < 0 ? x + width : x;

  const left = gapSide === 'left' ? origin + SEGMENT_GAP : origin;
  const drawn = Math.max(0, span - (gapSide ? SEGMENT_GAP : 0));
  return endCapPath(left, y, drawn, height, side);
}
