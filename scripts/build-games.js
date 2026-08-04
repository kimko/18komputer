import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseGameFile } from './parse-games.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GAMES_DIR = path.resolve(__dirname, '../../games');
const OUT_DIR = path.resolve(__dirname, '../src/data/games');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const files = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.txt'));

const index = [];

console.log(`Parsing ${files.length} game files...`);

for (const file of files) {
  const content = fs.readFileSync(path.join(GAMES_DIR, file), 'utf8');
  const gameId = file.replace('.txt', '');
  
  try {
    const gameData = parseGameFile(content);
    gameData.id = gameId; // Ensure ID is attached
    
    // Write individual game JSON
    fs.writeFileSync(
      path.join(OUT_DIR, `${gameId}.json`),
      JSON.stringify(gameData, null, 2)
    );

    // Add to index
    if (gameData.name) {
      index.push({
        id: gameData.id,
        name: gameData.name,
        bggId: gameData.bggId
      });
    }
  } catch (err) {
    console.error(`Failed to parse ${file}: ${err.message}`);
  }
}

// Write the global gamesIndex.json
fs.writeFileSync(
  path.join(OUT_DIR, '..', 'gamesIndex.json'),
  JSON.stringify(index, null, 2)
);

console.log('Successfully generated JSON files and gamesIndex.json.');
