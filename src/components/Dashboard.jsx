import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Box, Center, Spinner, Flex, Button, Text, Tabs } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { useGameData } from '../hooks/useGameData.js';
import { buildShareToken, buildShareLink } from '../services/printer/shareLink.js';

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
  const [companyFlash, setCompanyFlash] = useState(null);
  const flashTimer = useRef(null);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const showCompanyName = useCallback((company) => {
    if (!company?.name) return;
    clearTimeout(flashTimer.current);
    setCompanyFlash({ name: company.name, visible: true });
    flashTimer.current = setTimeout(
      () => setCompanyFlash(current => current && { ...current, visible: false }),
      1200
    );
  }, []);

  const dashboardState = useMemo(() => gameInstance?.state?.dashboardState || { ors: {}, shareValues: {}, playerAssets: {} }, [gameInstance?.state?.dashboardState]);

  const handleShare = useCallback(async () => {
    if (!gameInstance) return;

    console.log('MAGIC_LINK_DASHBOARD_STATE', JSON.stringify(dashboardState));
    const token = buildShareToken(gameInstance, dashboardState);
    const resumeLink = buildShareLink(window.location.origin, window.location.pathname, token);

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
            onCompanyClick={showCompanyName}
          />

          <PlayerHoldingsGrid
            players={players}
            activeCompanies={activeCompanies}
            maxOr={maxOr}
            dashboardState={dashboardState}
            updatePlayers={updatePlayers}
            setActivePopup={setActivePopup}
            onCompanyClick={showCompanyName}
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

      {companyFlash && (
        <Box
          data-testid="company-name-flash"
          position="fixed"
          top="20"
          left="50%"
          transform="translateX(-50%)"
          zIndex="20"
          bg="gray.700"
          color="white"
          px="4"
          py="2"
          borderRadius="md"
          boxShadow="lg"
          fontWeight="bold"
          pointerEvents="none"
          opacity={companyFlash.visible ? 1 : 0}
          transition="opacity 0.3s"
        >
          {companyFlash.name}
        </Box>
      )}

      {/* Popups */}
      <DashboardPopups
        activePopup={activePopup}
        setActivePopup={setActivePopup}
        dashboardState={dashboardState}
        activeCompanies={activeCompanies}
        players={players}
        gameInstance={gameInstance}
        updateDashboardField={updateDashboardField}
        sharePriceOptions={sharePriceOptions}
      />
    </Box>
  );
}
