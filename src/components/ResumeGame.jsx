import { useEffect, useState } from 'react';
import { Box, Button, Heading, Text, Center, Flex, Spinner, SimpleGrid } from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { getGamesList } from '../api/mockApi.js';

export default function ResumeGame() {
  const [, navigate] = useLocation();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const list = await getGamesList();
        if (isMounted) setGames(list);
      } catch (err) {
        console.error('Error fetching games list:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <Center h="100vh" bg="gray.900"><Spinner color="orange.400" size="xl" /></Center>;

  return (
    <Box minH="100vh" bg="gray.900" color="white" p="8">
      <Box maxW="4xl" mx="auto">
        <Flex justify="space-between" align="center" mb="8" wrap="wrap" gap="4">
          <Heading as="h2" size="xl" color="orange.400">
            Resume Game
          </Heading>
          <Button variant="outline" color="white" borderColor="whiteAlpha.400" _hover={{ bg: 'whiteAlpha.200' }} onClick={() => navigate('/')}>
            Back to Menu
          </Button>
        </Flex>

        {games.length === 0 ? (
          <Center h="40vh" flexDirection="column" gap="4">
            <Text color="gray.400" fontSize="lg">No active games found.</Text>
            <Button colorPalette="orange" onClick={() => navigate('/new')}>Start a New Game</Button>
          </Center>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="4">
            {games.map(game => {
              const hash = game.id.split('_').pop();
              const date = game.createdAt 
                ? new Date(game.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Unknown Date';
              
              return (
                <Box 
                  key={game.id} 
                  bg="gray.800" 
                  p="4" 
                  borderRadius="md" 
                  border="1px solid" 
                  borderColor="whiteAlpha.200"
                  _hover={{ borderColor: 'orange.400', transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                  cursor="pointer"
                  onClick={() => navigate(`/game/${game.id}/dashboard`)}
                >
                  <Flex justify="space-between" align="center" mb="2">
                    <Heading as="h3" size="lg" color="white">{game.gameId}</Heading>
                    <Box bg="whiteAlpha.200" px="2" py="1" borderRadius="md">
                      <Text fontSize="xs" color="gray.300">#{hash}</Text>
                    </Box>
                  </Flex>
                  <Text color="gray.400" fontSize="sm" mb="4">{date}</Text>
                  
                  <Flex gap="2" wrap="wrap">
                    <Box bg="orange.400" color="black" px="2" py="1" borderRadius="full">
                      <Text fontSize="xs" fontWeight="bold">{game.players?.length || 0} Players</Text>
                    </Box>
                  </Flex>
                </Box>
              );
            })}
          </SimpleGrid>
        )}
      </Box>
    </Box>
  );
}
