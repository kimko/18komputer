import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REFERENCE_DIR = path.resolve(__dirname, '../18xx/lib/engine/game');
export const GAMES_DIR = path.resolve(__dirname, '../src/data/games');

// Our ids and the reference repo's directory names disagree where a title is known by another name.
const ALIASES = {
  '18Espania': '18_esp',
  Harzbahn1873: '1873',
  TheHiawathas: '18_hiawatha'
};

// Variants that share their parent's rules, e.g. the two and three player cuts of 1824.
const VARIANT_SUFFIX = /_(2p|3p|me|sp|ms|np|bonds|etrain|modern_trains|rails|bohemia)$/;

const normalise = (id) => id.toLowerCase().replace(/[^a-z0-9]/g, '');

export function referenceDirs() {
  const byName = {};
  for (const entry of fs.readdirSync(REFERENCE_DIR, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith('g_')) {
      byName[normalise(entry.name.slice(2))] = entry.name;
    }
  }
  return byName;
}

export function findReferenceDir(gameId, dirs) {
  const candidates = [
    ALIASES[gameId],
    gameId,
    gameId.replace(VARIANT_SUFFIX, ''),
    (gameId.match(/^(\d+|18[A-Za-z]+)/) || [])[1]
  ];
  for (const candidate of candidates) {
    if (candidate && dirs[normalise(candidate)]) return dirs[normalise(candidate)];
  }
  return null;
}

export function readSource(dir, file) {
  const target = path.join(REFERENCE_DIR, dir, file);
  return fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
}

export function gameFiles() {
  return fs.readdirSync(GAMES_DIR).filter((file) => file.endsWith('.json'));
}

export function readGame(file) {
  return JSON.parse(fs.readFileSync(path.join(GAMES_DIR, file), 'utf8'));
}

export function writeGame(file, game) {
  fs.writeFileSync(path.join(GAMES_DIR, file), `${JSON.stringify(game, null, 2)}\n`);
}

// A title mixes its rules in from whichever of these files it happens to use.
const RULE_FILES = ['market.rb', 'entities.rb', 'game.rb'];

const parentDir = (source, dirs) => {
  const parent = source.match(/class Game\s*<\s*G(\w+)::Game/);
  return parent ? dirs[normalise(parent[1])] : null;
};

// Walks the Ruby subclass chain, because 15 of our titles declare none of their own rules.
export function inheritanceChain(dir, dirs) {
  const chain = [];
  let current = dir;
  while (current && !chain.includes(current)) {
    chain.push(current);
    const source = readSource(current, 'game.rb');
    current = source ? parentDir(source, dirs) : null;
  }
  return chain;
}

export function sourcesFor(dir, dirs, extraFiles = []) {
  return inheritanceChain(dir, dirs).flatMap((step) =>
    [...RULE_FILES, ...extraFiles]
      .map((file) => ({ dir: step, file, source: readSource(step, file) }))
      .filter(({ source }) => source)
  );
}
