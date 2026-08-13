// Validated for the dark surface below with the dataviz palette validator: all six checks pass,
// worst pair CVD dE 26.8 against a target of 8. Re-run the validator before changing any of these.
export const SURFACE = '#18181b';

// Dividends keeps one colour across every chart, because it is the same thing in each of them.
export const SERIES = {
  income: '#3987e5',
  stock: '#d95926',
  cash: '#199e70',
  shares: '#d95926'
};

// One hue per player, taken in order and never cycled. Validated against SURFACE on the adjacent
// pairlist: worst pair dE 8.4 against a target of 8. Nothing caps the player count, so a ninth
// player takes the muted ink rather than a made up hue.
const PLAYER_HUES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

export const INK = {
  secondary: '#c3c2b7',
  muted: '#898781',
  grid: '#2c2c2a',
  good: '#0ca30c',
  warning: '#fab219'
};

export const BAR_SIZE = 20;
export const SEGMENT_GAP = 2;

export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: SURFACE,
    border: `1px solid ${INK.grid}`,
    borderRadius: '8px',
    color: INK.secondary
  },
  itemStyle: { color: INK.secondary },
  labelStyle: { color: INK.secondary, fontWeight: 'bold' },
  cursor: { fill: 'rgba(255,255,255,0.04)' }
};

export const money = (value) => {
  const rounded = Math.round(value);
  return `${rounded < 0 ? '-' : ''}$${Math.abs(rounded).toLocaleString()}`;
};

export const playerColor = (index) => PLAYER_HUES[index] || INK.muted;
