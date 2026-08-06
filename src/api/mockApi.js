const STORAGE_KEY = '18komputer_games';
const USERS_STORAGE_KEY = '18komputer_users';

export const getUsers = () => {
  const data = localStorage.getItem(USERS_STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveUsers = (newUsers) => {
  if (!newUsers || newUsers.length === 0) return;
  const currentUsers = getUsers();
  const merged = Array.from(new Set([...currentUsers, ...newUsers]));
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged));
};

export const deleteUser = (userToDelete) => {
  const currentUsers = getUsers().filter(u => u !== userToDelete);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(currentUsers));
};

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
  
  if (game.version === 1) {
    if (!game.gameName) {
      const d = game.createdAt ? new Date(game.createdAt) : new Date();
      game.gameName = generateGameName(game.gameId, game.players?.length || 0, d);
    }
    game.version = 2;
    migrated = true;
  }
  
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

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function generateGameName(gameId, playerCount, date) {
  return `${gameId} ${playerCount}p ${MONTH_NAMES[date.getMonth()]}-${String(date.getDate()).padStart(2, '0')}`;
}

export function createGame(gameId, players) {
  if (!gameId || typeof gameId !== 'string') throw new Error('Invalid gameId');
  if (!Array.isArray(players) || players.length < 2) throw new Error('Invalid players array');
  return enqueue(async () => {
    await delay();
    const db = readStorage();
    
    // Save custom players to the global user roster
    saveUsers(players.filter(p => !p.startsWith('Player ')));
    
    // Generate a simple unique instance ID
    const id = `game_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    const now = new Date();
    const gameName = generateGameName(gameId, players.length, now);

    const newGame = {
      id,
      gameId,
      gameName,
      players,
      createdAt: now.toISOString(),
      version: 2,
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

export function deleteGame(instanceId) {
  if (!instanceId || typeof instanceId !== 'string') throw new Error('Invalid instanceId');
  return enqueue(async () => {
    await delay();
    const db = readStorage();

    if (!db[instanceId]) {
      throw new Error('Game not found');
    }

    delete db[instanceId];
    writeStorage(db);
  });
}

export function deleteAllGames() {
  return enqueue(async () => {
    await delay();
    writeStorage({});
  });
}

export function updateGameName(instanceId, gameName) {
  if (!instanceId || typeof instanceId !== 'string') throw new Error('Invalid instanceId');
  if (typeof gameName !== 'string') throw new Error('Invalid gameName');
  return enqueue(async () => {
    await delay();
    const db = readStorage();
    if (!db[instanceId]) throw new Error('Game not found');
    db[instanceId].gameName = gameName;
    writeStorage(db);
    return db[instanceId];
  });
}

export function importGame(gameData) {
  if (!gameData || !gameData.id || !gameData.state) {
    throw new Error('Invalid game data format');
  }
  
  if (!gameData.state.dashboardState || !gameData.state.dashboardState.playerAssets) {
    throw new Error('Invalid game data format: missing dashboardState.playerAssets');
  }

  if (!gameData.gameId) throw new Error('Missing required game fields');

  return enqueue(async () => {
    await delay();
    const db = readStorage();
    
    // Save imported players to the user roster
    if (gameData.players && Array.isArray(gameData.players)) {
      saveUsers(gameData.players.filter(p => !p.startsWith('Player ')));
    }
    
    // Simply overwrite or create using the imported game's ID
    db[gameData.id] = gameData;
    writeStorage(db);
    
    return gameData;
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
