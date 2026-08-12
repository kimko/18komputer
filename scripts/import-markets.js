import {
  GAMES_DIR,
  referenceDirs,
  findReferenceDir,
  readSource,
  gameFiles,
  readGame,
  writeGame
} from './referenceRepo.js';

// A title keeps its market in whichever of these files it happens to use.
const MARKET_FILES = ['market.rb', 'entities.rb', 'game.rb'];

function marketBody(source) {
  const start = source.search(/\bMARKET\s*=\s*\[/);
  if (start === -1) return null;

  const open = source.indexOf('[', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '[') depth += 1;
    if (source[i] === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return null;
}

// Rows are written either as %w[60y 67 71] or as ['', '10b', '20b'], and either may span lines.
function parseRows(body) {
  const rows = [];
  for (let i = 0; i < body.length; i += 1) {
    const isWordArray = body.startsWith('%w[', i) || body.startsWith('%i[', i);
    if (!isWordArray && body[i] !== '[') continue;

    const open = body.indexOf('[', i);
    const close = body.indexOf(']', open);
    if (close === -1) return rows;

    const inner = body.slice(open + 1, close);
    rows.push(
      isWordArray
        ? inner.split(/\s+/).filter((cell) => cell !== '')
        : inner.split(',').map((cell) => cell.trim().replace(/^['"]|['"]$/g, ''))
    );
    i = close;
  }
  return rows;
}

const isCell = (cell) => cell === '' || /^\d+[a-zA-Z]*$/.test(cell);

function importMarket(gameId, dirs) {
  const dir = findReferenceDir(gameId, dirs);
  if (!dir) return { status: 'no title match' };

  const game = readSource(dir, 'game.rb');
  if (!game) return { status: 'no game.rb' };

  if (/hex_market:\s*true/.test(game)) return { status: 'hex market, left alone' };
  if (/zigzag:/.test(game)) return { status: 'zigzag market, left alone' };

  const body = MARKET_FILES.map((file) => readSource(dir, file))
    .filter(Boolean)
    .map(marketBody)
    .find(Boolean);
  if (!body) return { status: 'no MARKET table' };

  const rows = parseRows(body);
  if (!rows.length) return { status: 'unreadable MARKET table' };
  if (!rows.every((row) => row.every(isCell))) return { status: 'unsupported cell format' };

  return {
    status: 'imported',
    dir,
    stockMarket: { type: rows.length > 1 ? '2d' : '1d', grid: rows }
  };
}

const dirs = referenceDirs();
const files = gameFiles();
const skipped = [];
let twoD = 0;
let oneD = 0;

for (const file of files) {
  const gameId = file.replace(/\.json$/, '');
  const result = importMarket(gameId, dirs);

  if (result.status !== 'imported') {
    skipped.push(`${gameId}: ${result.status}`);
    continue;
  }

  const game = readGame(file);
  game.stockMarket = result.stockMarket;
  writeGame(file, game);

  if (result.stockMarket.type === '2d') twoD += 1;
  else oneD += 1;
}

console.log(`Read ${files.length} titles from ${GAMES_DIR}`);
console.log(`  two dimensional: ${twoD}`);
console.log(`  one dimensional: ${oneD}`);
console.log(`  left alone: ${skipped.length}`);
skipped.forEach((line) => console.log(`    ${line}`));
