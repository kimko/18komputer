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

// Helper to get all games from local storage
const readStorage = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
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
