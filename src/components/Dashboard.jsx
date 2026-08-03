import { useEffect, useState } from 'react';
import { Box, Heading, Center, Spinner, Text, Table, Input, Flex, Button, IconButton } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { getGame, updateGameState, updateGamePlayers } from '../api/mockApi.js';

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
      // Usually shares are in 10% increments. If user enters "2" for 2 shares (20%),
      // or "20" for 20%? Let's assume they enter number of shares (1 share = 10%).
      // Wait, 18xx shares are usually 10%. So value is per share.
      nw += sharePct * shareVal;
    });
    return nw;
  };

  return (
    <Box p="4">
      <Heading as="h2" size="xl" color="teal.400" mb="6">Company Values & Results</Heading>
      
      {activeCompanies.length === 0 ? (
        <Text color="gray.400">No active companies. Go to Raise Funds first.</Text>
      ) : (
        <>
          <Box overflowX="auto" mb="8" bg="gray.800" borderRadius="md" border="1px solid" borderColor="whiteAlpha.200">
            <Table.Root size="sm" variant="line">
              <Table.Header>
                <Table.Row bg="gray.700">
                  <Table.ColumnHeader color="white">Company</Table.ColumnHeader>
                  <Table.ColumnHeader color="white">Share Value</Table.ColumnHeader>
                  {Array.from({ length: maxOr }).map((_, i) => (
                    <Table.ColumnHeader key={i} color="white">OR {i + 1}</Table.ColumnHeader>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {activeCompanies.map(c => (
                  <Table.Row key={c.shortName}>
                    <Table.Cell>
                      <Text fontWeight="bold" color={c.color || "white"}>{c.shortName}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Input 
                        size="sm" 
                        w="80px" 
                        type="number"
                        value={dashboardState.shareValues[c.shortName] !== undefined ? dashboardState.shareValues[c.shortName] : (c.initialValue || '')}
                        onChange={(e) => handleShareValueChange(c.shortName, e.target.value)}
                        placeholder="Val"
                      />
                    </Table.Cell>
                    {Array.from({ length: maxOr }).map((_, i) => (
                      <Table.Cell key={i}>
                        <Input 
                          size="sm" 
                          w="80px" 
                          type="number"
                          value={dashboardState.ors[c.shortName]?.[`or${i + 1}`] || ''}
                          onChange={(e) => handleORChange(c.shortName, i + 1, e.target.value)}
                          placeholder="Rev"
                        />
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>

          <Flex justify="space-between" align="center" mb="4" wrap="wrap" gap="4">
            <Heading as="h3" size="lg" color="teal.400">Player Net Worth</Heading>
            <form onSubmit={handleAddPlayer}>
              <Flex gap="2">
                <Input 
                  size="sm" 
                  w="150px" 
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
          
          <Box overflowX="auto" bg="gray.800" borderRadius="md" border="1px solid" borderColor="whiteAlpha.200">
            <Table.Root size="sm" variant="line">
              <Table.Header>
                <Table.Row bg="gray.700">
                  <Table.ColumnHeader color="white">Asset / Player</Table.ColumnHeader>
                  {players.map(p => (
                    <Table.ColumnHeader key={p} color="white">
                      <Flex align="center" justify="space-between">
                        <Text>{p}</Text>
                        <IconButton 
                          size="xs" 
                          variant="ghost" 
                          colorPalette="red" 
                          aria-label="Remove player" 
                          onClick={() => handleRemovePlayer(p)}
                          h="20px"
                          minW="20px"
                        >
                          ✕
                        </IconButton>
                      </Flex>
                    </Table.ColumnHeader>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                <Table.Row>
                  <Table.Cell><Text fontWeight="bold">Net Worth</Text></Table.Cell>
                  {players.map(p => (
                    <Table.Cell key={p}>
                      <Text fontWeight="bold" color="green.300">${getPlayerNetWorth(p)}</Text>
                    </Table.Cell>
                  ))}
                </Table.Row>
                <Table.Row>
                  <Table.Cell><Text fontWeight="bold">Cash</Text></Table.Cell>
                  {players.map(p => (
                    <Table.Cell key={p}>
                      <Input 
                        size="sm" 
                        w="80px" 
                        type="number"
                        value={dashboardState.playerAssets[p]?.cash || ''}
                        onChange={(e) => handlePlayerCashChange(p, e.target.value)}
                        placeholder="$"
                      />
                    </Table.Cell>
                  ))}
                </Table.Row>
                {activeCompanies.map(c => (
                  <Table.Row key={c.shortName}>
                    <Table.Cell>
                      <Text fontWeight="bold" color={c.color || "white"}>{c.shortName} Shares</Text>
                    </Table.Cell>
                    {players.map(p => (
                      <Table.Cell key={p}>
                        <Input 
                          size="sm" 
                          w="80px" 
                          type="number"
                          value={dashboardState.playerAssets[p]?.shares?.[c.shortName] || ''}
                          onChange={(e) => handlePlayerShareChange(p, c.shortName, e.target.value)}
                          placeholder="#"
                        />
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        </>
      )}
    </Box>
  );
}
