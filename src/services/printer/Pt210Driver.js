import {
  trainLabel,
  shareLabel,
  payoutLabel,
  COLS,
  sanitizeAscii,
  centerText,
  rightAlign,
  spreadLine,
} from './receiptLayout.js';
import { calculatePayout } from '../../utils/payoutMath.js';
import { buildResultsReceipt } from './resultsLayout.js';
import { buildQrRaster } from './qrRaster.js';

export { COLS, sanitizeAscii, centerText, rightAlign, spreadLine };

const LABEL_W = 5;
const MONEY_W = 5;
const MIN_ROUTE_W = 8;

const PCT_W = 4;
const CELL_MONEY_W = 7;
const CELL_GAP = '  ';
const SINGLE_COLUMN_MAX = 5;

export function payoutTableLines(perShare, totalShares = 10, cols = COLS) {
  const shares = totalShares || 10;
  if (!perShare || shares === 2) return [];

  const cells = [];
  for (let held = 1; held <= shares; held++) {
    const pct = `${held * (100 / shares)}%`.padStart(PCT_W);
    cells.push(pct + `$${perShare * held}`.padStart(CELL_MONEY_W));
  }

  if (shares <= SINGLE_COLUMN_MAX) return cells.map((cell) => centerText(cell, cols));

  const rows = Math.ceil(shares / 2);
  const lines = [];
  for (let i = 0; i < rows; i++) {
    const right = cells[i + rows];
    lines.push(centerText(right ? cells[i] + CELL_GAP + right : cells[i], cols));
  }
  return lines;
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
  const shortName = sanitizeAscii(receiptData.company).toUpperCase().replace(/\s+/g, ' ').trim();
  const body = [];

  if (shortName && !header.some((line) => line.trim() === shortName)) {
    body.push({ text: centerText(shortName), bold: false });
  }
  body.push({ text: separator, bold: false });

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
        body.push({ text: indent + routeLine, bold: false, big: true });
      });
    });
  }

  body.push({ text: separator, bold: false });
  spreadLine('TOTAL', `$${total}`).forEach((text) => body.push({ text, bold: true, big: true }));

  const { perShare, companyKeeps } = calculatePayout(total, receiptData.totalShares, receiptData.isHalfPay);
  const push = (text) => body.push({ text, bold: false });
  spreadLine(shareLabel(receiptData.totalShares), payoutLabel(receiptData.isHalfPay)).forEach(push);
  spreadLine('TREASURY', `$${companyKeeps}`).forEach(push);

  if (trains.length > 0) {
    const count = `${trains.length} train${trains.length === 1 ? '' : 's'}`;
    body.push({ text: centerText(count), bold: false });
  }

  const payoutTable = payoutTableLines(perShare, receiptData.totalShares);
  if (payoutTable.length > 0) {
    push('');
    payoutTable.forEach(push);
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
const ESC_ALIGN_CENTER = [0x1b, 0x61, 0x01];

export const appVersionLine = () => `v${import.meta.env.VITE_APP_VERSION || '?'}`;

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

  pushBody(body, push, pushLine);
  pushVersion(push, pushLine);
  push(ESC_FEED_LINES(FEED_LINES));
  return [new Uint8Array(bytes)];
};

// Taller rather than wider: the printer has no half steps, and doubling the width
// would cut the line to 21 characters and split the longer lines across two of them.
function pushBody(body, push, pushLine) {
  body.forEach(({ text, bold, big }) => {
    if (big) push(GS_SIZE_DBL_HEIGHT);
    if (bold) push(ESC_BOLD_ON);
    pushLine(text);
    if (bold) push(ESC_BOLD_OFF);
    if (big) push(GS_SIZE_NORMAL);
  });
}

// The PT-210 accepts ESC M 1 and then prints nothing, having no Font B glyphs, so this stays in
// the normal face. A blank line above it keeps it reading as a footer rather than as another value.
function pushVersion(push, pushLine) {
  pushLine('');
  push(ESC_ALIGN_CENTER);
  pushLine(appVersionLine());
  push(ESC_ALIGN_LEFT);
}

export const generateResultsPayload = async (resultsData = {}) => {
  const { header, body } = buildResultsReceipt(resultsData);
  const raster = resultsData.shareUrl ? buildQrRaster(resultsData.shareUrl) : null;
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

  pushBody(body, push, pushLine);

  if (raster) {
    push(ESC_ALIGN_CENTER);
    push(raster);
    push(ESC_ALIGN_LEFT, LF);
  } else if (resultsData.shareUrl) {
    pushLine(centerText('LINK TOO LONG TO PRINT'));
  }

  pushVersion(push, pushLine);
  push(ESC_FEED_LINES(FEED_LINES));
  return [new Uint8Array(bytes)];
};
