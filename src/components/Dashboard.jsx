import { useEffect, useState } from 'react';
import { Box, Heading, Center, Spinner, Text, Input, Flex, Button, IconButton, VStack, SimpleGrid } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { getGame, updateGameState, updateGamePlayers } from '../api/mockApi.js';

function Numpad({ value, onChange, onClose }) {
  const handleType = (num) => {
    onChange(String(value || '') + num);
  };
  const handleBackspace = () => {
    const str = String(value || '');
    onChange(str.slice(0, -1));
  };
  
  return (
    <Box bg="gray.900" p="2" borderRadius="md" mt="2" border="1px solid" borderColor="whiteAlpha.200">
      <SimpleGrid columns={3} gap="2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <Button key={n} size="sm" variant="outline" colorPalette="gray" onClick={() => handleType(n)}>{n}</Button>
        ))}
        <Button size="sm" variant="outline" colorPalette="red" onClick={handleBackspace}>⌫</Button>
        <Button size="sm" variant="outline" colorPalette="gray" onClick={() => handleType(0)}>0</Button>
        <Button size="sm" colorPalette="teal" onClick={onClose}>OK</Button>
      </SimpleGrid>
    </Box>
  );
}

function SharePricePicker({ options, value, onChange, onClose }) {
  return (
    <Box bg="gray.900" p="2" borderRadius="md" mt="2" border="1px solid" borderColor="whiteAlpha.200">
      <SimpleGrid columns={4} gap="2">
        {options.map(opt => (
          <Button 
            key={opt} 
            size="sm" 
            variant={Number(value) === opt ? 'solid' : 'outline'} 
            colorPalette="orange"
            onClick={() => {
              onChange(opt);
              onClose();
            }}
          >
            ${opt}
          </Button>
        ))}
      </SimpleGrid>
    </Box>
  );
}

function ShareCountPicker({ value, onChange, onClose }) {
  return (
    <Box bg="gray.900" p="2" borderRadius="md" mt="2" border="1px solid" borderColor="whiteAlpha.200">
      <SimpleGrid columns={6} gap="2">
        {[0,1,2,3,4,5,6,7,8,9,10].map(opt => (
          <Button 
            key={opt} 
            size="sm" 
            variant={Number(value) === opt ? 'solid' : 'outline'} 
            colorPalette="blue"
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
  
  // Track which field is currently expanded
  // Format: 'shareValue-PRR', 'or-PRR-1', 'cash-Alice', 'shares-Alice-PRR'
  const [activeInput, setActiveInput] = useState(null);

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
  const maxOr = gameInstance.staticConfig?.maxOr || 3;
  const players = gameInstance.players || [];
  
  // Fallback to parValues if sharePrices are missing
  const sharePriceOptions = gameInstance.staticConfig?.sharePrices || gameInstance.staticConfig?.parValues || [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  const updateState = (updates) => {
    const nextState = { ...dashboardState, ...updates };
    setDashboardState(nextState);
    updateGameState(gameInstance.id, { dashboardState: nextState }).catch(console.error);
  };

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

  const handleORChange = (companyId, orIndex, value) => {
    const ors = { ...dashboardState.ors };
    if (!ors[companyId]) ors[companyId] = {};
    ors[companyId][`or${orIndex}`] = value;
    updateState({ ors });
  };

  const handleShareValueChange = (companyId, value) => {
    const shareValues = { ...dashboardState.shareValues };
    shareValues[companyId] = value;
    updateState({ shareValues });
  };

  const handlePlayerCashChange = (player, value) => {
    const playerAssets = { ...dashboardState.playerAssets };
    if (!playerAssets[player]) playerAssets[player] = { cash: '', shares: {} };
    playerAssets[player].cash = value;
    updateState({ playerAssets });
  };

  const handlePlayerShareChange = (player, companyId, value) => {
    const playerAssets = { ...dashboardState.playerAssets };
    if (!playerAssets[player]) playerAssets[player] = { cash: '', shares: {} };
    playerAssets[player].shares[companyId] = value;
    updateState({ playerAssets });
  };

  const getShareValue = (c) => {
    const val = dashboardState.shareValues[c.shortName];
    if (val !== undefined && val !== '') return Number(val);
    return c.initialValue || 0;
  };

  const getPlayerNetWorth = (player) => {
    const assets = dashboardState.playerAssets[player] || { cash: 0, shares: {} };
    let nw = Number(assets.cash || 0);
    activeCompanies.forEach(c => {
      const sharePct = Number(assets.shares[c.shortName] || 0);
      const shareVal = getShareValue(c);
      nw += sharePct * shareVal;
    });
    return nw;
  };

  const toggleInput = (key) => {
    setActiveInput(prev => prev === key ? null : key);
  };

  return (
    <Box p="4" pb="24">
      <Heading as="h2" size="xl" color="teal.400" mb="6">Company Values & Results</Heading>
      
      {activeCompanies.length === 0 ? (
        <Text color="gray.400">No active companies. Go to Raise Funds first.</Text>
      ) : (
        <VStack align="stretch" gap="4" mb="8">
          {activeCompanies.map(c => (
            <Box key={c.shortName} bg="gray.800" p="4" borderRadius="md" borderLeft="4px solid" borderLeftColor={c.color || "white"}>
              <Heading size="md" mb="3" color={c.color || "white"}>{c.name} ({c.shortName})</Heading>
              
              <Flex justify="space-between" align="center" mb="2">
                <Text color="gray.400">Share Value</Text>
                <Button 
                  size="sm" 
                  variant="outline" 
                  colorPalette="orange"
                  onClick={() => toggleInput(`shareValue-${c.shortName}`)}
                >
                  ${getShareValue(c)}
                </Button>
              </Flex>
              {activeInput === `shareValue-${c.shortName}` && (
                <SharePricePicker 
                  options={sharePriceOptions}
                  value={getShareValue(c)}
                  onChange={(val) => handleShareValueChange(c.shortName, val)}
                  onClose={() => setActiveInput(null)}
                />
              )}

              <SimpleGrid columns={maxOr} gap="2" mt="4">
                {Array.from({ length: maxOr }).map((_, i) => {
                  const val = dashboardState.ors[c.shortName]?.[`or${i + 1}`];
                  const inputKey = `or-${c.shortName}-${i+1}`;
                  return (
                    <Box key={i}>
                      <Text fontSize="xs" color="gray.500" mb="1">OR {i + 1}</Text>
                      <Button 
                        size="sm" 
                        w="100%"
                        variant="outline"
                        colorPalette="teal"
                        onClick={() => toggleInput(inputKey)}
                      >
                        {val !== undefined && val !== '' ? `$${val}` : '—'}
                      </Button>
                      {activeInput === inputKey && (
                        <Box position="absolute" zIndex="10" mt="1" right="4" left="4">
                          <Numpad 
                            value={val}
                            onChange={(newVal) => handleORChange(c.shortName, i + 1, newVal)}
                            onClose={() => setActiveInput(null)}
                          />
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </SimpleGrid>
            </Box>
          ))}
        </VStack>
      )}

      <Flex justify="space-between" align="center" mb="4" wrap="wrap" gap="4">
        <Heading as="h3" size="lg" color="teal.400">Player Net Worth</Heading>
        <form onSubmit={handleAddPlayer}>
          <Flex gap="2">
            <Input 
              size="sm" 
              w="120px" 
              placeholder="New player..." 
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              bg="gray.700"
              border="none"
            />
            <Button size="sm" type="submit" colorPalette="teal">Add</Button>
          </Flex>
        </form>
      </Flex>
      
      {players.length === 0 ? (
        <Text color="gray.400">No players.</Text>
      ) : (
        <VStack align="stretch" gap="4">
          {players.map(p => (
            <Box key={p} bg="gray.800" p="4" borderRadius="md" border="1px solid" borderColor="whiteAlpha.200">
              <Flex justify="space-between" align="center" mb="4">
                <Heading size="md" color="white">{p}</Heading>
                <Flex align="center" gap="3">
                  <Text fontWeight="bold" color="green.300" fontSize="lg">${getPlayerNetWorth(p)}</Text>
                  <IconButton 
                    size="xs" 
                    variant="ghost" 
                    colorPalette="red" 
                    aria-label="Remove player" 
                    onClick={() => handleRemovePlayer(p)}
                  >
                    ✕
                  </IconButton>
                </Flex>
              </Flex>

              <Flex justify="space-between" align="center" mb="3">
                <Text color="gray.400">Cash</Text>
                <Box>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    colorPalette="green"
                    onClick={() => toggleInput(`cash-${p}`)}
                  >
                    ${dashboardState.playerAssets[p]?.cash || 0}
                  </Button>
                  {activeInput === `cash-${p}` && (
                    <Box position="absolute" zIndex="10" mt="1" right="4" left="4">
                      <Numpad 
                        value={dashboardState.playerAssets[p]?.cash}
                        onChange={(newVal) => handlePlayerCashChange(p, newVal)}
                        onClose={() => setActiveInput(null)}
                      />
                    </Box>
                  )}
                </Box>
              </Flex>

              <VStack align="stretch" gap="2" mt="4">
                <Text fontSize="sm" color="gray.500" fontWeight="bold">SHARES</Text>
                <SimpleGrid columns={2} gap="2">
                  {activeCompanies.map(c => {
                    const shares = dashboardState.playerAssets[p]?.shares?.[c.shortName] || 0;
                    return (
                      <Box key={c.shortName} bg="gray.900" p="2" borderRadius="md">
                        <Flex justify="space-between" align="center">
                          <Text color={c.color || "white"} fontSize="sm">{c.shortName}</Text>
                          <Button 
                            size="xs" 
                            variant="outline"
                            colorPalette="blue"
                            onClick={() => toggleInput(`shares-${p}-${c.shortName}`)}
                          >
                            {shares} certs
                          </Button>
                        </Flex>
                        {activeInput === `shares-${p}-${c.shortName}` && (
                          <Box position="absolute" zIndex="10" mt="1" right="4" left="4">
                            <ShareCountPicker 
                              value={shares}
                              onChange={(newVal) => handlePlayerShareChange(p, c.shortName, newVal)}
                              onClose={() => setActiveInput(null)}
                            />
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </SimpleGrid>
              </VStack>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
}
