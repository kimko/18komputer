import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const gamesDir = path.join(__dirname, 'games');
const files = fs.readdirSync(gamesDir).filter(f => f.endsWith('.json') && f !== 'index.json');

// Returns a list of problems rather than asserting, so one run reports every bad file at once.
function validate(file, data) {
  const problems = [];
  const fail = (msg) => problems.push(`${file}: ${msg}`);
  const isNumberArray = (v) => Array.isArray(v) && v.every(n => typeof n === 'number');

  if (typeof data.id !== 'string') fail('id is missing or not a string');
  if (typeof data.name !== 'string') fail('name is missing or not a string');

  // The app loads a game with import(`../data/games/${gameId}.json`), so a mismatch is unloadable.
  if (data.id !== file.replace(/\.json$/, '')) fail(`id "${data.id}" does not match the filename`);

  if ('bggId' in data && typeof data.bggId !== 'number') fail('bggId is not a number');
  if ('maxOr' in data && typeof data.maxOr !== 'number') fail('maxOr is not a number');

  if (!isNumberArray(data.revenueStops)) fail('revenueStops must be an array of numbers');
  if (data.parValues && !isNumberArray(data.parValues)) fail('parValues must be an array of numbers');
  if (data.sharePrices && !isNumberArray(data.sharePrices)) fail('sharePrices must be an array of numbers');

  if (!Array.isArray(data.companies) || data.companies.length === 0) {
    fail('companies must be a non-empty array');
  } else {
    data.companies.forEach((c, i) => {
      if (typeof c.name !== 'string') fail(`company ${i} has no name`);
      if (typeof c.shortName !== 'string') fail(`company ${i} has no shortName`);
      if (c.color && !/^#[0-9a-fA-F]{6}$/.test(c.color)) fail(`company ${i} colour "${c.color}" is not a hex value`);
    });
    // Everything in a saved game is keyed by shortName, so duplicates would merge two companies.
    const names = data.companies.map(c => c.shortName);
    const duplicates = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
    if (duplicates.length) fail(`duplicate shortName: ${duplicates.join(', ')}`);
  }

  (data.trains || []).forEach((t, i) => {
    if (typeof t.name !== 'string') fail(`train ${i} has no name`);
    if (typeof t.cost !== 'number') fail(`train ${i} has no cost`);
  });

  (data.revenueBonuses || []).forEach((b, i) => {
    if (typeof b.label !== 'string') fail(`revenue bonus ${i} has no label`);
    if (!isNumberArray(b.adds)) fail(`revenue bonus ${i} has no numeric adds`);
  });

  return problems;
}

describe('Game Data Schema Validation', () => {
  it('has at least one game to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('every game file conforms to the schema', () => {
    const problems = files.flatMap(file =>
      validate(file, JSON.parse(fs.readFileSync(path.join(gamesDir, file), 'utf8')))
    );
    expect(problems).toEqual([]);
  });

  describe('the validator itself', () => {
    it('accepts a well-formed game', () => {
      expect(validate('1830.json', {
        id: '1830', name: '1830', revenueStops: [10, 20],
        companies: [{ name: 'Pennsylvania', shortName: 'PRR', color: '#237333' }]
      })).toEqual([]);
    });

    it('catches an id that does not match its filename', () => {
      const problems = validate('1830.json', {
        id: '1829', name: '1830', revenueStops: [10],
        companies: [{ name: 'A', shortName: 'A' }]
      });
      expect(problems).toContain('1830.json: id "1829" does not match the filename');
    });

    it('catches two companies sharing a short name', () => {
      const problems = validate('x.json', {
        id: 'x', name: 'x', revenueStops: [10],
        companies: [{ name: 'A', shortName: 'PRR' }, { name: 'B', shortName: 'PRR' }]
      });
      expect(problems).toContain('x.json: duplicate shortName: PRR');
    });

    it('catches a colour that is not a hex value', () => {
      const problems = validate('x.json', {
        id: 'x', name: 'x', revenueStops: [10],
        companies: [{ name: 'A', shortName: 'A', color: 'red' }]
      });
      expect(problems).toContain('x.json: company 0 colour "red" is not a hex value');
    });
  });
});
