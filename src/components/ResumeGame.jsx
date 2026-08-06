import { useEffect, useState, useRef } from 'react';
import { Box, Button, Heading, Text, Center, Flex, Spinner, SimpleGrid } from '@chakra-ui/react';
import { useLocation } from 'wouter';
import LZString from 'lz-string';
import { getGamesList, deleteGame, importGame } from '../api/mockApi.js';
import ModalBackdrop from './ui/ModalBackdrop.jsx';

export default function ResumeGame() {
  const [, navigate] = useLocation();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importError, setImportError] = useState(null);
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const list = await getGamesList();
        if (isMounted) setGames(list);
      } catch (err) {
        console.error('Error fetching games list:', err);
        if (isMounted) setError('Failed to load games data. Storage might be corrupted.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();

    // Check for Magic Link import
    const hash = window.location.hash;
    if (hash.startsWith('#import=')) {
      const compressedData = hash.replace('#import=', '');
      try {
        const jsonString = LZString.decompressFromEncodedURIComponent(compressedData);
        if (jsonString) {
          const gameData = JSON.parse(jsonString);
          importGame(gameData).then(() => {
            window.location.hash = ''; // Clear hash
            navigate(`/game/${gameData.id}/dashboard`);
          });
        }
      } catch (err) {
        console.error("Failed to parse magic link", err);
        setImportError('Invalid or corrupted share link.');
      }
    }

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // Focus trap for delete confirmation modal
  useEffect(() => {
    if (deleteTarget && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length > 0) focusable[0].focus();
    }
  }, [deleteTarget]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setDeleteTarget(null);
      return;
    }

    if (e.key === 'Tab') {
      if (!modalRef.current) return;
      const focusable = Array.from(modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    const previousGames = games;

    // Optimistic removal
    setGames(prev => prev.filter(g => g.id !== targetId));
    setDeleteTarget(null);

    try {
      await deleteGame(targetId);
    } catch (err) {
      console.error('Failed to delete game:', err);
      setGames(previousGames);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();
      const data = JSON.parse(text);
      
      await importGame(data);
      
      const list = await getGamesList();
      setGames(list);
      setImportError(null);
    } catch (err) {
      console.error('Failed to import game:', err);
      setImportError('Failed to import file. Make sure it is a valid game export.');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  if (loading) return <Center h="100vh" bg="gray.900"><Spinner color="orange.400" size="xl" /></Center>;

  if (error) return (
    <Center h="100vh" bg="gray.900" flexDirection="column" gap="4">
      <Text color="red.400" fontSize="xl">{error}</Text>
      <Button colorPalette="orange" onClick={() => { localStorage.removeItem('18komputer_games'); window.location.reload(); }}>Clear Data &amp; Reload</Button>
    </Center>
  );

  return (
    <Box minH="100vh" bg="gray.900" color="white" p="8">
      <Box maxW="4xl" mx="auto">
        <Flex justify="space-between" align="center" mb="8" wrap="wrap" gap="4">
          <Heading as="h2" size="xl" color="orange.400">
            Resume Game
          </Heading>
          <Flex gap="3">
            <input 
              type="file" 
              accept=".json" 
              style={{ display: 'none' }} 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            <Button variant="outline" color="white" borderColor="orange.400" _hover={{ bg: 'orange.900' }} onClick={handleImportClick}>
              📥 Import Game
            </Button>
            <Button variant="outline" color="white" borderColor="whiteAlpha.400" _hover={{ bg: 'whiteAlpha.200' }} onClick={() => navigate('/')}>
              Back to Menu
            </Button>
          </Flex>
        </Flex>

        {importError && (
          <Box mb="6" p="3" bg="red.900" color="white" borderRadius="md" border="1px solid" borderColor="red.500">
            <Text>{importError}</Text>
          </Box>
        )}

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
                  
                  <Flex justify="space-between" align="center">
                    <Flex gap="2" wrap="wrap">
                      <Box bg="orange.400" color="black" px="2" py="1" borderRadius="full">
                        <Text fontSize="xs" fontWeight="bold">{game.players?.length || 0} Players</Text>
                      </Box>
                    </Flex>
                    <Button
                      size="xs"
                      variant="outline"
                      colorPalette="red"
                      borderColor="red.800"
                      color="red.400"
                      _hover={{ bg: 'red.900', borderColor: 'red.500' }}
                      aria-label={`Delete game ${game.gameId} #${hash}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(game);
                      }}
                    >
                      Delete
                    </Button>
                  </Flex>
                </Box>
              );
            })}
          </SimpleGrid>
        )}
      </Box>

      {deleteTarget && (
        <ModalBackdrop
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          tabIndex="-1"
          onKeyDown={handleKeyDown}
          onClose={() => setDeleteTarget(null)}
          textAlign="center"
        >
            <Heading id="delete-modal-title" size="md" mb="2" color="white">Delete Game?</Heading>
            <Text color="gray.300" mb="2" fontSize="sm">
              This will permanently delete the <strong>{deleteTarget.gameId}</strong> game with {deleteTarget.players?.length || 0} players.
            </Text>
            <Text color="gray.500" mb="6" fontSize="xs">This action cannot be undone.</Text>
            <Flex gap="4">
              <Button flex="1" variant="outline" color="white" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button flex="1" colorPalette="red" onClick={handleDelete}>Delete</Button>
            </Flex>
        </ModalBackdrop>
      )}
    </Box>
  );
}
