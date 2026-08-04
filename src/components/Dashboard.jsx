import { useEffect, useState, Fragment } from 'react';
import { Box, Heading, Center, Spinner, Text, Input, Flex, Button, IconButton, SimpleGrid, Grid, GridItem } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { getGame, updateGameState, updateGamePlayers } from '../api/mockApi.js';

import NumpadPopup from './popups/NumpadPopup.jsx';
import PricePickerPopup from './popups/PricePickerPopup.jsx';
import ShareCountPopup from './popups/ShareCountPopup.jsx';

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

  const getShareValue = (shortName) => {
    const val = dashboardState.shareValues[shortName];
    if (val !== undefined && val !== '') return Number(val);
    const c = activeCompanies.find(comp => comp.shortName === shortName);
    return c?.parValue || 0;
  };

  const getPlayerShareValue = (player) => {
    const assets = dashboardState.playerAssets[player] || { shares: {} };
    let sv = 0;
    activeCompanies.forEach(c => {
      const sharePct = Number(assets.shares[c.shortName] || 0);
      sv += (sharePct / 10) * getShareValue(c.shortName);
    });
    return sv;
  };

  const getPlayerTotalShares = (player) => {
    const assets = dashboardState.playerAssets[player] || { shares: {} };
    let totalPct = 0;
    activeCompanies.forEach(c => {
      totalPct += Number(assets.shares[c.shortName] || 0);
    });
    return totalPct / 10;
  };

  const getCompanyOrTotal = (shortName) => {
    let total = 0;
    for (let i = 1; i <= maxOr; i++) {
      const val = dashboardState.ors[shortName]?.[`or${i}`];
      if (val !== undefined && val !== '') total += Number(val);
    }
    return total;
  };

  const getPlayerOperatingIncome = (player) => {
    const assets = dashboardState.playerAssets[player] || { shares: {} };
    let income = 0;
    activeCompanies.forEach(c => {
      const sharePct = Number(assets.shares[c.shortName] || 0);
      income += (sharePct / 100) * getCompanyOrTotal(c.shortName);
    });
    return income;
  };

  const getPlayerNetWorth = (player) => {
    const assets = dashboardState.playerAssets[player] || { cash: 0 };
    return Number(assets.cash || 0) + getPlayerShareValue(player) + getPlayerOperatingIncome(player);
  };

  const getBankShares = (companyId) => {
    let totalPlayerShares = 0;
    players.forEach(p => {
      const pShares = Number(dashboardState.playerAssets[p]?.shares?.[companyId] || 0);
      totalPlayerShares += pShares;
    });
    return Math.max(0, 100 - totalPlayerShares);
  };

  const getCalculatorGrandTotal = (companyId) => {
    const calcState = gameInstance?.state?.calculatorState?.[companyId];
    if (!calcState || !calcState.trains) return 0;
    
    return calcState.trains
      .filter(t => !t.isExcluded)
      .reduce((sum, t) => {
        const stopsSum = t.stops.reduce((s, v) => s + v, 0);
        const bonusSum = (t.bonusStops || []).reduce((s, b) => s + b.val, 0);
        return sum + stopsSum + bonusSum;
      }, 0);
  };

  return (
    <Box p="2" pb="24" maxW="100%" overflowX="hidden">
      <Flex justify="center" align="center" gap="4" mb="4" wrap="wrap">
        <Heading as="h2" size="lg" color="teal.400" textAlign="center">Company Values & Results</Heading>
        <Flex gap="1">
          <Button size="xs" variant="outline" color="white" borderColor="gray.600" onClick={() => updateMaxOr(maxOr - 1)} disabled={maxOr <= 1}>- OR</Button>
          <Button size="xs" variant="outline" color="white" borderColor="gray.600" onClick={() => updateMaxOr(maxOr + 1)}>+ OR</Button>
        </Flex>
      </Flex>
      
      {activeCompanies.length > 0 && (
        <Box overflowX="auto" mb="8">
          <Grid templateColumns={`80px 100px 80px repeat(${maxOr}, 80px)`} gap="2" alignItems="center">
            <GridItem></GridItem>
            <GridItem textAlign="center"><Text fontWeight="bold" color="white">Share Price</Text></GridItem>
            <GridItem textAlign="center"><Text fontWeight="bold" color="cyan.300">OR Total</Text></GridItem>
            {Array.from({ length: maxOr }).map((_, i) => (
              <GridItem key={i} textAlign="center"><Text fontWeight="bold" color="white">OR {i + 1}</Text></GridItem>
            ))}

            {activeCompanies.map(c => (
              <Fragment key={c.shortName}>
                <GridItem>
                  <Box bg={c.color || 'gray.700'} color="white" textAlign="center" py="2" borderRadius="md" fontWeight="bold">
                    {c.shortName}
                  </Box>
                </GridItem>
                <GridItem>
                  <Button w="100%" bg="gray.800" _hover={{ bg: 'gray.700' }} color="white" onClick={() => setActivePopup({ type: 'shareValue', companyId: c.shortName })}>
                    {getShareValue(c.shortName)}
                  </Button>
                </GridItem>
                <GridItem>
                  <Box w="100%" bg="gray.900" color="cyan.300" textAlign="center" py="2" borderRadius="md" fontWeight="bold">
                    {getCompanyOrTotal(c.shortName) > 0 ? getCompanyOrTotal(c.shortName) : ''}
                  </Box>
                </GridItem>
                {Array.from({ length: maxOr }).map((_, i) => {
                  const val = dashboardState.ors[c.shortName]?.[`or${i + 1}`];
                  return (
                    <GridItem key={i}>
                      <Button w="100%" bg="gray.800" _hover={{ bg: 'gray.700' }} color="white" onClick={() => setActivePopup({ type: 'or', companyId: c.shortName, orIndex: i + 1 })}>
                        {val !== undefined && val !== '' ? val : ''}
                      </Button>
                    </GridItem>
                  );
                })}
              </Fragment>
            ))}
          </Grid>
        </Box>
      )}

      <Flex justify="space-between" align="center" mb="4" wrap="wrap" gap="4">
        <Flex gap="4" align="center">
          <Heading as="h3" size="lg" color="teal.400">Player Holdings</Heading>
          <Button size="xs" variant="outline" color="white" borderColor="gray.600" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? "Hide Details" : "Details"}
          </Button>
        </Flex>
        <form onSubmit={handleAddPlayer}>
          <Flex gap="2">
            <Input size="sm" w="120px" placeholder="New player..." value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} bg="gray.700" border="none" color="white"/>
            <Button size="sm" type="submit" colorPalette="teal">Add</Button>
          </Flex>
        </form>
      </Flex>
      
      {players.length > 0 && (
        <Box overflowX="auto">
          <Grid templateColumns={`100px repeat(${players.length}, 100px) 100px`} gap="2" alignItems="center">
            <GridItem></GridItem>
            {players.map(p => (
              <GridItem key={p} textAlign="center">
                <Flex align="center" justify="center" gap="1">
                  <Text fontWeight="bold" color="white" isTruncated>{p}</Text>
                  <IconButton size="2xs" variant="ghost" colorPalette="red" aria-label="Remove" onClick={() => handleRemovePlayer(p)}>✕</IconButton>
                </Flex>
              </GridItem>
            ))}
            <GridItem textAlign="center"><Text fontWeight="bold" color="gray.400">Bank</Text></GridItem>

            <GridItem><Text color="gray.400" fontSize="sm">Cash</Text></GridItem>
            {players.map(p => (
              <GridItem key={p}>
                <Button w="100%" bg="gray.800" _hover={{ bg: 'gray.700' }} color="white" onClick={() => setActivePopup({ type: 'cash', player: p })}>
                  {dashboardState.playerAssets[p]?.cash !== undefined && dashboardState.playerAssets[p]?.cash !== '' ? dashboardState.playerAssets[p]?.cash : ''}
                </Button>
              </GridItem>
            ))}
            <GridItem></GridItem>



            {activeCompanies.map(c => (
              <Fragment key={c.shortName}>
                <GridItem><Text color={c.color || "white"} fontSize="sm" fontWeight="bold">{c.shortName}</Text></GridItem>
                {players.map(p => {
                  const shares = dashboardState.playerAssets[p]?.shares?.[c.shortName];
                  return (
                    <GridItem key={p}>
                      <Button w="100%" bg="gray.800" _hover={{ bg: 'gray.700' }} color="white" onClick={() => setActivePopup({ type: 'shares', player: p, companyId: c.shortName })}>
                        {shares !== undefined && shares !== '' ? `${shares}%` : ''}
                      </Button>
                    </GridItem>
                  );
                })}
                <GridItem textAlign="center">
                  <Text color="gray.400" fontWeight="bold">{getBankShares(c.shortName)}%</Text>
                </GridItem>

                {showDetails && (
                  <>
                    <GridItem><Text color="gray.500" fontSize="xs" pl="2">↳ Share Value</Text></GridItem>
                    {players.map(p => {
                      const sharePct = Number(dashboardState.playerAssets[p]?.shares?.[c.shortName] || 0);
                      const sv = (sharePct / 10) * getShareValue(c.shortName);
                      return (
                        <GridItem key={`sv-${p}`} textAlign="center">
                          <Text color="gray.400" fontSize="sm">${sv}</Text>
                        </GridItem>
                      );
                    })}
                    <GridItem></GridItem>

                    <GridItem><Text color="gray.500" fontSize="xs" pl="2">↳ Op Income</Text></GridItem>
                    {players.map(p => {
                      const sharePct = Number(dashboardState.playerAssets[p]?.shares?.[c.shortName] || 0);
                      const income = (sharePct / 100) * getCompanyOrTotal(c.shortName);
                      return (
                        <GridItem key={`inc-${p}`} textAlign="center">
                          <Text color="cyan.600" fontSize="sm">${income}</Text>
                        </GridItem>
                      );
                    })}
                    <GridItem></GridItem>
                  </>
                )}
              </Fragment>
            ))}

            <GridItem><Text color="gray.400" fontSize="sm">Total Shares</Text></GridItem>
            {players.map(p => (
              <GridItem key={`ts-${p}`} textAlign="center">
                <Text fontWeight="bold" color="purple.300">{getPlayerTotalShares(p)}</Text>
              </GridItem>
            ))}
            <GridItem></GridItem>

            <GridItem><Text color="gray.400" fontSize="sm">Share Value</Text></GridItem>
            {players.map(p => (
              <GridItem key={p} textAlign="center">
                <Text fontWeight="bold" color="white">${getPlayerShareValue(p)}</Text>
              </GridItem>
            ))}
            <GridItem></GridItem>

            <GridItem><Text color="gray.400" fontSize="sm">Operating Income</Text></GridItem>
            {players.map(p => (
              <GridItem key={p} textAlign="center">
                <Text fontWeight="bold" color="cyan.300">${getPlayerOperatingIncome(p)}</Text>
              </GridItem>
            ))}
            <GridItem></GridItem>

            <GridItem><Text color="gray.400" fontSize="sm">Net Worth</Text></GridItem>
            {players.map(p => (
              <GridItem key={p} textAlign="center">
                <Text fontWeight="bold" color="green.300">${getPlayerNetWorth(p)}</Text>
              </GridItem>
            ))}
            <GridItem></GridItem>
          </Grid>
        </Box>
      )}

      {/* Popups */}
      {activePopup?.type === 'shareValue' && (
        <PricePickerPopup
          company={activeCompanies.find(c => c.shortName === activePopup.companyId)}
          value={getShareValue(activePopup.companyId)}
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
            const val = getCalculatorGrandTotal(activePopup.companyId);
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
            const assets = { ...dashboardState.playerAssets };
            if (!assets[activePopup.player]) assets[activePopup.player] = { cash: '', shares: {} };
            assets[activePopup.player].cash = val;
            setDashboardState(prev => ({ ...prev, playerAssets: assets }));
            updateGameState(gameInstance.id, { dashboardState: { ...dashboardState, playerAssets: assets } });
          }}
          onClose={() => setActivePopup(null)}
        />
      )}

      {activePopup?.type === 'shares' && (
        <ShareCountPopup
          company={activeCompanies.find(c => c.shortName === activePopup.companyId)}
          player={activePopup.player}
          value={dashboardState.playerAssets[activePopup.player]?.shares?.[activePopup.companyId] || 0}
          maxAvailable={Math.min(
            gameInstance.staticConfig?.maxPlayerHolding || 60,
            getBankShares(activePopup.companyId) + Number(dashboardState.playerAssets[activePopup.player]?.shares?.[activePopup.companyId] || 0)
          )}
          onChange={(val) => {
            const assets = { ...dashboardState.playerAssets };
            if (!assets[activePopup.player]) assets[activePopup.player] = { cash: '', shares: {} };
            assets[activePopup.player].shares[activePopup.companyId] = val;
            setDashboardState(prev => ({ ...prev, playerAssets: assets }));
            updateGameState(gameInstance.id, { dashboardState: { ...dashboardState, playerAssets: assets } });
          }}
          onClose={() => setActivePopup(null)}
        />
      )}
    </Box>
  );
}
