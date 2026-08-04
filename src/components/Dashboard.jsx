import { useState } from 'react';
import { Box, Center, Spinner } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { useGameData } from '../hooks/useGameData.js';

import NumpadPopup from './popups/NumpadPopup.jsx';
import PricePickerPopup from './popups/PricePickerPopup.jsx';
import ShareCountPopup from './popups/ShareCountPopup.jsx';
import CompanyValuesGrid from './grids/CompanyValuesGrid.jsx';
import PlayerHoldingsGrid from './grids/PlayerHoldingsGrid.jsx';
import { getShareValue, getCalculatorGrandTotal, getBankShares } from '../utils/dashboardMath.js';

export default function Dashboard() {
  const [match, params] = useRoute('/game/:id/dashboard');
  const { loading, gameInstance, updateGameStateDebounced, updatePlayers } = useGameData(params?.id);
  
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [activePopup, setActivePopup] = useState(null);

  if (!match) return null;
  if (loading) return <Center h="100vh" bg="gray.900"><Spinner color="teal.400" size="xl" /></Center>;
  if (!gameInstance) return <Center h="100vh" bg="gray.900" color="white">Error loading game data.</Center>;

  const dashboardState = gameInstance.state?.dashboardState || { ors: {}, shareValues: {}, playerAssets: {} };
  const activeCompanies = gameInstance.state?.activeCompanies || [];
  const maxOr = dashboardState.maxOr || gameInstance.staticConfig?.maxOr || 3;
  const players = gameInstance.players || [];
  const sharePriceOptions = gameInstance.staticConfig?.sharePrices || gameInstance.staticConfig?.parValues || [];
  const maxPlayerHolding = gameInstance.staticConfig?.maxPlayerHolding 
    ? parseInt(gameInstance.staticConfig.maxPlayerHolding, 10) 
    : 60;

  const handleAddPlayer = (e) => {
    e.preventDefault();
    const name = newPlayerName.trim();
    if (name && !players.includes(name)) {
      updatePlayers([...players, name]);
      setNewPlayerName('');
    }
  };

  const handleRemovePlayer = (playerToRemove) => {
    updatePlayers(players.filter(p => p !== playerToRemove));
  };

  const updateMaxOr = (newMax) => {
    if (newMax < 1) return;
    updateGameStateDebounced({ dashboardState: { ...dashboardState, maxOr: newMax } });
  };

  const updateDashboardField = (field, updater) => {
    const nextFieldState = typeof updater === 'function' ? updater(dashboardState[field] || {}) : updater;
    updateGameStateDebounced({ dashboardState: { ...dashboardState, [field]: nextFieldState } });
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
            updateDashboardField('shareValues', prev => ({ ...prev, [activePopup.companyId]: val }));
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
              updateDashboardField('ors', prev => ({
                ...prev,
                [activePopup.companyId]: { ...(prev[activePopup.companyId] || {}), [`or${activePopup.orIndex}`]: val }
              }));
            }
          }}
          onCopyLast={activePopup.orIndex > 1 ? () => {
            const val = dashboardState.ors[activePopup.companyId]?.[`or${activePopup.orIndex - 1}`] || '';
            updateDashboardField('ors', prev => ({
              ...prev,
              [activePopup.companyId]: { ...(prev[activePopup.companyId] || {}), [`or${activePopup.orIndex}`]: val }
            }));
          } : undefined}
          onChange={(val) => {
            updateDashboardField('ors', prev => ({
              ...prev,
              [activePopup.companyId]: { ...(prev[activePopup.companyId] || {}), [`or${activePopup.orIndex}`]: val }
            }));
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
            updateDashboardField('playerAssets', prev => ({
              ...prev,
              [activePopup.player]: { ...(prev[activePopup.player] || { shares: {} }), cash: val }
            }));
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
            updateDashboardField('playerAssets', prev => {
              const pAssets = prev[activePopup.player] || { shares: {} };
              return {
                ...prev,
                [activePopup.player]: { ...pAssets, shares: { ...pAssets.shares, [activePopup.companyId]: val } }
              };
            });
          }}
          onClose={() => setActivePopup(null)}
        />
      )}
    </Box>
  );
}
