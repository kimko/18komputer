import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameData } from './useGameData.js';
import * as mockApi from '../api/mockApi.js';

vi.mock('../api/mockApi.js', () => ({
  getGame: vi.fn(),
  updateGameState: vi.fn(),
  updateGamePlayers: vi.fn(),
  updateGameName: vi.fn()
}));

vi.mock('../data/games/1830.json', () => ({ default: { id: '1830', name: '1830' } }));

const gameWithTwoPlayers = () => ({
  id: 'inst_123',
  gameId: '1830',
  players: ['Alice', 'Bob'],
  state: {
    activeCompanies: [],
    dashboardState: {
      ors: {},
      shareValues: {},
      playerAssets: {
        Alice: { cash: 500, shares: { PRR: 40 } },
        Bob: { cash: 300, shares: { PRR: 20 } }
      }
    }
  }
});

describe('useGameData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getGame.mockResolvedValue(gameWithTwoPlayers());
    mockApi.updateGameState.mockResolvedValue({});
    mockApi.updateGamePlayers.mockResolvedValue({});
  });

  const loaded = async () => {
    const view = renderHook(() => useGameData('inst_123'));
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    return view;
  };

  it('drops the removed player from its own copy of the holdings', async () => {
    const { result } = await loaded();

    await act(async () => { await result.current.updatePlayers(['Alice']); });

    expect(result.current.gameInstance.players).toEqual(['Alice']);
    expect(result.current.gameInstance.state.dashboardState.playerAssets.Bob).toBeUndefined();
    expect(result.current.gameInstance.state.dashboardState.playerAssets.Alice).toBeDefined();
  });

  it('flushes a pending edit before changing the roster, so it cannot bring the player back', async () => {
    const { result } = await loaded();

    // An edit is still inside its debounce window when the player is removed.
    act(() => {
      result.current.updateGameStateDebounced({
        dashboardState: {
          ors: {}, shareValues: {},
          playerAssets: {
            Alice: { cash: 999, shares: { PRR: 40 } },
            Bob: { cash: 300, shares: { PRR: 20 } }
          }
        }
      });
    });

    await act(async () => { await result.current.updatePlayers(['Alice']); });

    // The edit was written, and it was written before the roster change that prunes Bob.
    expect(mockApi.updateGameState).toHaveBeenCalledTimes(1);
    const stateOrder = mockApi.updateGameState.mock.invocationCallOrder[0];
    const playersOrder = mockApi.updateGamePlayers.mock.invocationCallOrder[0];
    expect(stateOrder).toBeLessThan(playersOrder);

    // Alice's edit survived.
    const sent = mockApi.updateGameState.mock.calls[0][1];
    expect(sent.dashboardState.playerAssets.Alice.cash).toBe(999);
  });

  it('still writes the player list when there is nothing pending', async () => {
    const { result } = await loaded();

    await act(async () => { await result.current.updatePlayers(['Alice', 'Bob', 'Cara']); });

    expect(mockApi.updateGameState).not.toHaveBeenCalled();
    expect(mockApi.updateGamePlayers).toHaveBeenCalledWith('inst_123', ['Alice', 'Bob', 'Cara']);
  });

  it('puts the player list back if the write fails', async () => {
    mockApi.updateGamePlayers.mockRejectedValue(new Error('nope'));
    const { result } = await loaded();

    await act(async () => { await result.current.updatePlayers(['Alice']); });

    expect(result.current.gameInstance.players).toEqual(['Alice', 'Bob']);
  });
});
