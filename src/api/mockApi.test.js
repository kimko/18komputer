import { describe, it, expect, beforeEach } from 'vitest';
import LZString from 'lz-string';
import { createGame, getGame, updateGameState, updateGamePlayers, getGamesList, updateGameName, importGame, deleteAllGames } from './mockApi.js';

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

  describe('updateGamePlayers', () => {
    const withHoldings = async () => {
      const game = await createGame('1830', ['Alice', 'Bob']);
      await updateGameState(game.id, {
        dashboardState: {
          ors: {}, shareValues: {},
          playerAssets: {
            Alice: { cash: 500, shares: { PRR: 40 } },
            Bob: { cash: 300, shares: { PRR: 20, NYC: 30 } }
          }
        }
      });
      return game;
    };

    it('should delete the holdings of a removed player', async () => {
      const game = await withHoldings();

      await updateGamePlayers(game.id, ['Alice']);

      const fetched = await getGame(game.id);
      expect(fetched.players).toEqual(['Alice']);
      expect(fetched.state.dashboardState.playerAssets.Bob).toBeUndefined();
    });

    it('should leave the remaining players untouched', async () => {
      const game = await withHoldings();

      await updateGamePlayers(game.id, ['Alice']);

      const { playerAssets } = (await getGame(game.id)).state.dashboardState;
      expect(playerAssets.Alice).toEqual({ cash: 500, shares: { PRR: 40 } });
    });

    it('should leave every entry alone when a player is added', async () => {
      const game = await withHoldings();

      await updateGamePlayers(game.id, ['Alice', 'Bob', 'Cara']);

      const { playerAssets } = (await getGame(game.id)).state.dashboardState;
      expect(Object.keys(playerAssets).sort()).toEqual(['Alice', 'Bob']);
      expect(playerAssets.Bob.shares).toEqual({ PRR: 20, NYC: 30 });
    });

    it('should prune holdings left behind by an earlier removal', async () => {
      const game = await withHoldings();
      // A game saved before this fix: holdings for somebody who is not a player any more.
      await updateGameState(game.id, {
        dashboardState: { playerAssets: { Ghost: { cash: 99, shares: { PRR: 60 } } } }
      });

      await updateGamePlayers(game.id, ['Alice', 'Bob']);

      const { playerAssets } = (await getGame(game.id)).state.dashboardState;
      expect(playerAssets.Ghost).toBeUndefined();
      expect(Object.keys(playerAssets).sort()).toEqual(['Alice', 'Bob']);
    });

    it('should not throw for a game that has no dashboard state yet', async () => {
      const game = await createGame('1830', ['Alice', 'Bob']);
      await expect(updateGamePlayers(game.id, ['Alice'])).resolves.toBeDefined();
      expect((await getGame(game.id)).players).toEqual(['Alice']);
    });
  });

  // The magic link is the one path where a whole game can be silently corrupted: it is
  // compressed into a URL and rebuilt on a different device with no server to check it.
  describe('magic link round trip', () => {
    const compress = (game) => LZString.compressToEncodedURIComponent(JSON.stringify(game));
    const decompress = (token) => JSON.parse(LZString.decompressFromEncodedURIComponent(token));

    const fullGame = {
      id: 'game_shared_1',
      gameId: '1817',
      gameName: '1817 4p Aug-07',
      players: ['Brett', 'Eduardo', 'Liam', 'Kim'],
      createdAt: '2026-08-07T23:02:46.066Z',
      version: 2,
      state: {
        activeCompanies: [
          { name: 'New York, Ontario & Western', shortName: 'NYOW', color: '#fef6c5', parValue: 50, totalShares: 5 },
          { name: 'Bessemer and Lake Erie Railroad', shortName: 'Bess', color: '#262510', parValue: 50, totalShares: 10 }
        ],
        calculatorState: { NYOW: { trains: [{ id: 1, stops: [80, 50], bonusStops: [{ val: 10, label: 'C' }] }], isHalfPay: true } },
        dashboardState: {
          maxOr: 3,
          ors: { NYOW: { or1: '380', or2: 380 } },
          shareValues: { NYOW: 440 },
          playerAssets: {
            Kim: { cash: '1923', shares: { NYOW: 60, Bess: 10 } },
            Liam: { cash: 2765, shares: {} }
          }
        }
      }
    };

    it('rebuilds the game exactly as it went in', () => {
      expect(decompress(compress(fullGame))).toEqual(fullGame);
    });

    it('keeps numbers and text-that-looks-like-numbers apart', () => {
      const back = decompress(compress(fullGame));
      expect(back.state.dashboardState.playerAssets.Kim.cash).toBe('1923');
      expect(back.state.dashboardState.playerAssets.Liam.cash).toBe(2765);
      expect(back.state.dashboardState.ors.NYOW.or1).toBe('380');
      expect(back.state.dashboardState.ors.NYOW.or2).toBe(380);
    });

    it('survives company names with punctuation and accents', () => {
      const accented = { ...fullGame, state: { ...fullGame.state,
        activeCompanies: [{ name: 'Chemin de fer Nord-Est — Société', shortName: 'CFN', color: '#fef6c5' }] } };
      expect(decompress(compress(accented)).state.activeCompanies[0].name)
        .toBe('Chemin de fer Nord-Est — Société');
    });

    it('is accepted by the importer and comes back out of storage unchanged', async () => {
      const imported = decompress(compress(fullGame));
      await importGame(imported);

      const fetched = await getGame(fullGame.id);
      expect(fetched.players).toEqual(fullGame.players);
      expect(fetched.state.dashboardState).toEqual(fullGame.state.dashboardState);
      expect(fetched.state.activeCompanies).toEqual(fullGame.state.activeCompanies);
    });

    it('rejects a token that has been truncated in transit', () => {
      const token = compress(fullGame);
      const cut = token.slice(0, Math.floor(token.length / 2));
      expect(() => decompress(cut)).toThrow();
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
