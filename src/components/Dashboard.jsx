import { useEffect, useState, Fragment } from 'react';
import { Box, Heading, Center, Spinner, Text, Input, Flex, Button, IconButton, SimpleGrid, Grid, GridItem } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { getGame, updateGameState, updateGamePlayers } from '../api/mockApi.js';

function NumpadPopup({ title, subtitle, badgeColor, value, onChange, onClose, onCopyLast }) {
  const handleType = (num) => {
    onChange(String(value || '') + num);
  };
  const handleBackspace = () => {
    const str = String(value || '');
    onChange(str.slice(0, -1));
  };
  const handleClear = () => onChange('');
  
  return (
    <Box position="fixed" top="0" left="0" w="100vw" h="100vh" bg="blackAlpha.700" zIndex="1000" display="flex" alignItems="center" justifyContent="center" onClick={onClose}>
      <Box bg="gray.900" p="4" borderRadius="lg" border="1px solid" borderColor="whiteAlpha.300" onClick={e => e.stopPropagation()} maxW="sm" w="100%">
        <Flex align="center" gap="2" mb="4">
          <Text fontWeight="bold" color="white">{title}</Text>
          {subtitle && (
            <Box bg={badgeColor || 'gray.700'} px="2" py="1" borderRadius="md">
              <Text fontSize="sm" color="white">{subtitle}</Text>
            </Box>
          )}
        </Flex>
        
        <Box bg="gray.800" p="3" borderRadius="md" mb="4" textAlign="right" h="12" display="flex" alignItems="center" justifyContent="flex-end">
          <Text fontSize="xl" fontWeight="bold" color="white">{value || '0'}</Text>
        </Box>

        <SimpleGrid columns={4} gap="2">
          <GridItem colSpan={3}>
            <SimpleGrid columns={3} gap="2">
              {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => (
                <Button key={n} h="12" variant="outline" color="white" borderColor="gray.600" _hover={{ bg: 'gray.800' }} onClick={() => handleType(n)}>{n}</Button>
              ))}
              <Button h="12" variant="outline" color="red.300" borderColor="gray.600" _hover={{ bg: 'gray.800' }} onClick={handleClear}>C</Button>
              <Button h="12" variant="outline" color="white" borderColor="gray.600" _hover={{ bg: 'gray.800' }} onClick={() => handleType(0)}>0</Button>
              <Button h="12" variant="outline" color="orange.300" borderColor="gray.600" _hover={{ bg: 'gray.800' }} onClick={handleBackspace}>⌫</Button>
            </SimpleGrid>
          </GridItem>
          <GridItem colSpan={1}>
            <Flex direction="column" h="100%" gap="2">
              {onCopyLast && (
                <Button flex="1" fontSize="xs" whiteSpace="normal" lineHeight="1.2" variant="outline" color="white" borderColor="gray.600" _hover={{ bg: 'gray.800' }} onClick={onCopyLast}>
                  Copy Prev
                </Button>
              )}
              <Button flex="1" colorPalette="teal" onClick={onClose}>OK</Button>
            </Flex>
          </GridItem>
        </SimpleGrid>
      </Box>
    </Box>
  );
}

function PricePickerPopup({ company, value, options, onChange, onClose }) {
  const currentIndex = options.findIndex(opt => opt === Number(value));
  
  const handlePrev = () => {
    if (currentIndex > 0) onChange(options[currentIndex - 1]);
    else if (currentIndex === -1 && options.length > 0) onChange(options[0]);
  };
  
  const handleNext = () => {
    if (currentIndex < options.length - 1 && currentIndex !== -1) onChange(options[currentIndex + 1]);
    else if (currentIndex === -1 && options.length > 0) onChange(options[0]);
  };

  return (
    <Box position="fixed" top="0" left="0" w="100vw" h="100vh" bg="blackAlpha.700" zIndex="1000" display="flex" alignItems="center" justifyContent="center" onClick={onClose}>
      <Box bg="gray.900" p="4" borderRadius="lg" border="1px solid" borderColor="whiteAlpha.300" onClick={e => e.stopPropagation()} maxW="sm" w="100%">
        <Flex align="center" gap="2" mb="4">
          <Text fontWeight="bold" color="white">Set final price for</Text>
          <Box bg={company.color || 'gray.700'} px="2" py="1" borderRadius="md">
            <Text fontSize="sm" color="white">{company.shortName}</Text>
          </Box>
        </Flex>

        <Flex gap="4">
          <Box flex="1" maxH="300px" overflowY="auto">
            <SimpleGrid columns={4} gap="2">
              {options.slice().reverse().map(opt => (
                <Button 
                  key={opt} 
                  size="sm" 
                  variant={Number(value) === opt ? 'solid' : 'ghost'} 
                  color={Number(value) === opt ? 'black' : 'gray.300'}
                  bg={Number(value) === opt ? 'white' : 'transparent'}
                  _hover={{ bg: 'whiteAlpha.200' }}
                  onClick={() => {
                    onChange(opt);
                    onClose();
                  }}
                >
                  {opt}
                </Button>
              ))}
            </SimpleGrid>
          </Box>
          
          <Flex direction="column" gap="2" w="50px">
            <Button w="100%" h="50px" variant="outline" color="white" borderColor="gray.600" onClick={() => onChange('')}>C</Button>
            <Button w="100%" h="50px" variant="outline" color="white" borderColor="gray.600" onClick={handlePrev}>←</Button>
            <Button w="100%" h="50px" variant="outline" color="white" borderColor="gray.600" onClick={handleNext}>→</Button>
            <Button w="100%" h="50px" variant="outline" color="white" borderColor="gray.600" onClick={onClose}>X</Button>
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
}

function ShareCountPopup({ company, player, value, maxAvailable, onChange, onClose }) {
  const options = [];
  for (let i = 0; i <= maxAvailable; i += 10) {
    options.push(i);
  }

  return (
    <Box position="fixed" top="0" left="0" w="100vw" h="100vh" bg="blackAlpha.700" zIndex="1000" display="flex" alignItems="center" justifyContent="center" onClick={onClose}>
      <Box bg="gray.900" p="4" borderRadius="lg" border="1px solid" borderColor="whiteAlpha.300" onClick={e => e.stopPropagation()} maxW="sm" w="100%">
        <Flex align="center" gap="2" mb="4">
          <Text fontWeight="bold" color="white">Set {player}'s shares for</Text>
          <Box bg={company.color || 'gray.700'} px="2" py="1" borderRadius="md">
            <Text fontSize="sm" color="white">{company.shortName}</Text>
          </Box>
        </Flex>

        <SimpleGrid columns={4} gap="2" mb="4">
          {options.map(opt => (
            <Button 
              key={opt} 
              size="sm" 
              variant={Number(value) === opt ? 'solid' : 'outline'} 
              color={Number(value) === opt ? 'black' : 'white'}
              bg={Number(value) === opt ? 'white' : 'transparent'}
              borderColor="gray.600"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => {
                onChange(opt);
                onClose();
              }}
            >
              {opt}%
            </Button>
          ))}
        </SimpleGrid>
        <Button w="100%" variant="outline" color="white" borderColor="gray.600" onClick={onClose}>Cancel</Button>
      </Box>
    </Box>
  );
}

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

  const getPlayerNetWorth = (player) => {
    const assets = dashboardState.playerAssets[player] || { cash: 0, shares: {} };
    let nw = Number(assets.cash || 0);
    activeCompanies.forEach(c => {
      const sharePct = Number(assets.shares[c.shortName] || 0);
      nw += (sharePct / 10) * getShareValue(c.shortName);
    });
    return nw;
  };

  const getBankShares = (companyId) => {
    let totalPlayerShares = 0;
    players.forEach(p => {
      const pShares = Number(dashboardState.playerAssets[p]?.shares?.[companyId] || 0);
      totalPlayerShares += pShares;
    });
    return Math.max(0, 100 - totalPlayerShares);
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
          <Grid templateColumns={`80px 100px repeat(${maxOr}, 80px)`} gap="2" alignItems="center">
            <GridItem></GridItem>
            <GridItem textAlign="center"><Text fontWeight="bold" color="white">Price</Text></GridItem>
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
        <Heading as="h3" size="lg" color="teal.400">Player Net Worth</Heading>
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

            <GridItem><Text color="gray.400" fontSize="sm">Net Worth</Text></GridItem>
            {players.map(p => (
              <GridItem key={p} textAlign="center">
                <Text fontWeight="bold" color="green.300">${getPlayerNetWorth(p)}</Text>
              </GridItem>
            ))}
            <GridItem></GridItem>

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
              </Fragment>
            ))}
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
          onCopyLast={activePopup.orIndex > 1 ? () => {
            const val = dashboardState.ors[activePopup.companyId]?.[`or${activePopup.orIndex - 1}`] || '';
            const ors = { ...dashboardState.ors };
            if (!ors[activePopup.companyId]) ors[activePopup.companyId] = {};
            ors[activePopup.companyId][`or${activePopup.orIndex}`] = val;
            setDashboardState(prev => ({ ...prev, ors }));
            updateGameState(gameInstance.id, { dashboardState: { ...dashboardState, ors } });
          } : undefined}
          onChange={(val) => {
            const ors = { ...dashboardState.ors };
            if (!ors[activePopup.companyId]) ors[activePopup.companyId] = {};
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
