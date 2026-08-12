import {
  GAMES_DIR,
  referenceDirs,
  findReferenceDir,
  readSource,
  gameFiles,
  readGame,
  writeGame,
  inheritanceChain
} from './referenceRepo.js';

const RULE_FILES = ['market.rb', 'entities.rb', 'game.rb', 'round/stock.rb'];

const SELL_MOVEMENTS = {
  down_share: { move: 'down', squares: 'perShare' },
  down_per_10: { move: 'down', squares: 'per10Percent' },
  down_block: { move: 'down', squares: 'perSale' },
  down_block_pres: { move: 'down', squares: 'perSaleIfPresident' },
  left_share: { move: 'left', squares: 'perShare' },
  left_share_pres: { move: 'left', squares: 'perShareIfPresident' },
  left_block: { move: 'left', squares: 'perSale' },
  left_block_pres: { move: 'left', squares: 'perSaleIfPresident' },
  left_per_10_if_pres_else_left_one: { move: 'left', squares: 'per10PercentIfPresidentElseOne' },
  none: { move: null, squares: 0 }
};

const POOL_DROPS = {
  none: { move: null, squares: 0 },
  down_block: { move: 'down', squares: 'perSale' },
  down_share: { move: 'down', squares: 'perShare' },
  left_block: { move: 'left', squares: 'perSale' }
};

const NOTHING = { move: null, squares: 0 };

// Behaviour the search pinned down exactly, but which lives in a method rather than a setting.
const CURATED = {
  g_1822_ca: { soldOut: { move: 'right', squares: 1, custom: 'sold out moves right rather than up (g_1822_ca/round/stock.rb:10)' } },
  g_1822_mx: { soldOut: { move: 'right', squares: 1, custom: 'sold out moves right rather than up (g_1822_mx/round/stock.rb:65)' } },
  g_1822_pnw: { soldOut: { move: 'right', squares: 1, custom: 'sold out moves right rather than up (g_1822_pnw/round/stock.rb:25)' } },
  g_18_ny: { soldOut: { move: 'up', squares: 1, custom: 'from the top row it moves down and right instead (g_18_ny/game.rb:41)' } },
  g_1846: { presidentBankrupt: { move: 'left', squares: 'perShare', custom: 'the company issues as many shares as it can first (g_1846/step/bankrupt.rb:19)' } }
};

const OVERRIDES = {
  soldOut: ['def sold_out_stock_movement', 'def sold_out?', 'def sold_out_increase?', 'def finish_round'],
  sharesSold: ['def sell_movement', 'def sell_shares_and_change_price']
};

function sourcesFor(dir, dirs) {
  return inheritanceChain(dir, dirs).flatMap((step) =>
    RULE_FILES.map((file) => ({ dir: step, file, source: readSource(step, file) })).filter((s) => s.source)
  );
}

function constant(sources, name) {
  const pattern = new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, 'm');
  for (const { source } of sources) {
    const found = source.match(pattern);
    if (found) return found[1].trim();
  }
  return null;
}

const symbol = (value) => (value && value.startsWith(':') ? value.slice(1).replace(/\W.*$/, '') : null);

function overrideIn(sources, needles) {
  const hit = sources.find(({ source }) => needles.some((needle) => source.includes(needle)));
  return hit ? `${hit.dir}/${hit.file}` : null;
}

function dividendBody(dir, dirs) {
  for (const step of inheritanceChain(dir, dirs)) {
    const source = readSource(step, 'step/dividend.rb');
    const start = source?.indexOf('def share_price_change');
    if (start === undefined || start === -1) continue;

    const indent = source.slice(0, start).match(/([ ]*)$/)[1];
    const end = source.indexOf(`\n${indent}end`, start);
    return { body: source.slice(start, end === -1 ? undefined : end), file: `${step}/step/dividend.rb` };
  }
  return null;
}

// The two idioms most titles use: a ladder of `times = N if revenue >= price * N`, or an if/elsif chain.
function readDividend(dir, dirs) {
  const found = dividendBody(dir, dirs);
  if (!found) {
    return { paid: { move: 'right', squares: 1 }, withheld: { move: 'left', squares: 1 } };
  }

  const { body, file } = found;
  const rungs = [...body.matchAll(/times\s*=\s*(\d+)\s+if\s+(.+)/g)].map(([, times, condition]) => ({
    times: Number(times),
    condition: condition.trim()
  }));
  const returned = [...body.matchAll(/share_direction:\s*:right,\s*share_times:\s*(\d+)/g)]
    .map(([, times]) => ({ times: Number(times), condition: 'chain' }));

  const steps = [...rungs, ...returned].filter((rung) => rung.times > 0);
  const maxSquares = steps.reduce((most, rung) => Math.max(most, rung.times), 0);

  const notes = [];
  if (/return \{\}\s*if[^\n]*minor/.test(body)) notes.push('minors do not move');
  const gate = body.match(/times\s*=\s*(\d+)\s+if[^\n]*?price\s*>=\s*(\d+)/);
  if (gate) notes.push(`square ${gate[1]} needs a price of $${gate[2]} or more`);
  if (/share_direction:\s*:(?!right|left)/.test(body)) notes.push('some payouts move a different way');
  if (/share_direction:\s*:left[\s\S]{0,40}if[^\n]*price/.test(body)) {
    notes.push('a small payout moves left, and a middling one moves nothing');
  }
  if (/revenue ==/.test(body)) notes.push('only a full payout moves the price');

  const recognised = maxSquares > 0 && /share_direction:\s*:right/.test(body);
  if (!recognised) {
    return {
      paid: { move: 'right', squares: 1, custom: `the payout rule is not one of the shapes we read (${file})` },
      withheld: { move: 'left', squares: 1, custom: `the withhold rule is not one of the shapes we read (${file})` }
    };
  }

  if (steps.some((rung) => rung.condition !== 'chain' && !/^revenue >= (price|curr_price)( \* \d+)?$/.test(rung.condition))) {
    notes.push('the payout steps carry extra conditions');
  }

  const banded = rungs.length > 0 && rungs.every((rung) => /revenue >= \d/.test(rung.condition));
  const halfSteps = rungs.some((rung) => /price \* 0\.5|price \/ 2/.test(rung.condition));
  const counted = banded ? 'perRevenueBand' : (halfSteps ? 'perHalfMultipleOfPrice' : 'perMultipleOfPrice');

  const paid = maxSquares > 1
    ? { move: 'right', squares: counted, maxSquares }
    : { move: 'right', squares: 1 };
  if (notes.length) paid.custom = `${notes.join('; ')} (${file})`;

  const withheld = /share_direction:\s*:left/.test(body)
    ? { move: 'left', squares: 1 }
    : { move: null, squares: 0, custom: `no withhold move found (${file})` };

  return { paid, withheld };
}

function importMovement(gameId, dirs) {
  const dir = findReferenceDir(gameId, dirs);
  if (!dir) return null;

  const sources = sourcesFor(dir, dirs);
  const dividend = readDividend(dir, dirs);

  const sellMovement = symbol(constant(sources, 'SELL_MOVEMENT')) || 'down_share';
  const soldOutIncrease = constant(sources, 'SOLD_OUT_INCREASE') !== 'false';
  const poolDrop = symbol(constant(sources, 'POOL_SHARE_DROP')) || 'none';
  const topRow = symbol(constant(sources, 'SOLD_OUT_TOP_ROW_MOVEMENT')) || 'none';

  const movement = {
    soldOut: soldOutIncrease ? { move: 'up', squares: 1 } : { ...NOTHING },
    dividendPaid: dividend.paid,
    dividendWithheld: dividend.withheld,
    sharesSold: SELL_MOVEMENTS[sellMovement]
      ? { ...SELL_MOVEMENTS[sellMovement] }
      : { move: null, squares: 0, custom: `the reference uses ${sellMovement}, which its own engine does not implement (${dir}/game.rb)` },
    sharesInPool: { ...(POOL_DROPS[poolDrop] || NOTHING) },
    presidentBankrupt: { ...NOTHING },
    corporationCloses: { ...NOTHING }
  };

  if (topRow === 'down_right' && !CURATED[dir]?.soldOut) {
    movement.soldOut.custom = `from the top row it moves down and right instead (${dir}/game.rb)`;
  }

  Object.entries(OVERRIDES).forEach(([trigger, needles]) => {
    const where = overrideIn(sources, needles);
    if (where && !movement[trigger].custom) {
      movement[trigger].custom = `the reference decides this in code rather than a setting (${where})`;
    }
  });

  Object.entries(CURATED[dir] || {}).forEach(([trigger, rule]) => {
    movement[trigger] = rule;
  });

  return movement;
}

const dirs = referenceDirs();
const files = gameFiles();
const unmatched = [];
const custom = [];
let written = 0;

for (const file of files) {
  const gameId = file.replace(/\.json$/, '');
  const movement = importMovement(gameId, dirs);

  if (!movement) {
    unmatched.push(gameId);
    continue;
  }

  const game = readGame(file);
  game.priceMovement = movement;
  writeGame(file, game);
  written += 1;

  const flagged = Object.entries(movement).filter(([, rule]) => rule.custom).map(([trigger]) => trigger);
  if (flagged.length) custom.push(`${gameId}: ${flagged.join(', ')}`);
}

console.log(`Read ${files.length} titles from ${GAMES_DIR}`);
console.log(`  written: ${written}`);
console.log(`  no title in the reference repo: ${unmatched.length} (${unmatched.join(', ')})`);
console.log(`  carrying at least one custom note: ${custom.length}`);
custom.forEach((line) => console.log(`    ${line}`));
