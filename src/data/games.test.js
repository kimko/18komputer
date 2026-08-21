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

  // Absent means the title has no half pay rule, so the flag only ever turns it on.
  if ('allowsHalfPay' in data && data.allowsHalfPay !== true) fail('allowsHalfPay must be true or absent');

  // The most of one company a single player may hold. Absent means the usual 60%.
  if ('maxPlayerHolding' in data) {
    const held = data.maxPlayerHolding;
    if (typeof held !== 'number' || held % 10 !== 0 || held < 10 || held > 100) {
      fail(`maxPlayerHolding "${held}" must be a multiple of 10 between 10 and 100`);
    }
  }

  if (!isNumberArray(data.revenueStops)) fail('revenueStops must be an array of numbers');
  if (data.parValues && !isNumberArray(data.parValues)) fail('parValues must be an array of numbers');
  if (data.sharePrices && !isNumberArray(data.sharePrices)) fail('sharePrices must be an array of numbers');

  // Absent means the title has no grid, and the flat sharePrices list is the whole market.
  if ('stockMarket' in data) {
    const { type, grid } = data.stockMarket;
    if (type !== '1d' && type !== '2d') fail(`stockMarket type "${type}" must be 1d or 2d`);
    if (!Array.isArray(grid) || grid.length === 0) {
      fail('stockMarket grid must be a non-empty array of rows');
    } else {
      if (type === '2d' && grid.length < 2) fail('a 2d stockMarket needs more than one row');
      if (type === '1d' && grid.length > 1) fail('a 1d stockMarket needs exactly one row');
      grid.forEach((row, r) => {
        if (!Array.isArray(row) || row.length === 0) {
          fail(`stockMarket row ${r} is not a non-empty array`);
        } else {
          row.forEach((cell, c) => {
            if (typeof cell !== 'string') fail(`stockMarket cell ${r},${c} is not a string`);
            else if (cell !== '' && !/^\d+[a-zA-Z]*$/.test(cell)) {
              fail(`stockMarket cell ${r},${c} "${cell}" is not a price`);
            }
          });
        }
      });
      if (!grid.flat().some(cell => /^\d+[a-zA-Z]*[pPxzw]/.test(cell))) {
        fail('stockMarket has no par square, so a company has nowhere to start');
      }
    }
  }

  // Absent means we have no reference for the title, which is not the same as "nothing moves".
  if ('priceMovement' in data) {
    const TRIGGERS = ['soldOut', 'dividendPaid', 'dividendWithheld', 'sharesSold',
      'sharesInPool', 'presidentBankrupt', 'corporationCloses'];
    const MOVES = ['up', 'down', 'left', 'right', null];
    const COUNTS = ['perShare', 'per10Percent', 'perSale', 'perShareIfPresident',
      'perSaleIfPresident', 'per10PercentIfPresidentElseOne', 'perMultipleOfPrice',
      'perHalfMultipleOfPrice', 'perRevenueBand'];

    Object.entries(data.priceMovement).forEach(([trigger, rule]) => {
      if (!TRIGGERS.includes(trigger)) return fail(`priceMovement has an unknown trigger "${trigger}"`);
      if (!rule || typeof rule !== 'object') return fail(`priceMovement.${trigger} is not an object`);

      if (!MOVES.includes(rule.move ?? null)) fail(`priceMovement.${trigger} move "${rule.move}" is not a direction`);
      if (typeof rule.squares !== 'number' && !COUNTS.includes(rule.squares)) {
        fail(`priceMovement.${trigger} squares "${rule.squares}" is not a count`);
      }
      // A direction of null means the trigger moves nothing, so a count would contradict it.
      if (rule.move == null && rule.squares !== 0) fail(`priceMovement.${trigger} moves nowhere but counts squares`);
      if ('maxSquares' in rule && typeof rule.squares === 'number') {
        fail(`priceMovement.${trigger} caps a fixed number of squares`);
      }
      if ('maxSquares' in rule && !(rule.maxSquares > 1)) {
        fail(`priceMovement.${trigger} maxSquares must be more than one`);
      }
      if ('custom' in rule && typeof rule.custom !== 'string') fail(`priceMovement.${trigger} custom is not a string`);

      // Extras stack on top of the base move when the square or the holdings say so. They are the
      // only way a title gets more than its usual jump, and 1894 is so far the only one that does.
      if ('extraSquares' in rule) {
        if (!Array.isArray(rule.extraSquares)) {
          fail(`priceMovement.${trigger} extraSquares is not an array`);
        } else {
          rule.extraSquares.forEach((extra, i) => {
            const where = `priceMovement.${trigger} extra ${i}`;
            if (!(extra.squares > 0)) fail(`${where} adds "${extra.squares}", which is not a count`);
            if (extra.when === 'inZone') {
              if (!['y', 'o', 'b'].includes(extra.zone)) fail(`${where} names zone "${extra.zone}", which no cell can carry`);
            } else if (extra.when === 'playerHoldsAtLeast') {
              if (!(extra.percent > 0 && extra.percent <= 100)) fail(`${where} wants "${extra.percent}" percent held`);
            } else {
              fail(`${where} tests "${extra.when}", which is not a condition`);
            }
          });
        }
      }
    });
  }

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

    // A bonus is worth either a fixed amount off its adds list or something the train works out,
    // and exactly one of the two: neither leaves nothing to pay, both leaves it ambiguous.
    if ('doubles' in b) {
      if (b.doubles !== 'highestStop') fail(`revenue bonus ${i} doubles "${b.doubles}", which is not a rule`);
      if ('adds' in b) fail(`revenue bonus ${i} both doubles and adds a fixed amount`);
    } else if (!isNumberArray(b.adds)) {
      fail(`revenue bonus ${i} has no numeric adds`);
    }

    // Absent means the title puts no limit on how often one train can claim it.
    if ('maxPerTrain' in b && (!Number.isInteger(b.maxPerTrain) || b.maxPerTrain < 1)) {
      fail(`revenue bonus ${i} maxPerTrain "${b.maxPerTrain}" must be a whole number of at least 1`);
    }
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

    it('catches a stock market grid that does not match its type', () => {
      const game = { id: 'x', name: 'x', revenueStops: [10], companies: [{ name: 'A', shortName: 'A' }] };
      expect(validate('x.json', { ...game, stockMarket: { type: '2d', grid: [['10p', '20']] } }))
        .toContain('x.json: a 2d stockMarket needs more than one row');
      expect(validate('x.json', { ...game, stockMarket: { type: 'flat', grid: [['10p']] } }))
        .toContain('x.json: stockMarket type "flat" must be 1d or 2d');
    });

    it('catches a stock market cell that is not a price', () => {
      const problems = validate('x.json', {
        id: 'x', name: 'x', revenueStops: [10],
        companies: [{ name: 'A', shortName: 'A' }],
        stockMarket: { type: '1d', grid: [['10p', 'free']] }
      });
      expect(problems).toContain('x.json: stockMarket cell 0,1 "free" is not a price');
    });

    it('catches a stock market with nowhere for a company to start', () => {
      const problems = validate('x.json', {
        id: 'x', name: 'x', revenueStops: [10],
        companies: [{ name: 'A', shortName: 'A' }],
        stockMarket: { type: '1d', grid: [['10', '20y']] }
      });
      expect(problems).toContain('x.json: stockMarket has no par square, so a company has nowhere to start');
    });

    it('catches price movement that contradicts itself', () => {
      const game = { id: 'x', name: 'x', revenueStops: [10], companies: [{ name: 'A', shortName: 'A' }] };
      const movement = (rule) => validate('x.json', { ...game, priceMovement: { soldOut: rule } });

      expect(movement({ move: 'sideways', squares: 1 }))
        .toContain('x.json: priceMovement.soldOut move "sideways" is not a direction');
      expect(movement({ move: null, squares: 2 }))
        .toContain('x.json: priceMovement.soldOut moves nowhere but counts squares');
      expect(movement({ move: 'up', squares: 1, maxSquares: 3 }))
        .toContain('x.json: priceMovement.soldOut caps a fixed number of squares');
      expect(movement({ move: 'up', squares: 'perFortnight' }))
        .toContain('x.json: priceMovement.soldOut squares "perFortnight" is not a count');
      expect(validate('x.json', { ...game, priceMovement: { whenever: { move: 'up', squares: 1 } } }))
        .toContain('x.json: priceMovement has an unknown trigger "whenever"');

      expect(movement({ move: 'up', squares: 1 })).toEqual([]);
      expect(movement({ move: 'right', squares: 'perMultipleOfPrice', maxSquares: 3, custom: 'why' })).toEqual([]);
    });

    it('catches a half pay flag written as anything other than true', () => {
      const game = { id: 'x', name: 'x', revenueStops: [10], companies: [{ name: 'A', shortName: 'A' }] };
      expect(validate('x.json', { ...game, allowsHalfPay: false }))
        .toContain('x.json: allowsHalfPay must be true or absent');
      expect(validate('x.json', { ...game, allowsHalfPay: 'yes' }))
        .toContain('x.json: allowsHalfPay must be true or absent');
      expect(validate('x.json', game)).toEqual([]);
    });

    it('catches a holding limit that is not a whole number of tenths', () => {
      const game = { id: 'x', name: 'x', revenueStops: [10], companies: [{ name: 'A', shortName: 'A' }] };
      const limit = (maxPlayerHolding) => validate('x.json', { ...game, maxPlayerHolding });

      expect(limit(65)).toContain('x.json: maxPlayerHolding "65" must be a multiple of 10 between 10 and 100');
      expect(limit(110)).toContain('x.json: maxPlayerHolding "110" must be a multiple of 10 between 10 and 100');
      expect(limit(0)).toContain('x.json: maxPlayerHolding "0" must be a multiple of 10 between 10 and 100');
      expect(limit('60')).toContain('x.json: maxPlayerHolding "60" must be a multiple of 10 between 10 and 100');

      expect(limit(60)).toEqual([]);
      expect(limit(100)).toEqual([]);
      expect(validate('x.json', game)).toEqual([]);
    });
  });

  // The picker reads the index while everything after it reads the game file, so a title renamed
  // in one and not the other is picked by a name it never shows again.
  describe('the index and the game files agree', () => {
    const index = JSON.parse(fs.readFileSync(path.join(__dirname, 'gamesIndex.json'), 'utf8'));
    const byId = Object.fromEntries(index.map((entry) => [entry.id, entry]));
    const ids = files.map((f) => f.replace(/\.json$/, ''));

    it('lists every game file exactly once, and nothing else', () => {
      expect([...index].map((e) => e.id).sort()).toEqual([...ids].sort());
    });

    it('gives each one the same name and bggId as its file', () => {
      const mismatched = ids.filter((id) => {
        const game = JSON.parse(fs.readFileSync(path.join(gamesDir, `${id}.json`), 'utf8'));
        return byId[id].name !== game.name || byId[id].bggId !== game.bggId;
      });
      expect(mismatched).toEqual([]);
    });
  });

  describe('the extra sold out jumps', () => {
    const game = { id: 'x', name: 'x', revenueStops: [10], companies: [{ name: 'A', shortName: 'A' }] };
    const extras = (extraSquares) => validate('x.json', {
      ...game,
      priceMovement: { soldOut: { move: 'up', squares: 1, extraSquares } }
    });

    it('takes a zone extra and a holdings extra, stacked', () => {
      expect(extras([
        { when: 'playerHoldsAtLeast', percent: 80, squares: 1 },
        { when: 'inZone', zone: 'o', squares: 1 }
      ])).toEqual([]);
    });

    it('refuses a condition it cannot test', () => {
      expect(extras([{ when: 'itFeelsRight', squares: 1 }]))
        .toContain('x.json: priceMovement.soldOut extra 0 tests "itFeelsRight", which is not a condition');
    });

    it('refuses a zone no cell could be marked with', () => {
      expect(extras([{ when: 'inZone', zone: 'q', squares: 1 }]))
        .toContain('x.json: priceMovement.soldOut extra 0 names zone "q", which no cell can carry');
    });

    it('refuses a holding that is not a percentage', () => {
      expect(extras([{ when: 'playerHoldsAtLeast', percent: 180, squares: 1 }]))
        .toContain('x.json: priceMovement.soldOut extra 0 wants "180" percent held');
    });

    it('refuses an extra that adds nothing', () => {
      expect(extras([{ when: 'inZone', zone: 'o', squares: 0 }]))
        .toContain('x.json: priceMovement.soldOut extra 0 adds "0", which is not a count');
    });

    it('gives 1894 both extras, and gives no other title any', () => {
      const read = (id) => JSON.parse(fs.readFileSync(path.join(gamesDir, `${id}.json`), 'utf8'));
      expect(read('1894').priceMovement.soldOut.extraSquares).toEqual([
        { when: 'playerHoldsAtLeast', percent: 80, squares: 1 },
        { when: 'inZone', zone: 'o', squares: 1 }
      ]);

      const others = files
        .map((f) => f.replace(/\.json$/, ''))
        .filter((id) => id !== '1894')
        .filter((id) => Object.values(read(id).priceMovement || {}).some((rule) => 'extraSquares' in rule));
      expect(others).toEqual([]);
    });
  });

  describe('the revenue bonus rules', () => {
    const game = { id: 'x', name: 'x', revenueStops: [10], companies: [{ name: 'A', shortName: 'A' }] };
    const bonus = (b) => validate('x.json', { ...game, revenueBonuses: [b] });

    it('takes a plain bonus that adds fixed amounts', () => {
      expect(bonus({ label: '+', adds: [10, 20] })).toEqual([]);
    });

    it('takes a bonus that doubles the best stop instead of adding an amount', () => {
      expect(bonus({ label: '2x', doubles: 'highestStop' })).toEqual([]);
    });

    it('refuses a doubling rule it does not know', () => {
      expect(bonus({ label: '2x', doubles: 'everything' }))
        .toContain('x.json: revenue bonus 0 doubles "everything", which is not a rule');
    });

    it('refuses a bonus that is worth two different things at once', () => {
      expect(bonus({ label: '2x', doubles: 'highestStop', adds: [20] }))
        .toContain('x.json: revenue bonus 0 both doubles and adds a fixed amount');
    });

    it('still refuses a bonus that is worth nothing at all', () => {
      expect(bonus({ label: '+' })).toContain('x.json: revenue bonus 0 has no numeric adds');
    });

    it('takes a per-train cap and refuses a nonsensical one', () => {
      expect(bonus({ label: '+', adds: [20], maxPerTrain: 1 })).toEqual([]);
      expect(bonus({ label: '+', adds: [20], maxPerTrain: 0 }))
        .toContain('x.json: revenue bonus 0 maxPerTrain "0" must be a whole number of at least 1');
      expect(bonus({ label: '+', adds: [20], maxPerTrain: 1.5 }))
        .toContain('x.json: revenue bonus 0 maxPerTrain "1.5" must be a whole number of at least 1');
    });
  });

  describe('the bonuses 1871 and 1894 pay', () => {
    const read = (id) => JSON.parse(fs.readFileSync(path.join(gamesDir, `${id}.json`), 'utf8'));

    it('gives 1871 a plus bonus worth 10 or 20', () => {
      expect(read('1871').revenueBonuses).toEqual([{ label: '+', adds: [10, 20] }]);
    });

    it('gives 1894 a plus, an offboard and a doubler, each once per train', () => {
      expect(read('1894').revenueBonuses).toEqual([
        { label: '+', adds: [20], maxPerTrain: 1 },
        { label: 'offboard', adds: [100], maxPerTrain: 1 },
        { label: '2x', doubles: 'highestStop', maxPerTrain: 1 }
      ]);
    });
  });

  describe('which titles let one player hold a whole company', () => {
    const read = (id) => JSON.parse(fs.readFileSync(path.join(gamesDir, `${id}.json`), 'utf8'));
    const wholeCompanyTitles = ['1824', '1824_2p', '1824_3p', '1871', '1880', '1894'];

    it('lets one player take the lot in 1824, 1871, 1880 and 1894', () => {
      wholeCompanyTitles.forEach((id) => expect(read(id).maxPlayerHolding).toBe(100));
    });

    // scripts/build-games.js rewrites a file from the .txt alone, so a regeneration would quietly
    // drop this hand-added field. Naming every title here is what makes that show up as a failure.
    it('stops every other title at 60', () => {
      const rest = files
        .map((f) => f.replace(/\.json$/, ''))
        .filter((id) => !wholeCompanyTitles.includes(id));

      expect(rest.filter((id) => read(id).maxPlayerHolding !== 60)).toEqual([]);
    });
  });

  describe('which titles allow half pay', () => {
    const read = (id) => JSON.parse(fs.readFileSync(path.join(gamesDir, `${id}.json`), 'utf8'));
    const allows = (id) => read(id).allowsHalfPay === true;

    it('allows it across the 1817 and 1822 series', () => {
      const series = files
        .map((f) => f.replace(/\.json$/, ''))
        .filter((id) => id.startsWith('1817') || id.startsWith('1822'));

      expect(series.length).toBeGreaterThan(1);
      expect(series.filter((id) => !allows(id))).toEqual([]);
    });

    it('allows it for 1840, whose rules the source data does not classify either way', () => {
      ['1840', '1840_2p', '1840_3p'].forEach((id) => expect(allows(id)).toBe(true));
    });

    it('leaves it off titles with no half pay rule', () => {
      ['1830', '1889', '18FL', '18Chesapeake'].forEach((id) => expect(allows(id)).toBe(false));
    });
  });
});
