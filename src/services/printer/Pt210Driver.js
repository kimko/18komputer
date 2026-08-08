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

export function trainLabel(train, index) {
  const stopCount = train.stopCount || 0;
  if (stopCount === 0) return `T${index + 1}`;
  return train.hasBonus ? `${stopCount}s+` : `${stopCount}s`;
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

export function formatReceiptLines(receiptData = {}) {
  const trains = receiptData.trains || [];
  const total = receiptData.totalRevenue || 0;
  const separator = '-'.repeat(COLS);

  const lines = [...headerLines(receiptData.companyName, receiptData.company), separator];

  if (trains.length === 0) {
    lines.push(centerText('(no routes)'), separator, ...spreadLine('TOTAL', `$${total}`));
    return lines;
  }

  trains.forEach((train, index) => {
    const prefix =
      trainLabel(train, index).padEnd(LABEL_W) +
      `$${train.revenue || 0}`.padEnd(MONEY_W) +
      ' ';
    const routeWidth = Math.max(MIN_ROUTE_W, COLS - prefix.length);

    wrapRoute(train.route || '0', routeWidth).forEach((routeLine, routeIndex) => {
      lines.push(routeIndex === 0 ? prefix + routeLine : ' '.repeat(prefix.length) + routeLine);
    });
  });

  lines.push(separator);
  lines.push(...spreadLine('TOTAL', `$${total}`));
  lines.push(centerText(`${trains.length} train${trains.length === 1 ? '' : 's'}`));

  return lines;
}
