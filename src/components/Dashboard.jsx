import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Box, Center, Spinner, Flex, Button, Text, Tabs } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { useGameData } from '../hooks/useGameData.js';
import { buildRemoteLink } from '../services/printer/shareLink.js';
import { saveGameToSheet } from '../services/remote/gamesSheet.js';
import { reportProblem } from '../services/monitoring/monitoring.js';
import { toastSheetOutcome } from './ui/toast.js';

import DashboardPopups from './DashboardPopups.jsx';
import CompanyValuesGrid from './grids/CompanyValuesGrid.jsx';
import PlayerHoldingsGrid from './grids/PlayerHoldingsGrid.jsx';
import ResultsPrinter from './ResultsPrinter.jsx';
// CompanyCharts and PlayerCharts are still here but no longer reachable; see TODO.md.
import AnalysisTab from './charts/AnalysisTab.jsx';

export default function Dashboard() {
  const [match, params] = useRoute('/game/:id/dashboard');
  const { loading, gameInstance, updateGameStateDebounced, updatePlayers } = useGameData(params?.id);
  
  const [activePopup, setActivePopup] = useState(null);
  const [shareMessage, setShareMessage] = useState(null);
  const [shareError, setShareError] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
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

    setIsSharing(true);
    setShareMessage(null);
    setShareError(null);

    try {
      const { outcome } = await saveGameToSheet(gameInstance, dashboardState);
      toastSheetOutcome(outcome);
      const resumeLink = buildRemoteLink(window.location.origin, window.location.pathname, gameInstance.id);
      try {
        await navigator.clipboard.writeText(resumeLink);
        setShareMessage('Link copied! Anyone with it can open this game.');
      } catch (err) {
        reportProblem(err, { level: 'warning', stage: 'sharing', id: gameInstance.id, action: 'copy-link' });
        setShareMessage('Saved to the sheet, but the link could not be copied.');
      }
      setTimeout(() => setShareMessage(null), 3000);
    } catch (err) {
      reportProblem(err, { stage: 'sharing', id: gameInstance.id, action: 'save-to-sheet' });
      console.error('Failed to save the game to the sheet', err);
      setShareError(err.message);
    } finally {
      setIsSharing(false);
    }
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

  // Takes every field at once, because two separate calls would each start from the same stale state.
  const updateDashboardFields = (updates) => {
    const next = { ...dashboardState };
    Object.entries(updates).forEach(([field, updater]) => {
      next[field] = typeof updater === 'function' ? updater(dashboardState[field] || {}) : updater;
    });
    updateGameStateDebounced({ dashboardState: next });
  };

  const updateDashboardField = (field, updater) => updateDashboardFields({ [field]: updater });

  return (
    <Box p="2" pb="24" maxW="100%" overflowX="hidden">
      <Flex justify="flex-end" align="center" mb="4" gap="3" wrap="wrap">
        {shareMessage && (
          <Text fontSize="sm" color="green.300" transition="opacity 0.3s">
            {shareMessage}
          </Text>
        )}
        {shareError && (
          <Text fontSize="sm" color="red.300" role="alert">
            {shareError}
          </Text>
        )}
        <Button
          size="sm"
          variant="outline"
          color="white"
          borderColor="whiteAlpha.400"
          _hover={{ bg: 'whiteAlpha.200' }}
          onClick={handleShare}
          loading={isSharing}
          loadingText="Saving"
        >
          📤 Share
        </Button>
      </Flex>

      <Tabs.Root defaultValue="grids" variant="enclosed" mt="4">
        <Tabs.List bg="gray.800" borderRadius="md" p="1">
          <Tabs.Trigger value="grids" _selected={{ bg: 'teal.500', color: 'white' }}>Data Grids</Tabs.Trigger>
          <Tabs.Trigger value="analysis" _selected={{ bg: 'teal.500', color: 'white' }}>Analysis</Tabs.Trigger>
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

          <ResultsPrinter
            gameInstance={gameInstance}
            dashboardState={dashboardState}
            maxOr={maxOr}
          />
        </Tabs.Content>

        <Tabs.Content value="analysis">
          <AnalysisTab
            dashboardState={dashboardState}
            staticConfig={gameInstance.staticConfig}
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
        updateDashboardFields={updateDashboardFields}
        sharePriceOptions={sharePriceOptions}
        stockMarket={gameInstance.staticConfig?.stockMarket}
      />
    </Box>
  );
}
