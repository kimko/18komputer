import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const tmpDir = path.join(rootDir, 'tmp');

const gamesIndex = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/data/gamesIndex.json'), 'utf-8'));
const gamesConfigCache = {};

function getGameConfig(gameId) {
  if (gamesConfigCache[gameId]) return gamesConfigCache[gameId];
  const configPath = path.join(rootDir, `src/data/games/${gameId}.json`);
  if (!fs.existsSync(configPath)) return null;
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  gamesConfigCache[gameId] = config;
  return config;
}

const skippedFilesLog = [];

function logSkipped(file, reason) {
  skippedFilesLog.push(`Skipped ${file}: ${reason}`);
  console.log(`Skipped ${file}: ${reason}`);
}

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchCompany(csvName, config) {
  if (!csvName) return null;
  const companies = config.companies || [];
  const normalizedCsv = normalize(csvName);
  
  if (!normalizedCsv) return null;

  // 1. Exact or normalized match on shortName
  let match = companies.find(c => normalize(c.shortName) === normalizedCsv);
  if (match) return match.shortName;

  // 2. Exact or normalized match on name
  match = companies.find(c => normalize(c.name) === normalizedCsv);
  if (match) return match.shortName;

  // 3. Match from inside parentheses (e.g. 'Blue (BK)' -> 'BK')
  const parenMatch = csvName.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inside = normalize(parenMatch[1]);
    match = companies.find(c => normalize(c.shortName) === inside || normalize(c.name) === inside);
    if (match) return match.shortName;
  }

  // 4. Match by color (if mentioned in csvName)
  const colors = ['black', 'blue', 'brown', 'green', 'grey', 'gray', 'orange', 'pink', 'purple', 'red', 'yellow', 'white', 'salmonish'];
  for (const color of colors) {
    if (normalizedCsv.includes(color)) {
      // Find companies that have this color
      const colorMatches = companies.filter(c => normalize(c.color || '').includes(color) || normalize(c.name).includes(color));
      if (colorMatches.length === 1) {
        return colorMatches[0].shortName;
      }
    }
  }
  
  // 4. Try fuzzy matching words
  const words = csvName.toLowerCase().split(/\s+/);
  for (const c of companies) {
    if (words.some(w => w.length > 2 && (c.shortName.toLowerCase().includes(w) || c.name.toLowerCase().includes(w)))) {
       return c.shortName; // Very loose, might be risky, but let's try. Actually user said "try your best".
    }
  }

  return null;
}

function processFiles() {
  const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.csv'));
  const importedGames = [];

  for (const file of files) {
    console.log(`Processing ${file}...`);
    const csvContent = fs.readFileSync(path.join(tmpDir, file), 'utf-8');
    let records;
    try {
      records = parse(csvContent, { skip_empty_lines: true, relax_quotes: true, relax_column_count: true });
    } catch (e) {
      logSkipped(file, `CSV Parse Error: ${e.message}`);
      continue;
    }

    if (records.length < 3) {
      logSkipped(file, 'Not enough rows');
      continue;
    }

    // Determine Game ID from filename or cell
    // Let's check row 3 (index 2), column S (index 18) for fallback
    let fallbackGameId = '';
    if (records[2] && records[2].length > 18) {
      fallbackGameId = (records[2][18] || '').trim();
    }
    
    // Naive extract from filename
    let gameId = '';
    const matchId = file.match(/^(18[A-Za-z0-9]+|Lost Atlas|Harzbahn1873|21Moon)/i);
    if (matchId) {
      gameId = matchId[1];
      if (gameId.toLowerCase() === 'lost atlas') gameId = 'RailwaysLostAtlas';
    } else {
      gameId = fallbackGameId;
    }

    // Attempt to match with gamesIndex
    const indexEntry = gamesIndex.find(g => normalize(g.id) === normalize(gameId));
    if (!indexEntry) {
      logSkipped(file, `Unsupported game ID: ${gameId}`);
      continue;
    }
    gameId = indexEntry.id;
    const config = getGameConfig(gameId);
    if (!config) {
      logSkipped(file, `Config not found for game ID: ${gameId}`);
      continue;
    }

    // Find header row (usually contains 'Corporation' and 'Final share value')
    let headerRowIdx = -1;
    let colOffset = 0;
    for (let i = 0; i < Math.min(5, records.length); i++) {
      const row = records[i];
      if ((row[0] || '').toLowerCase().includes('corporation')) {
        headerRowIdx = i;
        colOffset = 0;
        break;
      } else if ((row[1] || '').toLowerCase().includes('corporation')) {
        headerRowIdx = i;
        colOffset = 1;
        break;
      }
    }

    if (headerRowIdx === -1) {
      logSkipped(file, 'Header row not found (missing Corporation column)');
      continue;
    }

    const headers = records[headerRowIdx];
    
    // Dynamic header parsing
    let shareValueCol = -1;
    let orCols = [];
    const playerCols = [];
    const players = [];

    for (let i = colOffset + 1; i < headers.length; i++) {
      const headerText = (headers[i] || '').trim().toLowerCase();
      if (!headerText) continue;

      if (shareValueCol === -1 && (headerText.includes('share value') || headerText.includes('value'))) {
        shareValueCol = i;
      } else if (headerText.startsWith('or') && headerText.length <= 4) {
        orCols.push(i);
      } else if (
        shareValueCol !== -1 && // Only start looking for players after share value is found
        i > (orCols.length > 0 ? Math.max(...orCols) : shareValueCol) && // Must be after ORs
        headerText !== 'total' && 
        headerText !== 'checksum' && 
        headerText !== '0'
      ) {
        const rawName = (headers[i] || '').trim();
        const playerName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
        players.push(playerName);
        playerCols.push(i);
      }
    }

    if (shareValueCol === -1) {
      logSkipped(file, 'Header row missing share value column');
      continue;
    }
    
    let numORs = orCols.length;

    if (players.length === 0) {
      logSkipped(file, 'No players found in header');
      continue;
    }

    const state = {
      activeCompanies: [],
      dashboardState: {
        shareValues: {},
        ors: {},
        maxOr: numORs || 3,
        playerAssets: {}
      },
      companyORs: []
    };

    players.forEach(p => {
      state.dashboardState.playerAssets[p] = { cash: 0, shares: {} };
    });

    let unmatchedCompany = false;
    let rowIdx = headerRowIdx + 1;
    for (; rowIdx < records.length; rowIdx++) {
      const row = records[rowIdx];
      const corpRaw = (row[colOffset] || '').trim();
      if (!corpRaw || corpRaw === '0') {
        // Check if we reached the totals section
        if (row.some(cell => (cell || '').toLowerCase().includes('total'))) {
          break;
        }
        continue; // Just skip empty rows or placeholder zeroes
      }

      // Players shares - parsed first to see if company is active
      const parsedShares = [];
      let totalSharesForRow = 0;
      for (let pIdx = 0; pIdx < players.length; pIdx++) {
        const colId = playerCols[pIdx];
        let sharesStr = (row[colId] || '').toString().replace(/[^0-9.-]+/g,"");
        let shares = parseInt(sharesStr, 10) || 0;
        
        // Safety check
        if (shares > 20) {
          const prevCol = parseInt((row[colId - 1] || '').toString().replace(/[^0-9.-]+/g,""), 10) || 0;
          const nextCol = parseInt((row[colId + 1] || '').toString().replace(/[^0-9.-]+/g,""), 10) || 0;
          if (prevCol >= 0 && prevCol <= 20) {
            shares = prevCol;
          } else if (nextCol >= 0 && nextCol <= 20) {
            shares = nextCol;
          } else {
            shares = 0;
          }
        }
        parsedShares.push(shares * 10);
        totalSharesForRow += shares;
      }

      if (totalSharesForRow === 0) {
        continue; // Skip this company row entirely, no player owns it
      }

      const mappedShortName = matchCompany(corpRaw, config);
      if (!mappedShortName) {
        logSkipped(file, `Unmatched company: '${corpRaw}'`);
        unmatchedCompany = true;
        break;
      }

      let shareValueStr = (row[shareValueCol] || '').replace(/[^0-9.-]+/g,"");
      let shareValue = parseInt(shareValueStr, 10) || 0;
      
      // Safety check for share value
      if (shareValue > 0 && shareValue < 10) {
        // Very unlikely that a share price is single digit. We might have picked up a 'bank shares' column or similar.
        // Try looking one column over
        const nextColVal = parseInt((row[shareValueCol + 1] || '').replace(/[^0-9.-]+/g,""), 10) || 0;
        if (nextColVal > 10) {
          shareValue = nextColVal;
        }
      }

      const companyDef = config.companies.find(c => c.shortName === mappedShortName) || { shortName: mappedShortName };
      state.activeCompanies.push({ ...companyDef, parValue: shareValue });
      state.dashboardState.shareValues[mappedShortName] = shareValue;
      
      // ORs
      state.dashboardState.ors[mappedShortName] = {};
      for (let o = 0; o < numORs; o++) {
        const orCol = orCols[o];
        let orVal = (row[orCol] || '').replace(/[^0-9.-]+/g,"");
        state.dashboardState.ors[mappedShortName][`or${o+1}`] = (parseInt(orVal, 10) || 0) * 10;
      }

      // Apply Players shares
      for (let pIdx = 0; pIdx < players.length; pIdx++) {
        state.dashboardState.playerAssets[players[pIdx]].shares[mappedShortName] = parsedShares[pIdx];
      }
    }

    if (unmatchedCompany) continue;

    // Find Cash row
    for (; rowIdx < records.length; rowIdx++) {
      const row = records[rowIdx];
      const isCashRow = row.some(cell => (cell || '').toLowerCase().includes('cash on hand'));
      if (isCashRow) {
        for (let pIdx = 0; pIdx < players.length; pIdx++) {
          const colId = playerCols[pIdx];
          let cashStr = (row[colId] || '').toString().replace(/[^0-9.-]+/g,"");
          state.dashboardState.playerAssets[players[pIdx]].cash = parseInt(cashStr, 10) || 0;
        }
        break;
      }
    }

    const stat = fs.statSync(path.join(tmpDir, file));

    // Validation: Each player should have a total of more than 5 shares (>50 in percentage)
    let validationFailed = false;
    for (const player of players) {
      const playerAssets = state.dashboardState.playerAssets[player];
      const totalSharesPct = Object.values(playerAssets.shares).reduce((sum, val) => sum + val, 0);
      
      if (totalSharesPct <= 50) {
        logSkipped(file, `Validation failed: Player ${player} has only ${totalSharesPct / 10} shares (<= 5). Parsing error likely.`);
        validationFailed = true;
        break;
      }
    }
    
    if (validationFailed) continue;

    importedGames.push({
      id: `game_${Date.now()}_${Math.floor(Math.random() * 1000)}_${importedGames.length}`,
      gameId,
      gameName: file.replace('.csv', ''),
      players,
      createdAt: stat.birthtime.toISOString(),
      version: 2,
      state
    });
  }

  fs.writeFileSync(path.join(tmpDir, 'skipped_files.txt'), skippedFilesLog.join('\n'));
  fs.writeFileSync(path.join(tmpDir, 'historical-games-import.json'), JSON.stringify(importedGames, null, 2));
  console.log(`\nImported ${importedGames.length} games. Skipped ${skippedFilesLog.length} files. Check tmp/skipped_files.txt for details.`);
}

processFiles();
