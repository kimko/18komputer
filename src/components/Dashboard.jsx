import { useState, useCallback, useMemo } from 'react';
import { Box, Center, Spinner, Flex, Button, Text, Tabs } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import LZString from 'lz-string';
import { useGameData } from '../hooks/useGameData.js';

import DashboardPopups from './DashboardPopups.jsx';
import CompanyValuesGrid from './grids/CompanyValuesGrid.jsx';
import PlayerHoldingsGrid from './grids/PlayerHoldingsGrid.jsx';
import CompanyCharts from './charts/CompanyCharts.jsx';
import PlayerCharts from './charts/PlayerCharts.jsx';
import {
  getRevenueTrajectoryData,
  getCompanyYieldAndDominanceData
} from '../utils/chartDataSelectors.js';

export default function Dashboard() {
  const [match, params] = useRoute('/game/:id/dashboard');
  const { loading, gameInstance, updateGameStateDebounced, updatePlayers } = useGameData(params?.id);
  
  const [activePopup, setActivePopup] = useState(null);
  const [shareMessage, setShareMessage] = useState(null);

  const dashboardState = useMemo(() => gameInstance?.state?.dashboardState || { ors: {}, shareValues: {}, playerAssets: {} }, [gameInstance?.state?.dashboardState]);

  const handleShare = useCallback(async () => {
    if (!gameInstance) return;

    // Omit staticConfig to prevent redundancy in the magic link
    const { staticConfig: _, ...gameDataToShare } = gameInstance;

    // Create a copy of the game instance to share, injecting the freshest local dashboardState
    const shareInstance = { 
      ...gameDataToShare, 
      state: {
        ...gameDataToShare.state,
        dashboardState: dashboardState
      },
      exportedAt: new Date().toISOString() 
    };
    
    // Log for Playwright debugging
    console.log('MAGIC_LINK_DASHBOARD_STATE', JSON.stringify(dashboardState));

    // Generate magic link with compressed state
    const compressedData = LZString.compressToEncodedURIComponent(JSON.stringify(shareInstance));
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    let rootSegment = '';
    // If the first segment is NOT 'game', we assume it's the repo name for GitHub pages (e.g. /18komputer)
    if (pathSegments.length > 0 && pathSegments[0] !== 'game') {
      rootSegment = `/${pathSegments[0]}`;
    }
    
    const resumeLink = `${window.location.origin}${rootSegment}/resume#import=${compressedData}`;

    // Copy resume link to clipboard
    try {
      await navigator.clipboard.writeText(resumeLink);
      setShareMessage('Magic Link copied! Anyone with this link can open the game.');
    } catch {
      setShareMessage('Exported! Could not copy link automatically.');
    }

    setTimeout(() => setShareMessage(null), 3000);
  }, [gameInstance, dashboardState]);

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
      <Flex justify="flex-end" align="center" mb="4" gap="3" wrap="wrap">
        {shareMessage && (
          <Text fontSize="sm" color="green.300" transition="opacity 0.3s">
            {shareMessage}
          </Text>
        )}
        <Button
          size="sm"
          variant="outline"
          color="white"
          borderColor="whiteAlpha.400"
          _hover={{ bg: 'whiteAlpha.200' }}
          onClick={handleShare}
        >
          📤 Share
        </Button>
      </Flex>

      <Tabs.Root defaultValue="grids" variant="enclosed" mt="4">
        <Tabs.List bg="gray.800" borderRadius="md" p="1">
          <Tabs.Trigger value="grids" _selected={{ bg: 'teal.500', color: 'white' }}>Data Grids</Tabs.Trigger>
          <Tabs.Trigger value="companies" _selected={{ bg: 'teal.500', color: 'white' }}>Company Charts</Tabs.Trigger>
          <Tabs.Trigger value="players" _selected={{ bg: 'teal.500', color: 'white' }}>Player Charts</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="grids">
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
            updatePlayers={updatePlayers}
            setActivePopup={setActivePopup}
          />
        </Tabs.Content>

        <Tabs.Content value="companies">
          <CompanyCharts 
            trajectoryData={getRevenueTrajectoryData(dashboardState, activeCompanies, maxOr)}
            yieldData={getCompanyYieldAndDominanceData(dashboardState, activeCompanies, maxOr)}
            activeCompanies={activeCompanies}
          />
        </Tabs.Content>

        <Tabs.Content value="players">
          <PlayerCharts 
            dashboardState={dashboardState}
            maxOr={maxOr}
            players={players}
            activeCompanies={activeCompanies}
          />
        </Tabs.Content>
      </Tabs.Root>

      {/* Popups */}
      <DashboardPopups
        activePopup={activePopup}
        setActivePopup={setActivePopup}
        dashboardState={dashboardState}
        activeCompanies={activeCompanies}
        maxPlayerHolding={maxPlayerHolding}
        players={players}
        gameInstance={gameInstance}
        updateDashboardField={updateDashboardField}
        sharePriceOptions={sharePriceOptions}
      />
    </Box>
  );
}
