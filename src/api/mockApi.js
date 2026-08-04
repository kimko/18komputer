const STORAGE_KEY = '18komputer_games';

// Helper to simulate network latency
const delay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Queue to serialize operations and prevent race conditions
let apiQueue = Promise.resolve();

const enqueue = (operation) => {
  return new Promise((resolve, reject) => {
    apiQueue = apiQueue.then(async () => {
      try {
        const result = await operation();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  });
};

// Run schema migrations for backwards compatibility
const runMigrations = (game) => {
  let migrated = false;
  
  if (!game.version) {
    game.version = 1;
    migrated = true;
  }
  
  // Example for future migrations:
  // if (game.version === 1) {
  //   game.version = 2;
  //   migrated = true;
  // }
  
  return { game, migrated };
};

// Helper to get all games from local storage
const readStorage = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return {};
  try {
    const parsed = JSON.parse(data);
    let needsSave = false;
    
    Object.keys(parsed).forEach(key => {
      const { game, migrated } = runMigrations(parsed[key]);
      parsed[key] = game;
      if (migrated) needsSave = true;
    });
    
    if (needsSave) {
      writeStorage(parsed);
    }
    
    return parsed;
  } catch (err) {
    console.error('Failed to parse localStorage data:', err);
    return {};
  }
};

// Helper to save all games to local storage
const writeStorage = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// Helper for deep merging objects
function deepMerge(target, source) {
  const output = { ...target };
  if (target && typeof target === 'object' && !Array.isArray(target) && source && typeof source === 'object' && !Array.isArray(source)) {
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

export function createGame(gameId, players) {
  if (!gameId || typeof gameId !== 'string') throw new Error('Invalid gameId');
  if (!Array.isArray(players) || players.length < 2) throw new Error('Invalid players array');
  return enqueue(async () => {
    await delay();
    const db = readStorage();
    
    // Generate a simple unique instance ID
    const id = `game_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    const newGame = {
      id,
      gameId,
      players,
      createdAt: new Date().toISOString(),
      version: 1,
      state: {
        activeCompanies: [],
        playerAssets: {},
        companyORs: []
      }
    };
    
    db[id] = newGame;
    writeStorage(db);
    
    return newGame;
  });
}

export function getGame(instanceId) {
  return enqueue(async () => {
    await delay();
    const db = readStorage();
    
    if (!db[instanceId]) {
      throw new Error('Game not found');
    }
    
    return db[instanceId];
  });
}

export function updateGameState(instanceId, updates) {
  if (!instanceId || typeof instanceId !== 'string') throw new Error('Invalid instanceId');
  if (!updates || typeof updates !== 'object') throw new Error('Invalid updates object');
  return enqueue(async () => {
    await delay();
    const db = readStorage();
    
    if (!db[instanceId]) {
      throw new Error('Game not found');
    }
    
    // Merge the new state updates into the existing state
    db[instanceId].state = deepMerge(db[instanceId].state, updates);
    
    writeStorage(db);
    
    return db[instanceId];
  });
}

export function updateGamePlayers(instanceId, players) {
  return enqueue(async () => {
    await delay();
    const db = readStorage();
    
    if (!db[instanceId]) {
      throw new Error('Game not found');
    }
    
    db[instanceId].players = players;
    writeStorage(db);
    
    return db[instanceId];
  });
}

export function getGamesList() {
  return enqueue(async () => {
    await delay();
    const db = readStorage();
    
    // Return as an array, sorted by creation date descending
    return Object.values(db).sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  });
}
