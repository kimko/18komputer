import { describe, it, expect, beforeEach } from 'vitest';
import { createGame, getGame, updateGameState, getGamesList, updateGameName, importGame, deleteAllGames } from './mockApi.js';

describe('Mock API (LocalStorage)', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should create a new game instance', async () => {
    const game = await createGame('1830', ['Alice', 'Bob']);
    expect(game.id).toBeDefined();
    expect(game.gameId).toBe('1830');
    expect(game.players).toEqual(['Alice', 'Bob']);
    expect(game.state).toEqual({
      activeCompanies: [],
      playerAssets: {},
      companyORs: []
    });

    // Verify it was saved to localStorage
    const saved = JSON.parse(localStorage.getItem('18komputer_games'));
    expect(saved[game.id]).toBeDefined();
    expect(saved[game.id].gameId).toBe('1830');
  });

  it('should auto-generate a gameName on creation in the format "{title} {n}p {Mon-dd}"', async () => {
    const game = await createGame('1830', ['Alice', 'Bob', 'Charlie']);
    expect(game.gameName).toBeDefined();
    // Should match pattern: "1830 3p Mon-dd"
    expect(game.gameName).toMatch(/^1830 3p [A-Z][a-z]{2}-\d{2}$/);
  });

  it('should fetch an existing game by instance ID', async () => {
    const created = await createGame('1817', ['Charlie', 'Dave']);
    const fetched = await getGame(created.id);
    expect(fetched).toEqual(created);
  });

  it('should throw an error when fetching a non-existent game', async () => {
    await expect(getGame('invalid-id')).rejects.toThrow('Game not found');
  });

  it('should update the game state', async () => {
    const game = await createGame('1846', ['Dave', 'Eve']);
    
    const updates = {
      activeCompanies: ['PRR', 'NYC']
    };
    
    const updated = await updateGameState(game.id, updates);
    expect(updated.state.activeCompanies).toEqual(['PRR', 'NYC']);
    
    // Fetch it again to ensure persistence
    const fetched = await getGame(game.id);
    expect(fetched.state.activeCompanies).toEqual(['PRR', 'NYC']);
  });

  it('should return a list of all active games', async () => {
    await createGame('1830', ['Alice', 'Dave']);
    await createGame('1817', ['Bob', 'Eve']);
    
    const list = await getGamesList();
    expect(list).toHaveLength(2);
    expect(list[0].gameId).toBeDefined();
  });

  it('should update the gameName via updateGameName', async () => {
    const game = await createGame('1830', ['Alice', 'Bob']);
    const updated = await updateGameName(game.id, 'My Custom Name');
    expect(updated.gameName).toBe('My Custom Name');

    // Verify persistence
    const fetched = await getGame(game.id);
    expect(fetched.gameName).toBe('My Custom Name');
  });

  it('should run schema migrations on legacy data', async () => {
    // Write a game without a version
    const legacyGame = {
      id: 'legacy-game',
      gameId: '1830',
      players: ['Alice', 'Bob'],
      state: {
        activeCompanies: [],
        playerAssets: {},
        companyORs: []
      }
    };
    localStorage.setItem('18komputer_games', JSON.stringify({ 'legacy-game': legacyGame }));

    const fetched = await getGame('legacy-game');
    expect(fetched.version).toBe(2);
    
    // Test that the storage was updated
    const saved = JSON.parse(localStorage.getItem('18komputer_games'));
    expect(saved['legacy-game'].version).toBe(2);
  });

  it('should migrate legacy v1 games to add gameName', async () => {
    const legacyGame = {
      id: 'legacy-v1',
      gameId: '1889',
      players: ['Alice', 'Bob', 'Charlie'],
      version: 1,
      createdAt: '2026-03-15T12:00:00Z',
      state: { activeCompanies: [], playerAssets: {}, companyORs: [] }
    };
    localStorage.setItem('18komputer_games', JSON.stringify({ 'legacy-v1': legacyGame }));

    const fetched = await getGame('legacy-v1');
    expect(fetched.version).toBe(2);
    expect(fetched.gameName).toBe('1889 3p Mar-15');
  });

  describe('importGame', () => {
    it('should successfully import a valid game object', async () => {
      const validGame = {
        id: 'valid-import-1',
        gameId: '1830',
        players: ['Alice', 'Bob'],
        state: {
          dashboardState: {
            playerAssets: {
              'Alice': { cash: 100, shares: {} },
              'Bob': { cash: 100, shares: {} }
            }
          }
        }
      };

      const imported = await importGame(validGame);
      expect(imported.id).toBe('valid-import-1');

      const saved = JSON.parse(localStorage.getItem('18komputer_games'));
      expect(saved['valid-import-1']).toBeDefined();
      expect(saved['valid-import-1'].state.dashboardState.playerAssets).toBeDefined();
    });

    it('should reject an import missing state', () => {
      const invalidGame = {
        id: 'invalid-1',
        gameId: '1830',
        players: ['Alice']
      };
      
      expect(() => importGame(invalidGame)).toThrow('Invalid game data format');
    });

    it('should reject an import missing dashboardState.playerAssets', () => {
      const invalidGame = {
        id: 'invalid-2',
        gameId: '1830',
        players: ['Alice'],
        state: {
          playerAssets: {} // Wrong location
        }
      };
      
      expect(() => importGame(invalidGame)).toThrow('Invalid game data format: missing dashboardState.playerAssets');
    });
  });

  describe('deleteAllGames', () => {
    it('should delete all games', async () => {
      await createGame('1830', ['Alice', 'Bob']);
      await createGame('1889', ['Charlie', 'Dave']);
      
      let list = await getGamesList();
      expect(list.length).toBe(2);
      
      await deleteAllGames();
      
      list = await getGamesList();
      expect(list.length).toBe(0);
    });
  });
});
