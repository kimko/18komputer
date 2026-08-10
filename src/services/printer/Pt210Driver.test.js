import { describe, it, expect, beforeEach } from 'vitest';
import {
  PT210_STYLE,
  centerText,
  rightAlign,
  spreadLine,
  sanitizeAscii,
  wrapRoute,
  payoutTableLines,
  headerLines,
  formatReceiptLines,
  generatePt210Payload,
  generateResultsPayload,
} from './Pt210Driver.js';

describe('sanitizeAscii', () => {
  it('leaves plain text alone', () => {
    expect(sanitizeAscii('Baltimore & Ohio')).toBe('Baltimore & Ohio');
  });

  it('strips accents', () => {
    expect(sanitizeAscii('Compañía')).toBe('Compania');
    expect(sanitizeAscii('für')).toBe('fur');
    expect(sanitizeAscii('Böhmische')).toBe('Bohmische');
  });

  it('expands letters that accent stripping cannot handle', () => {
    expect(sanitizeAscii('Straßenbahnen')).toBe('Strassenbahnen');
    expect(sanitizeAscii('Øresund')).toBe('Oresund');
    expect(sanitizeAscii('Ærø')).toBe('AEro');
    expect(sanitizeAscii('Łódź')).toBe('Lodz');
  });

  it('replaces typographic punctuation with the plain equivalent', () => {
    expect(sanitizeAscii('Paris–Lyon')).toBe('Paris-Lyon');
    expect(sanitizeAscii('“Grand”')).toBe('"Grand"');
    expect(sanitizeAscii('Don’t')).toBe("Don't");
    expect(sanitizeAscii('more…')).toBe('more...');
  });

  it('replaces anything still outside plain ASCII with a question mark', () => {
    expect(sanitizeAscii('東京')).toBe('??');
  });

  it('returns an empty string for missing input', () => {
    expect(sanitizeAscii(undefined)).toBe('');
    expect(sanitizeAscii(null)).toBe('');
  });
});

describe('centerText', () => {
  it('rounds down when the remainder is odd', () => {
    expect(centerText('abc', 8)).toBe('  abc');
  });

  it('leaves over-long text untouched', () => {
    expect(centerText('x'.repeat(40))).toBe('x'.repeat(40));
  });
});

describe('rightAlign', () => {
  it('leaves over-long text untouched', () => {
    expect(rightAlign('x'.repeat(33))).toBe('x'.repeat(33));
  });
});

describe('spreadLine', () => {
  it('puts the label at the left and the value at the right edge', () => {
    const [line, ...rest] = spreadLine('TOTAL', '$290');
    expect(line).toBe('TOTAL' + ' '.repeat(23) + '$290');
    expect(line).toHaveLength(32);
    expect(rest).toEqual([]);
  });

  it('keeps a single space between them when they only just fit', () => {
    const [line] = spreadLine('x'.repeat(20), 'y'.repeat(11));
    expect(line).toBe('x'.repeat(20) + ' ' + 'y'.repeat(11));
  });

  it('drops the value onto its own right-aligned line when they cannot share one', () => {
    expect(spreadLine('x'.repeat(30), '$1234')).toEqual([
      'x'.repeat(30),
      ' '.repeat(27) + '$1234',
    ]);
  });
});

describe('payoutTableLines', () => {
  it('pairs a 10-share company into two columns', () => {
    expect(payoutTableLines(15, 10)).toEqual([
      '     10%    $15   60%    $90',
      '     20%    $30   70%   $105',
      '     30%    $45   80%   $120',
      '     40%    $60   90%   $135',
      '     50%    $75  100%   $150',
    ]);
  });

  it('keeps a 5-share company in one column, since half of five is ragged', () => {
    expect(payoutTableLines(19, 5)).toEqual([
      '           20%    $19',
      '           40%    $38',
      '           60%    $57',
      '           80%    $76',
      '          100%    $95',
    ]);
  });

  it('right-aligns both halves so 100% lines up under the shorter rows', () => {
    const lines = payoutTableLines(143, 10);
    const pctColumn = lines.map((line) => line.indexOf('%'));
    expect(new Set(pctColumn).size).toBe(1);
    lines.forEach((line) => expect(line).toMatch(/\$\d+$/));
  });

  it('stays inside the paper even on a late-game run', () => {
    payoutTableLines(200, 10).forEach((line) => expect(line.length).toBeLessThanOrEqual(32));
    payoutTableLines(400, 5).forEach((line) => expect(line.length).toBeLessThanOrEqual(32));
  });

  it('prints nothing when there was no revenue to divide', () => {
    expect(payoutTableLines(0, 10)).toEqual([]);
  });

  it('assumes ten shares when the receipt carries no setting', () => {
    expect(payoutTableLines(15)).toEqual(payoutTableLines(15, 10));
  });

  it('prints no table for a 2-share company, which has a single holder', () => {
    expect(payoutTableLines(95, 2)).toEqual([]);
  });
});

describe('wrapRoute', () => {
  it('returns a single line when the route fits', () => {
    expect(wrapRoute('40+40+50+50', 21)).toEqual(['40+40+50+50']);
  });

  it('returns a single line when the route is exactly the width', () => {
    expect(wrapRoute('10+10+10+10+10+10+10', 20)).toEqual(['10+10+10+10+10+10+10']);
  });

  it('wraps on a plus and keeps it as a continuation marker', () => {
    expect(wrapRoute('50+40+40+30+30+60(P)+20+20', 21)).toEqual([
      '50+40+40+30+30+60(P)+',
      '20+20',
    ]);
  });

  it('never splits a bonus stop across two lines', () => {
    expect(wrapRoute('10+10+10+10+10+60(P)', 18)).toEqual(['10+10+10+10+10+', '60(P)']);
  });

  it('moves the plus to the next line when it would not fit', () => {
    expect(wrapRoute('100+100+100', 7)).toEqual(['100+100', '+100']);
  });

  it('hard-slices a single stop that is wider than the column', () => {
    expect(wrapRoute('1234567890', 4)).toEqual(['1234', '5678', '90']);
  });

  it('returns one empty line for an empty route', () => {
    expect(wrapRoute('', 21)).toEqual(['']);
  });
});

describe('headerLines', () => {
  it('centres a name that fits on one line', () => {
    expect(headerLines('Baltimore & Ohio', 'B&O')).toEqual([
      ' '.repeat(8) + 'BALTIMORE & OHIO',
    ]);
  });

  it('transliterates before measuring', () => {
    expect(headerLines('Compañía del Ferrocarril', 'MZA')).toEqual([
      ' '.repeat(4) + 'COMPANIA DEL FERROCARRIL',
    ]);
  });

  it('wraps onto a second line when one is not enough', () => {
    const lines = headerLines('Compañía del Ferrocarril de Sevilla', 'MZA');
    expect(lines).toHaveLength(2);
    expect(lines.map(l => l.trim())).toEqual(['COMPANIA DEL FERROCARRIL DE', 'SEVILLA']);
    lines.forEach(l => expect(l.length).toBeLessThanOrEqual(32));
  });

  it('falls back to the short name when two lines are not enough', () => {
    const long = 'Bau- und Betriebsgesellschaft für städtische Straßenbahnen in Wien';
    expect(headerLines(long, 'WStB')).toEqual([' '.repeat(14) + 'WSTB']);
  });

  it('uses the short name when no full name is given', () => {
    expect(headerLines(undefined, 'B&O')).toEqual([' '.repeat(14) + 'B&O']);
  });

  it('collapses runs of whitespace', () => {
    expect(headerLines('  Erie   Railroad ', 'ERIE')).toEqual([
      ' '.repeat(9) + 'ERIE RAILROAD',
    ]);
  });
});

describe('formatReceiptLines', () => {
  const twoTrains = {
    companyName: 'Baltimore & Ohio',
    company: 'B&O',
    trains: [
      { route: '40+40+50+50', revenue: 180, stopCount: 4, hasBonus: false },
      { route: '30+30+20+30(P)', revenue: 110, stopCount: 3, hasBonus: true },
    ],
    totalRevenue: 290,
  };

  it('prints the short name centred under the full name', () => {
    const lines = formatReceiptLines(twoTrains);
    expect(lines[0].trim()).toBe('BALTIMORE & OHIO');
    expect(lines[1]).toBe(' '.repeat(14) + 'B&O');
  });

  it('does not repeat the short name when it is already the header', () => {
    const lines = formatReceiptLines({ ...twoTrains, companyName: undefined });
    expect(lines[0]).toBe(' '.repeat(14) + 'B&O');
    expect(lines[1]).toBe('-'.repeat(32));
  });

  it('does not repeat the short name when a long name fell back to it', () => {
    const long = 'Bau- und Betriebsgesellschaft für städtische Straßenbahnen in Wien';
    const lines = formatReceiptLines({ ...twoTrains, companyName: long, company: 'WStB' });
    expect(lines[0]).toBe(' '.repeat(14) + 'WSTB');
    expect(lines[1]).toBe('-'.repeat(32));
  });

  it('renders the whole receipt', () => {
    expect(formatReceiptLines({ ...twoTrains, totalShares: 10, isHalfPay: true })).toEqual([
      ' '.repeat(8) + 'BALTIMORE & OHIO',
      ' '.repeat(14) + 'B&O',
      '-'.repeat(32),
      '4s   $180  40+40+50+50',
      '3s+  $110  30+30+20+30(P)',
      '-'.repeat(32),
      'TOTAL' + ' '.repeat(23) + '$290',
      '10-SHARE' + ' '.repeat(16) + 'HALF PAY',
      'TREASURY' + ' '.repeat(20) + '$140',
      ' '.repeat(12) + '2 trains',
      '',
      '     10%    $15   60%    $90',
      '     20%    $30   70%   $105',
      '     30%    $45   80%   $120',
      '     40%    $60   90%   $135',
      '     50%    $75  100%   $150',
    ]);
  });

  it('no longer prints a single per share line, because the table replaces it', () => {
    const lines = formatReceiptLines({ ...twoTrains, totalShares: 10, isHalfPay: true });
    expect(lines.some((line) => line.includes('PER SHARE'))).toBe(false);
  });

  it('pays everything out and leaves the treasury empty on full pay', () => {
    const lines = formatReceiptLines({ ...twoTrains, totalShares: 10, isHalfPay: false });
    expect(lines).toContain('10-SHARE' + ' '.repeat(16) + 'FULL PAY');
    expect(lines).toContain('TREASURY' + ' '.repeat(22) + '$0');
    expect(lines).toContain('     10%    $29   60%   $174');
  });

  it('doubles the dividend on a 5-share company', () => {
    const lines = formatReceiptLines({ ...twoTrains, totalShares: 5, isHalfPay: false });
    expect(lines).toContain('5-SHARE' + ' '.repeat(17) + 'FULL PAY');
    expect(lines).toContain('           20%    $58');
  });

  it('divides a 5-share half pay evenly', () => {
    const lines = formatReceiptLines({ ...twoTrains, totalRevenue: 190, totalShares: 5, isHalfPay: true });
    expect(lines).toContain('TREASURY' + ' '.repeat(21) + '$95');
    expect(lines).toContain('           20%    $19');
    expect(lines).toContain('          100%    $95');
  });

  it('splits a 2-share half pay evenly and prints no table', () => {
    const lines = formatReceiptLines({ ...twoTrains, totalRevenue: 190, totalShares: 2, isHalfPay: true });
    expect(lines).toContain('2-SHARE' + ' '.repeat(17) + 'HALF PAY');
    expect(lines).toContain('TREASURY' + ' '.repeat(21) + '$95');
    expect(lines.some((line) => line.includes('50%') || line.includes('100%'))).toBe(false);
  });

  it('assumes a 10-share company on full pay when the receipt carries no settings', () => {
    const lines = formatReceiptLines(twoTrains);
    expect(lines).toContain('10-SHARE' + ' '.repeat(16) + 'FULL PAY');
    expect(lines).toContain('     10%    $29   60%   $174');
  });

  it('never produces a line wider than the paper', () => {
    const lines = formatReceiptLines({
      companyName: 'Chicago, Burlington and Quincy Railroad',
      company: 'CBQ',
      trains: [
        { route: '50+40+40+30+30+60(P)+20+20', revenue: 310, stopCount: 6, hasBonus: true },
        { route: '10+10+10+10+10+10+10+10+10+10+10+10', revenue: 120, stopCount: 12 },
      ],
      totalRevenue: 430,
      totalShares: 5,
      isHalfPay: true,
    });
    lines.forEach(line => expect(line.length).toBeLessThanOrEqual(32));
  });

  it('indents a wrapped route to stay under the route column', () => {
    const lines = formatReceiptLines({
      companyName: 'B&O',
      trains: [{ route: '50+40+40+30+30+60(P)+20+20', revenue: 310, stopCount: 6, hasBonus: true }],
      totalRevenue: 310,
    });
    expect(lines).toContain('6s+  $310  50+40+40+30+30+60(P)+');
    expect(lines).toContain(' '.repeat(11) + '20+20');
  });

  it('says train rather than trains for a single train', () => {
    const lines = formatReceiptLines({
      companyName: 'B&O',
      trains: [{ route: '40', revenue: 40, stopCount: 1 }],
      totalRevenue: 40,
    });
    expect(lines).toContain(' '.repeat(12) + '1 train');
  });

  it('shrinks the route column rather than overflowing on a large revenue', () => {
    const lines = formatReceiptLines({
      companyName: 'B&O',
      trains: [{ route: '9999+9999+9999+9999', revenue: 39996, stopCount: 4 }],
      totalRevenue: 39996,
    });
    lines.forEach(line => expect(line.length).toBeLessThanOrEqual(32));
    expect(lines.join('\n')).toContain('9999');
  });

  it('reports no routes when nothing was run', () => {
    expect(formatReceiptLines({ companyName: 'Baltimore & Ohio', company: 'B&O' })).toEqual([
      ' '.repeat(8) + 'BALTIMORE & OHIO',
      ' '.repeat(14) + 'B&O',
      '-'.repeat(32),
      ' '.repeat(10) + '(no routes)',
      '-'.repeat(32),
      'TOTAL' + ' '.repeat(25) + '$0',
      '10-SHARE' + ' '.repeat(16) + 'FULL PAY',
      'TREASURY' + ' '.repeat(22) + '$0',
    ]);
  });

  it('falls back to the short name when no full name is passed', () => {
    const lines = formatReceiptLines({ company: 'B&O', trains: [], totalRevenue: 0 });
    expect(lines[0]).toBe(' '.repeat(14) + 'B&O');
  });
});

const toRaw = (payload) => String.fromCharCode(...payload);

// oxlint-disable-next-line no-control-regex -- ESC/POS commands are control characters by definition
const CONTROL_CODES = /\x1b@|\x1b[taEdJ].|\x1d!./g;

const decodeLines = (payload) => {
  const lines = toRaw(payload).replace(CONTROL_CODES, '').split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
};

const contains = (payload, sequence) =>
  toRaw(payload).includes(String.fromCharCode(...sequence));

// The QR bitmap is not text, and decoding it as text invents lines of any width.
const beforeRaster = (payload) => {
  const at = toRaw(payload).indexOf(String.fromCharCode(0x1d, 0x76, 0x30, 0x00));
  return at === -1 ? payload : payload.slice(0, at);
};

describe('generatePt210Payload', () => {
  const twoTrains = {
    companyName: 'Baltimore & Ohio',
    company: 'B&O',
    trains: [
      { route: '40+40+50+50', revenue: 180, stopCount: 4, hasBonus: false },
      { route: '30+30+20+30(P)', revenue: 110, stopCount: 3, hasBonus: true },
    ],
    totalRevenue: 290,
  };

  beforeEach(() => {
    PT210_STYLE.useCharTable = true;
    PT210_STYLE.useDoubleHeightHeader = true;
  });

  it('produces exactly one payload, because a receipt is one continuous strip', async () => {
    const payloads = await generatePt210Payload(twoTrains);
    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toBeInstanceOf(Uint8Array);
  });

  it('resets the printer first and feeds the paper past the tear bar last', async () => {
    const [payload] = await generatePt210Payload(twoTrains);
    expect(Array.from(payload.slice(0, 2))).toEqual([0x1b, 0x40]);
    expect(Array.from(payload.slice(-3))).toEqual([0x1b, 0x64, 5]);
  });

  it('renders the receipt text', async () => {
    const [payload] = await generatePt210Payload(twoTrains);
    expect(decodeLines(payload)).toEqual([
      ' '.repeat(8) + 'BALTIMORE & OHIO',
      ' '.repeat(14) + 'B&O',
      '-'.repeat(32),
      '4s   $180  40+40+50+50',
      '3s+  $110  30+30+20+30(P)',
      '-'.repeat(32),
      'TOTAL' + ' '.repeat(23) + '$290',
      '10-SHARE' + ' '.repeat(16) + 'FULL PAY',
      'TREASURY' + ' '.repeat(22) + '$0',
      ' '.repeat(12) + '2 trains',
      '',
      '     10%    $29   60%   $174',
      '     20%    $58   70%   $203',
      '     30%    $87   80%   $232',
      '     40%   $116   90%   $261',
      '     50%   $145  100%   $290',
    ]);
  });

  it('draws exactly two separator lines', async () => {
    const [payload] = await generatePt210Payload(twoTrains);
    const separators = decodeLines(payload).filter((line) => line === '-'.repeat(32));
    expect(separators).toHaveLength(2);
  });

  it('never emits a line wider than the paper', async () => {
    const [payload] = await generatePt210Payload({
      companyName: 'Chicago, Burlington and Quincy Railroad',
      company: 'CBQ',
      trains: [
        { route: '50+40+40+30+30+60(P)+20+20', revenue: 310, stopCount: 6, hasBonus: true },
        { route: '10+10+10+10+10+10+10+10+10+10+10+10', revenue: 120, stopCount: 12 },
      ],
      totalRevenue: 430,
    });
    decodeLines(payload).forEach((line) => expect(line.length).toBeLessThanOrEqual(32));
  });

  it('prints the company name bold and double height, then goes back to normal', async () => {
    const [payload] = await generatePt210Payload(twoTrains);
    const raw = toRaw(payload);
    expect(raw).toContain('\x1bE\x01\x1d!\x01' + ' '.repeat(8) + 'BALTIMORE & OHIO');
    expect(raw.indexOf('\x1d!\x00')).toBeGreaterThan(raw.indexOf('BALTIMORE'));
    expect(raw.indexOf('\x1bE\x00')).toBeGreaterThan(raw.indexOf('BALTIMORE'));
  });

  it('prints the total line bold', async () => {
    const [payload] = await generatePt210Payload(twoTrains);
    expect(toRaw(payload)).toContain('\x1bE\x01TOTAL');
  });

  it('selects the plain ASCII code page so the Chinese default does not apply', async () => {
    const [payload] = await generatePt210Payload(twoTrains);
    expect(contains(payload, [0x1b, 0x74, 0x00])).toBe(true);
  });

  it('sends only plain ASCII even for an accented company name', async () => {
    const [payload] = await generatePt210Payload({
      companyName: 'Compañía del Ferrocarril',
      company: 'MZA',
      trains: [{ route: '40', revenue: 40, stopCount: 1 }],
      totalRevenue: 40,
    });
    expect(Array.from(payload).every((byte) => byte < 0x80)).toBe(true);
    expect(decodeLines(payload)[0]).toBe(' '.repeat(4) + 'COMPANIA DEL FERROCARRIL');
  });

  it('sends no cut and no bitmap commands', async () => {
    const [payload] = await generatePt210Payload(twoTrains);
    expect(contains(payload, [0x1d, 0x56])).toBe(false);
    expect(contains(payload, [0x1d, 0x76])).toBe(false);
  });

  it('prints a usable receipt when nothing was run', async () => {
    const [payload] = await generatePt210Payload({ companyName: 'Baltimore & Ohio', company: 'B&O' });
    expect(decodeLines(payload)).toEqual([
      ' '.repeat(8) + 'BALTIMORE & OHIO',
      ' '.repeat(14) + 'B&O',
      '-'.repeat(32),
      ' '.repeat(10) + '(no routes)',
      '-'.repeat(32),
      'TOTAL' + ' '.repeat(25) + '$0',
      '10-SHARE' + ' '.repeat(16) + 'FULL PAY',
      'TREASURY' + ' '.repeat(22) + '$0',
    ]);
  });
});

describe('generateResultsPayload', () => {
  const resultsData = {
    gameName: '1817 4p Aug-07',
    players: ['Liam'],
    activeCompanies: [{ shortName: 'UR', totalShares: 5, parValue: 50 }],
    maxOr: 3,
    printedAt: new Date('2026-08-10T09:00:00Z'),
    dashboardState: {
      shareValues: { UR: 440 }, ors: { UR: { or1: 410 } },
      playerAssets: { Liam: { cash: 2765, shares: { UR: 60 } } }
    },
    shareUrl: 'https://kimko.github.io/18komputer/resume#import=ABC'
  };

  it('produces one payload, because a receipt is one continuous strip', async () => {
    expect(await generateResultsPayload(resultsData)).toHaveLength(1);
  });

  it('prints the standings', async () => {
    const [payload] = await generateResultsPayload(resultsData);
    const text = decodeLines(payload).join('\n');
    expect(text).toContain('FINAL RESULTS');
    expect(text).toContain('1 LIAM');
    expect(text).toContain('SCAN TO OPEN RESULTS');
  });

  it('rules a line off under the header and above the footer', async () => {
    const [payload] = await generateResultsPayload(resultsData);
    const rules = decodeLines(beforeRaster(payload)).filter((line) => line === '-'.repeat(32));
    expect(rules).toHaveLength(2);
  });

  it('includes the raster command for the code', async () => {
    const [payload] = await generateResultsPayload(resultsData);
    expect(contains(payload, [0x1d, 0x76, 0x30, 0x00])).toBe(true);
  });

  it('never writes a text line wider than the paper', async () => {
    const [payload] = await generateResultsPayload(resultsData);
    decodeLines(beforeRaster(payload)).forEach((line) =>
      expect(line.length).toBeLessThanOrEqual(32)
    );
  });

  it('feeds the paper past the tear bar', async () => {
    const [payload] = await generateResultsPayload(resultsData);
    expect(contains(payload, [0x1b, 0x64])).toBe(true);
  });

  it('prints the slip and says so when the link is too long to encode', async () => {
    const [payload] = await generateResultsPayload({
      ...resultsData,
      shareUrl: 'https://x/' + 'A'.repeat(2500)
    });
    const text = decodeLines(payload).join('\n');
    expect(text).toContain('1 LIAM');
    expect(text).toContain('LINK TOO LONG');
    expect(contains(payload, [0x1d, 0x76, 0x30, 0x00])).toBe(false);
  });
});
