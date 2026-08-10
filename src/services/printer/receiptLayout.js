export const COLS = 32;

// NFD does not decompose these, so they need spelling out before the ASCII filter.
const TRANSLITERATIONS = {
  ß: 'ss', Æ: 'AE', æ: 'ae', Œ: 'OE', œ: 'oe', Ø: 'O', ø: 'o',
  Ð: 'D', ð: 'd', Đ: 'D', đ: 'd', Þ: 'TH', þ: 'th', Ł: 'L', ł: 'l',
  İ: 'I', ı: 'i', '–': '-', '—': '-', '‘': "'", '’': "'", '“': '"', '”': '"', '…': '...',
};

export function sanitizeAscii(text) {
  if (!text) return '';
  return String(text)
    .replace(/[ßÆæŒœØøÐðĐđÞþŁłİı–—‘’“”…]/g, (ch) => TRANSLITERATIONS[ch])
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '?');
}

export function centerText(text, cols = COLS) {
  const pad = Math.floor((cols - text.length) / 2);
  return pad > 0 ? ' '.repeat(pad) + text : text;
}

export function rightAlign(text, cols = COLS) {
  return text.length >= cols ? text : ' '.repeat(cols - text.length) + text;
}

export function spreadLine(left, right, cols = COLS) {
  const gap = cols - left.length - right.length;
  if (gap < 1) return [left, rightAlign(right, cols)];
  return [left + ' '.repeat(gap) + right];
}

export function shareLabel(totalShares) {
  return `${totalShares || 10}-SHARE`;
}

export function payoutLabel(isHalfPay) {
  return isHalfPay ? 'HALF PAY' : 'FULL PAY';
}

export function trainLabel(train, index) {
  const stopCount = train.stopCount || 0;
  if (stopCount === 0) return `T${index + 1}`;
  return train.hasBonus ? `${stopCount}s+` : `${stopCount}s`;
}
