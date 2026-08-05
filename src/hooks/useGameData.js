import { useState, useEffect, useCallback, useRef } from 'react';
import { getGame, updateGameState, updateGamePlayers } from '../api/mockApi.js';

export function useGameData(instanceId) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameInstance, setGameInstance] = useState(null);
  
  const timeoutRef = useRef(null);
  const previousStateRef = useRef(null);
  const pendingUpdatesRef = useRef(null);

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
    return () => {
      isMounted = false;
      // If we have pending updates when the component unmounts (e.g. user navigating tabs rapidly),
      // flush them immediately to the mockApi queue so the next mounted component reads the correct state.
      if (timeoutRef.current && pendingUpdatesRef.current) {
        clearTimeout(timeoutRef.current);
        const finalUpdates = pendingUpdatesRef.current;
        timeoutRef.current = null;
        pendingUpdatesRef.current = null;
        updateGameState(instanceId, finalUpdates).catch(console.error);
      }
    };
  }, [instanceId]);

  const updateGameStateDebounced = useCallback((updates) => {
    if (!gameInstance) return;
    
    // Save previous state for rollback if not already saving one
    if (!previousStateRef.current) {
      previousStateRef.current = gameInstance.state;
    }
    
    // Accumulate all pending updates during the debounce window
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
    
    // Optimistic update
    const nextState = { ...gameInstance.state, ...pendingUpdatesRef.current };
    setGameInstance(prev => ({ ...prev, state: nextState }));
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(async () => {
      const updatesToSend = pendingUpdatesRef.current;
      pendingUpdatesRef.current = null;
      timeoutRef.current = null;
      
      try {
        await updateGameState(instanceId, updatesToSend);
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
