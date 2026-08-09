import { trainLabel, shareLabel, payoutLabel } from './receiptLayout.js';
import { calculatePayout } from '../../utils/payoutMath.js';

export const COLS = 32;

const LABEL_W = 5;
const MONEY_W = 5;
const MIN_ROUTE_W = 8;

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

export function wrapRoute(route, width) {
  const lines = [];
  let current = '';

  for (let token of String(route).split('+')) {
    const candidate = current === '' ? token : `${current}+${token}`;

    if (candidate.length <= width) {
      current = candidate;
    } else if (current === '') {
      while (token.length > width) {
        lines.push(token.slice(0, width));
        token = token.slice(width);
      }
      current = token;
    } else if (current.length + 1 <= width) {
      lines.push(`${current}+`);
      current = token;
    } else {
      lines.push(current);
      current = `+${token}`;
    }
  }

  lines.push(current);
  return lines;
}

const wrapWords = (text, cols) => {
  const lines = [];
  let current = '';
  for (const word of text.split(' ')) {
    const candidate = current === '' ? word : `${current} ${word}`;
    if (candidate.length <= cols) {
      current = candidate;
    } else {
      if (current !== '') lines.push(current);
      current = word;
    }
  }
  if (current !== '') lines.push(current);
  return lines;
};

export function headerLines(fullName, shortName) {
  const normalize = (value) => sanitizeAscii(value).toUpperCase().replace(/\s+/g, ' ').trim();
  const name = normalize(fullName) || normalize(shortName);
  if (!name) return [centerText('COMPANY')];

  const wrapped = wrapWords(name, COLS);
  if (wrapped.length <= 2 && wrapped.every((line) => line.length <= COLS)) {
    return wrapped.map((line) => centerText(line));
  }

  return [centerText(normalize(shortName) || wrapped[0].slice(0, COLS))];
}

export function splitReceipt(receiptData = {}) {
  const trains = receiptData.trains || [];
  const total = receiptData.totalRevenue || 0;
  const separator = '-'.repeat(COLS);

  const header = headerLines(receiptData.companyName, receiptData.company);
  const body = [{ text: separator, bold: false }];

  if (trains.length === 0) {
    body.push({ text: centerText('(no routes)'), bold: false });
  } else {
    trains.forEach((train, index) => {
      const prefix =
        trainLabel(train, index).padEnd(LABEL_W) +
        `$${train.revenue || 0}`.padEnd(MONEY_W) +
        ' ';
      const routeWidth = Math.max(MIN_ROUTE_W, COLS - prefix.length);

      wrapRoute(train.route || '0', routeWidth).forEach((routeLine, routeIndex) => {
        const indent = routeIndex === 0 ? prefix : ' '.repeat(prefix.length);
        body.push({ text: indent + routeLine, bold: false });
      });
    });
  }

  body.push({ text: separator, bold: false });
  spreadLine('TOTAL', `$${total}`).forEach((text) => body.push({ text, bold: true }));

  const { perShare, companyKeeps } = calculatePayout(total, receiptData.totalShares, receiptData.isHalfPay);
  const push = (text) => body.push({ text, bold: false });
  spreadLine(shareLabel(receiptData.totalShares), payoutLabel(receiptData.isHalfPay)).forEach(push);
  spreadLine('PER SHARE', `$${perShare}`).forEach(push);
  spreadLine('TREASURY', `$${companyKeeps}`).forEach(push);

  if (trains.length > 0) {
    const count = `${trains.length} train${trains.length === 1 ? '' : 's'}`;
    body.push({ text: centerText(count), bold: false });
  }

  return { header, body };
}

export function formatReceiptLines(receiptData = {}) {
  const { header, body } = splitReceipt(receiptData);
  return [...header, ...body.map((line) => line.text)];
}

export const PT210_STYLE = { useCharTable: true, useDoubleHeightHeader: true };

const ESC_INIT = [0x1b, 0x40];
const ESC_CHARSET_PC437 = [0x1b, 0x74, 0x00];
const ESC_ALIGN_LEFT = [0x1b, 0x61, 0x00];
const ESC_BOLD_ON = [0x1b, 0x45, 0x01];
const ESC_BOLD_OFF = [0x1b, 0x45, 0x00];
const GS_SIZE_DBL_HEIGHT = [0x1d, 0x21, 0x01];
const GS_SIZE_NORMAL = [0x1d, 0x21, 0x00];
const LF = [0x0a];
const ESC_FEED_LINES = (n) => [0x1b, 0x64, n & 0xff];

const FEED_LINES = 5;

export const generatePt210Payload = async (receiptData = {}) => {
  const { header, body } = splitReceipt(receiptData);
  const bytes = [];
  const push = (...sequences) => sequences.forEach((sequence) => bytes.push(...sequence));
  const pushLine = (text) => {
    for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i) & 0x7f);
    push(LF);
  };

  push(ESC_INIT);
  if (PT210_STYLE.useCharTable) push(ESC_CHARSET_PC437);
  push(ESC_ALIGN_LEFT, ESC_BOLD_ON);
  if (PT210_STYLE.useDoubleHeightHeader) push(GS_SIZE_DBL_HEIGHT);
  header.forEach(pushLine);
  if (PT210_STYLE.useDoubleHeightHeader) push(GS_SIZE_NORMAL);
  push(ESC_BOLD_OFF);

  body.forEach(({ text, bold }) => {
    if (bold) push(ESC_BOLD_ON);
    pushLine(text);
    if (bold) push(ESC_BOLD_OFF);
  });

  push(ESC_FEED_LINES(FEED_LINES));
  return [new Uint8Array(bytes)];
};
