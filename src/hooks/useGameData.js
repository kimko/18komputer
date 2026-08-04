import { useState, useEffect, useCallback, useRef } from 'react';
import { getGame, updateGameState, updateGamePlayers } from '../api/mockApi.js';

export function useGameData(instanceId) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameInstance, setGameInstance] = useState(null);
  
  const timeoutRef = useRef(null);
  const previousStateRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    if (!instanceId) return;

    async function loadData() {
      try {
        const data = await getGame(instanceId);
        const configModule = await import(`../data/games/${data.gameId}.json`);
        data.staticConfig = configModule.default || configModule;
        
        if (isMounted) {
          setGameInstance(data);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      }
    }
    
    loadData();
    return () => { isMounted = false; };
  }, [instanceId]);

  const updateGameStateDebounced = useCallback((updates) => {
    if (!gameInstance) return;
    
    // Save previous state for rollback if not already saving one
    if (!previousStateRef.current) {
      previousStateRef.current = gameInstance.state;
    }
    
    // Optimistic update
    const nextState = { ...gameInstance.state, ...updates };
    setGameInstance(prev => ({ ...prev, state: nextState }));
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(async () => {
      try {
        await updateGameState(instanceId, updates);
        previousStateRef.current = null; // Clear rollback state on success
      } catch (err) {
        console.error('Failed to update game state, rolling back:', err);
        setGameInstance(prev => ({ ...prev, state: previousStateRef.current }));
        previousStateRef.current = null;
      }
    }, 500);
  }, [instanceId, gameInstance]);

  const updatePlayers = useCallback(async (newPlayers) => {
    if (!gameInstance) return;
    const previousPlayers = gameInstance.players;
    setGameInstance(prev => ({ ...prev, players: newPlayers }));
    
    try {
      await updateGamePlayers(instanceId, newPlayers);
    } catch (err) {
      console.error('Failed to update players, rolling back:', err);
      setGameInstance(prev => ({ ...prev, players: previousPlayers }));
    }
  }, [instanceId, gameInstance]);

  return {
    loading,
    error,
    gameInstance,
    updateGameStateDebounced,
    updatePlayers
  };
}
