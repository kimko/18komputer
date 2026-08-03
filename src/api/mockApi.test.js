import { describe, it, expect, beforeEach } from 'vitest';
import { createGame, getGame, updateGameState, getGamesList } from './mockApi.js';

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

  it('should fetch an existing game by instance ID', async () => {
    const created = await createGame('1817', ['Charlie']);
    const fetched = await getGame(created.id);
    expect(fetched).toEqual(created);
  });

  it('should throw an error when fetching a non-existent game', async () => {
    await expect(getGame('invalid-id')).rejects.toThrow('Game not found');
  });

  it('should update the game state', async () => {
    const game = await createGame('1846', ['Dave']);
    
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
    await createGame('1830', ['Alice']);
    await createGame('1817', ['Bob']);
    
    const list = await getGamesList();
    expect(list).toHaveLength(2);
    expect(list[0].gameId).toBeDefined();
  });
});
