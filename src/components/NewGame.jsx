import { useState } from 'react';
import { Box, Button, VStack, Heading, Text, Center, Input, Flex, IconButton } from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { createGame } from '../api/mockApi.js';
import gameIndex from '../data/games/index.json';

export default function NewGame() {
  const [, navigate] = useLocation();
  const [selectedGame, setSelectedGame] = useState(gameIndex[0]?.id || '');
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddPlayer = (e) => {
    e.preventDefault();
    if (playerName.trim()) {
      setPlayers([...players, playerName.trim()]);
      setPlayerName('');
    }
  };

  const handleRemovePlayer = (index) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedGame || players.length === 0) return;
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
            <Button variant="ghost" colorPalette="gray" size="sm" onClick={() => navigate('/')} mb="4">
              &larr; Back
            </Button>
            <Heading as="h2" size="xl" color="teal.400">
              New Game
            </Heading>
            <Text color="gray.400">Select a title and add players.</Text>
          </Box>

          <Box>
            <Text mb="2" fontWeight="bold">Select Game</Text>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                backgroundColor: '#2D3748',
                color: 'white',
                border: '1px solid #4A5568'
              }}
            >
              {gameIndex.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name || game.id}
                </option>
              ))}
            </select>
          </Box>

          <Box>
            <Text mb="2" fontWeight="bold">Players</Text>
            <form onSubmit={handleAddPlayer}>
              <Flex gap="2">
                <Input
                  placeholder="Player Name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  bg="gray.700"
                  border="none"
                />
                <Button type="submit" colorPalette="teal">
                  Add Player
                </Button>
              </Flex>
            </form>
          </Box>

          {players.length > 0 && (
            <VStack align="stretch" gap="2" mt="2" bg="gray.700" p="4" borderRadius="md">
              {players.map((p, idx) => (
                <Flex key={idx} justify="space-between" align="center">
                  <Text>{p}</Text>
                  <Button size="xs" colorPalette="red" variant="outline" onClick={() => handleRemovePlayer(idx)}>
                    Remove
                  </Button>
                </Flex>
              ))}
            </VStack>
          )}

          <Button
            size="lg"
            colorPalette="teal"
            w="100%"
            h="14"
            mt="4"
            onClick={handleSubmit}
            disabled={players.length === 0 || isLoading}
            loading={isLoading}
          >
            Start Game
          </Button>
        </VStack>
      </Box>
    </Center>
  );
}
