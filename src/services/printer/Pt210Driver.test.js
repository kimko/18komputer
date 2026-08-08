import { describe, it, expect } from 'vitest';
import {
  COLS,
  centerText,
  rightAlign,
  spreadLine,
  sanitizeAscii,
  trainLabel,
  wrapRoute,
  headerLines,
  formatReceiptLines,
} from './Pt210Driver.js';

describe('COLS', () => {
  it('is 32, matching a 384 dot head and the 12x24 built-in font', () => {
    expect(COLS).toBe(32);
  });
});

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
  it('pads the left so the text sits in the middle', () => {
    expect(centerText('2 trains')).toBe(' '.repeat(12) + '2 trains');
    expect(centerText('BALTIMORE & OHIO')).toBe(' '.repeat(8) + 'BALTIMORE & OHIO');
  });

  it('rounds down when the remainder is odd', () => {
    expect(centerText('abc', 8)).toBe('  abc');
  });

  it('adds no padding when the text fills the line', () => {
    expect(centerText('x'.repeat(32))).toBe('x'.repeat(32));
  });

  it('leaves over-long text untouched', () => {
    expect(centerText('x'.repeat(40))).toBe('x'.repeat(40));
  });
});

describe('rightAlign', () => {
  it('pushes the text to the right edge', () => {
    expect(rightAlign('$290')).toBe(' '.repeat(28) + '$290');
  });

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

describe('trainLabel', () => {
  it('reports the stop count', () => {
    expect(trainLabel({ stopCount: 4, hasBonus: false }, 0)).toBe('4s');
  });

  it('marks a train that collected a bonus', () => {
    expect(trainLabel({ stopCount: 3, hasBonus: true }, 0)).toBe('3s+');
  });

  it('falls back to the train position when there are no stops', () => {
    expect(trainLabel({ stopCount: 0 }, 0)).toBe('T1');
    expect(trainLabel({}, 2)).toBe('T3');
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

  it('renders the whole receipt', () => {
    expect(formatReceiptLines(twoTrains)).toEqual([
      ' '.repeat(8) + 'BALTIMORE & OHIO',
      '-'.repeat(32),
      '4s   $180  40+40+50+50',
      '3s+  $110  30+30+20+30(P)',
      '-'.repeat(32),
      'TOTAL' + ' '.repeat(23) + '$290',
      ' '.repeat(12) + '2 trains',
    ]);
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
    expect(lines[lines.length - 1]).toBe(' '.repeat(12) + '1 train');
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
      '-'.repeat(32),
      ' '.repeat(10) + '(no routes)',
      '-'.repeat(32),
      'TOTAL' + ' '.repeat(25) + '$0',
    ]);
  });

  it('falls back to the short name when no full name is passed', () => {
    const lines = formatReceiptLines({ company: 'B&O', trains: [], totalRevenue: 0 });
    expect(lines[0]).toBe(' '.repeat(14) + 'B&O');
  });

  it('does not throw on an empty object', () => {
    expect(() => formatReceiptLines({})).not.toThrow();
  });
});
