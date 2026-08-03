const STORAGE_KEY = '18komputer_games';

// Helper to simulate network latency
const delay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to get all games from local storage
const readStorage = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
};

// Helper to save all games to local storage
const writeStorage = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export async function createGame(gameId, players) {
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
}

export async function getGame(instanceId) {
  await delay();
  const db = readStorage();
  
  if (!db[instanceId]) {
    throw new Error('Game not found');
  }
  
  return db[instanceId];
}

export async function updateGameState(instanceId, updates) {
  await delay();
  const db = readStorage();
  
  if (!db[instanceId]) {
    throw new Error('Game not found');
  }
  
  // Merge the new state updates into the existing state
  db[instanceId].state = {
    ...db[instanceId].state,
    ...updates
  };
  
  writeStorage(db);
  
  return db[instanceId];
}

export async function updateGamePlayers(instanceId, players) {
  await delay();
  const db = readStorage();
  
  if (!db[instanceId]) {
    throw new Error('Game not found');
  }
  
  db[instanceId].players = players;
  writeStorage(db);
  
  return db[instanceId];
}

export async function getGamesList() {
  await delay();
  const db = readStorage();
  
  // Return as an array, sorted by creation date descending
  return Object.values(db).sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}
