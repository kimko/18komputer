import { useState, useMemo } from 'react';
import { Box, Button, VStack, Heading, Text, Center, Input, Flex, IconButton } from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { createGame, getUsers, saveUsers } from '../api/mockApi.js';
import gameIndex from '../data/gamesIndex.json';

export default function NewGame() {
  const [, navigate] = useLocation();
  const [selectedGame, setSelectedGame] = useState(gameIndex[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [roster, setRoster] = useState(() => getUsers());
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleUser = (name) => {
    if (players.includes(name)) {
      setPlayers(players.filter(p => p !== name));
    } else {
      setPlayers([...players, name]);
    }
  };

  const handleAddPlayer = (e) => {
    e.preventDefault();
    const name = playerName.trim();
    if (name && !players.includes(name)) {
      setPlayers([...players, name]);
      saveUsers([name]);
      setRoster(getUsers());
      setPlayerName('');
    }
  };

  const filteredGames = useMemo(() => {
    return gameIndex.filter(game => {
      const term = searchQuery.toLowerCase().replace(/\*/g, '');
      const name = game.name?.toLowerCase() || '';
      const id = game.id.toLowerCase();
      return name.includes(term) || id.includes(term);
    });
  }, [searchQuery]);

  const handleRemovePlayer = (index) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedGame || players.length < 2) return;
    setIsLoading(true);
    try {
      const game = await createGame(selectedGame, players);
      navigate(`/game/${game.id}/setup`);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <Center minH="100vh" bg="gray.900" color="white" p="4">
      <Box
        w="100%"
        maxW="md"
        bg="gray.800"
        p="8"
        borderRadius="xl"
        boxShadow="2xl"
        border="1px solid"
        borderColor="whiteAlpha.200"
      >
        <VStack gap="6" align="stretch">
          <Box>
            <Flex justify="space-between" align="center" mb="2">
              <Heading as="h2" size="xl" color="orange.400">
                New Game
              </Heading>
              <IconButton variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm" aria-label="Close" onClick={() => navigate('/')}>
                ✕
              </IconButton>
            </Flex>
            <Text color="gray.400">Select a title and add players.</Text>
          </Box>

          <Box>
            <Flex justify="space-between" align="center" mb="2">
              <Text fontWeight="bold">Select Game</Text>
              <Input
                size="sm"
                w="200px"
                placeholder="Search titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                bg="gray.700"
                border="none"
              />
            </Flex>
            <Box maxH="200px" overflowY="auto" overflowX="hidden" border="1px solid" borderColor="whiteAlpha.200" borderRadius="md" p="2" bg="gray.800">
              <VStack align="stretch" gap="1">
                {filteredGames.map((game) => (
                  <Button
                    key={game.id}
                    justifyContent="flex-start"
                    color="white"
                    _hover={{ bg: selectedGame === game.id ? undefined : 'whiteAlpha.200' }}
                    variant={selectedGame === game.id ? "solid" : "ghost"}
                    colorPalette={selectedGame === game.id ? "orange" : "gray"}
                    onClick={() => setSelectedGame(game.id)}
                    whiteSpace="normal"
                    height="auto"
                    py="2"
                    textAlign="left"
                  >
                    {game.name || game.id}
                  </Button>
                ))}
              </VStack>
            </Box>
          </Box>

          <Box>
            <Text mb="3" fontWeight="bold">Players</Text>

            {/* Known users chip picker */}
            {roster.length > 0 && (
              <Box mb="3">
                <Text mb="2" fontSize="sm" color="gray.400">Select from roster:</Text>
                <Flex wrap="wrap" gap="2">
                  {roster.map(name => {
                    const selected = players.includes(name);
                    return (
                      <Button
                        key={name}
                        size="sm"
                        variant={selected ? 'solid' : 'outline'}
                        colorPalette={selected ? 'orange' : 'gray'}
                        color={selected ? undefined : 'white'}
                        onClick={() => handleToggleUser(name)}
                      >
                        {selected ? '✓ ' : ''}{name}
                      </Button>
                    );
                  })}
                </Flex>
              </Box>
            )}

            {/* Quick-create new player */}
            <form onSubmit={handleAddPlayer}>
              <Flex gap="2">
                <Input
                  placeholder="New player name..."
                  aria-label="Player Name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  bg="gray.700"
                  border="none"
                />
                <Button type="submit" colorPalette="orange">+ Add</Button>
              </Flex>
            </form>
          </Box>

          {players.length > 0 && (
            <VStack align="stretch" gap="2" bg="gray.700" p="4" borderRadius="md">
              {players.map((p) => (
                <Flex key={p} justify="space-between" align="center">
                  <Text>{p}</Text>
                  <Button size="xs" colorPalette="red" variant="outline" onClick={() => handleRemovePlayer(players.indexOf(p))}>
                    Remove
                  </Button>
                </Flex>
              ))}
            </VStack>
          )}

          <Button
            size="lg"
            colorPalette="orange"
            _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
            w="100%"
            h="14"
            mt="4"
            onClick={handleSubmit}
            disabled={players.length < 2 || isLoading}
            loading={isLoading}
          >
            Start Game
          </Button>
        </VStack>
      </Box>
    </Center>
  );
}
