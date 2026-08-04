import { useEffect, useState } from 'react';
import { Box, Center, Spinner } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { getGame, updateGameState, updateGamePlayers } from '../api/mockApi.js';

import NumpadPopup from './popups/NumpadPopup.jsx';
import PricePickerPopup from './popups/PricePickerPopup.jsx';
import ShareCountPopup from './popups/ShareCountPopup.jsx';
import CompanyValuesGrid from './grids/CompanyValuesGrid.jsx';
import PlayerHoldingsGrid from './grids/PlayerHoldingsGrid.jsx';
import { getShareValue, getCalculatorGrandTotal, getBankShares } from '../utils/dashboardMath.js';

export default function Dashboard() {
  const [match, params] = useRoute('/game/:id/dashboard');
  const [loading, setLoading] = useState(true);
  const [gameInstance, setGameInstance] = useState(null);
  const [dashboardState, setDashboardState] = useState({
    ors: {},
    shareValues: {},
    playerAssets: {}
  });
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [activePopup, setActivePopup] = useState(null);

  useEffect(() => {
    if (!match || !params?.id) return;
    
    async function loadData() {
      try {
        const data = await getGame(params.id);
        const configModule = await import(`../data/games/${data.gameId}.json`);
        data.staticConfig = configModule.default || configModule;
        setGameInstance(data);
        if (data.state?.dashboardState) {
          setDashboardState(data.state.dashboardState);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [match, params?.id]);

  if (!match) return null;
  if (loading) return <Center h="100vh" bg="gray.900"><Spinner color="teal.400" size="xl" /></Center>;
  if (!gameInstance) return <Center h="100vh" bg="gray.900" color="white">Error loading game data.</Center>;

  const activeCompanies = gameInstance.state?.activeCompanies || [];
  const maxOr = dashboardState.maxOr || gameInstance.staticConfig?.maxOr || 3;
  const players = gameInstance.players || [];
  const sharePriceOptions = gameInstance.staticConfig?.sharePrices || gameInstance.staticConfig?.parValues || [];
  const maxPlayerHolding = gameInstance.staticConfig?.maxPlayerHolding 
    ? parseInt(gameInstance.staticConfig.maxPlayerHolding, 10) 
    : 60;

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    const name = newPlayerName.trim();
    if (name && !players.includes(name)) {
      const updatedPlayers = [...players, name];
      setGameInstance(prev => ({ ...prev, players: updatedPlayers }));
      setNewPlayerName('');
      await updateGamePlayers(gameInstance.id, updatedPlayers).catch(console.error);
    }
  };

  const handleRemovePlayer = async (playerToRemove) => {
    const updatedPlayers = players.filter(p => p !== playerToRemove);
    setGameInstance(prev => ({ ...prev, players: updatedPlayers }));
    await updateGamePlayers(gameInstance.id, updatedPlayers).catch(console.error);
  };

  const updateMaxOr = (newMax) => {
    if (newMax < 1) return;
    const next = { ...dashboardState, maxOr: newMax };
    setDashboardState(next);
    updateGameState(gameInstance.id, { dashboardState: next });
  };

  return (
    <Box p="2" pb="24" maxW="100%" overflowX="hidden">
      <CompanyValuesGrid 
        activeCompanies={activeCompanies}
        maxOr={maxOr}
        dashboardState={dashboardState}
        updateMaxOr={updateMaxOr}
        setActivePopup={setActivePopup}
      />

      <PlayerHoldingsGrid 
        players={players}
        activeCompanies={activeCompanies}
        maxOr={maxOr}
        dashboardState={dashboardState}
        showDetails={showDetails}
        setShowDetails={setShowDetails}
        newPlayerName={newPlayerName}
        setNewPlayerName={setNewPlayerName}
        handleAddPlayer={handleAddPlayer}
        handleRemovePlayer={handleRemovePlayer}
        setActivePopup={setActivePopup}
      />

      {/* Popups */}
      {activePopup?.type === 'shareValue' && (
        <PricePickerPopup
          company={activeCompanies.find(c => c.shortName === activePopup.companyId)}
          value={getShareValue(dashboardState, activeCompanies, activePopup.companyId)}
          options={sharePriceOptions}
          onChange={(val) => {
            const next = { ...dashboardState.shareValues, [activePopup.companyId]: val };
            setDashboardState(prev => ({ ...prev, shareValues: next }));
            updateGameState(gameInstance.id, { dashboardState: { ...dashboardState, shareValues: next } });
          }}
          onClose={() => setActivePopup(null)}
        />
      )}

      {activePopup?.type === 'or' && (
        <NumpadPopup
          title={`Set OR ${activePopup.orIndex} revenue for`}
          subtitle={activePopup.companyId}
          badgeColor={activeCompanies.find(c => c.shortName === activePopup.companyId)?.color}
          value={dashboardState.ors[activePopup.companyId]?.[`or${activePopup.orIndex}`]}
          onSubtitleClick={() => {
            const val = getCalculatorGrandTotal(gameInstance, activePopup.companyId);
            if (val > 0) {
              const ors = { ...dashboardState.ors };
              ors[activePopup.companyId] = { ...(ors[activePopup.companyId] || {}) };
              ors[activePopup.companyId][`or${activePopup.orIndex}`] = val;
              setDashboardState(prev => ({ ...prev, ors }));
              updateGameState(gameInstance.id, { dashboardState: { ...dashboardState, ors } });
            }
          }}
          onCopyLast={activePopup.orIndex > 1 ? () => {
            const val = dashboardState.ors[activePopup.companyId]?.[`or${activePopup.orIndex - 1}`] || '';
            const ors = { ...dashboardState.ors };
            ors[activePopup.companyId] = { ...(ors[activePopup.companyId] || {}) };
            ors[activePopup.companyId][`or${activePopup.orIndex}`] = val;
            setDashboardState(prev => ({ ...prev, ors }));
            updateGameState(gameInstance.id, { dashboardState: { ...dashboardState, ors } });
          } : undefined}
          onChange={(val) => {
            const ors = { ...dashboardState.ors };
            ors[activePopup.companyId] = { ...(ors[activePopup.companyId] || {}) };
            ors[activePopup.companyId][`or${activePopup.orIndex}`] = val;
            setDashboardState(prev => ({ ...prev, ors }));
            updateGameState(gameInstance.id, { dashboardState: { ...dashboardState, ors } });
          }}
          onClose={() => setActivePopup(null)}
        />
      )}

      {activePopup?.type === 'cash' && (
        <NumpadPopup
          title="Set cash for"
          subtitle={activePopup.player}
          value={dashboardState.playerAssets[activePopup.player]?.cash}
          onChange={(val) => {
            const playerAssets = { ...dashboardState.playerAssets };
            if (!playerAssets[activePopup.player]) playerAssets[activePopup.player] = { shares: {} };
            playerAssets[activePopup.player].cash = val;
            setDashboardState(prev => ({ ...prev, playerAssets }));
            updateGameState(gameInstance.id, { dashboardState: { ...dashboardState, playerAssets } });
          }}
          onClose={() => setActivePopup(null)}
        />
      )}

      {activePopup?.type === 'shares' && (
        <ShareCountPopup
          company={activeCompanies.find(c => c.shortName === activePopup.companyId)}
          player={activePopup.player}
          maxAvailable={Math.min(maxPlayerHolding, getBankShares(dashboardState, players, activePopup.companyId) + Number(dashboardState.playerAssets[activePopup.player]?.shares?.[activePopup.companyId] || 0))}
          value={dashboardState.playerAssets[activePopup.player]?.shares?.[activePopup.companyId]}
          onChange={(val) => {
            const playerAssets = { ...dashboardState.playerAssets };
            if (!playerAssets[activePopup.player]) playerAssets[activePopup.player] = { shares: {} };
            playerAssets[activePopup.player].shares[activePopup.companyId] = val;
            setDashboardState(prev => ({ ...prev, playerAssets }));
            updateGameState(gameInstance.id, { dashboardState: { ...dashboardState, playerAssets } });
          }}
          onClose={() => setActivePopup(null)}
        />
      )}
    </Box>
  );
}
