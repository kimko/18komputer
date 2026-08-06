import { Box, Flex, Heading, Button, Text, Input } from '@chakra-ui/react';
import { Link, useRoute, useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { useGameData } from '../hooks/useGameData.js';

export default function GameLayout({ children }) {
  const [match, params] = useRoute('/game/:id/*any');
  const [, navigate] = useLocation();
  const gameId = params?.id;

  const { error, gameInstance, updateGameName } = useGameData(match ? gameId : null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (error) {
      navigate('/');
    }
  }, [error, navigate]);

  useEffect(() => {
    if (match && !gameId) {
      navigate('/');
    }
  }, [match, gameId, navigate]);


  if (!match || !gameId) {
    return <>{children}</>; // If not in a game route, just render children
  }

  const handleSaveName = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== gameInstance?.gameName) {
      updateGameName(trimmed);
    }
    setIsEditingName(false);
  };

  return (
    <Box minH="100vh" bg="gray.900" color="white">
      {/* Top Navigation Bar (Desktop Only) */}
      <Flex 
        as="nav" 
        display={{ base: "none", md: "flex" }}
        bg="gray.800" 
        px="4" 
        py="2"
        align="center" 
        justify="space-between"
        borderBottom="1px solid"
        borderColor="whiteAlpha.200"
        position="sticky"
        top="0"
        zIndex="10"
      >
        <Flex align="center" gap="2" minW="0" flex="1">
          <Heading as="h1" size="sm" color="orange.400" flexShrink="0">
            <Link href="/">🚂</Link>
          </Heading>
          {gameInstance?.gameName && (
            isEditingName ? (
              <Input
                size="sm"
                maxW="240px"
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                bg="gray.700"
                border="none"
                color="white"
              />
            ) : (
              <Text
                fontSize="sm"
                color="gray.300"
                cursor="pointer"
                onClick={() => { setEditName(gameInstance.gameName); setIsEditingName(true); }}
                _hover={{ color: 'white' }}
                truncate
              >
                {gameInstance.gameName}
              </Text>
            )
          )}
        </Flex>
        
        <Flex gap="1" flexWrap="wrap" justify="flex-end" flexShrink="0">
          <Link href="/">
            <Button variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm">
              Home
            </Button>
          </Link>
          <Link href={`/game/${gameId}/setup`}>
            <Button variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm">
              Activate Company
            </Button>
          </Link>
          <Link href={`/game/${gameId}/calculator`}>
            <Button variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm">
              Calculator
            </Button>
          </Link>
          <Link href={`/game/${gameId}/dashboard`}>
            <Button variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm">
              Results
            </Button>
          </Link>
        </Flex>
      </Flex>

      {/* Mobile Game Name Header */}
      {gameInstance?.gameName && (
        <Box display={{ base: "block", md: "none" }} px="4" pt="2" pb="1">
          <Text fontSize="sm" color="gray.400" textAlign="center">{gameInstance.gameName}</Text>
        </Box>
      )}
      
      {/* Main Content Area */}
      <Box p="4" pb={{ base: "24", md: "4" }}>
        {children}
      </Box>

      {/* Bottom Navigation Bar (Mobile Only) */}
      <Flex
        as="nav"
        display={{ base: "flex", md: "none" }}
        position="fixed"
        bottom="0"
        left="0"
        w="100%"
        bg="gray.800"
        borderTop="1px solid"
        borderColor="whiteAlpha.200"
        zIndex="10"
        px="2"
        py="3"
        justify="space-between"
      >
        <Link href={`/game/${gameId}/setup`} style={{ display: 'flex', flex: 1, padding: '0 2px' }}>
          <Button w="100%" h="12" variant="outline" borderColor="whiteAlpha.400" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm">
            Company
          </Button>
        </Link>
        <Link href={`/game/${gameId}/calculator`} style={{ display: 'flex', flex: 1, padding: '0 2px' }}>
          <Button w="100%" h="12" variant="outline" borderColor="whiteAlpha.400" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm">
            Calc
          </Button>
        </Link>
        <Link href={`/game/${gameId}/dashboard`} style={{ display: 'flex', flex: 1, padding: '0 2px' }}>
          <Button w="100%" h="12" variant="outline" borderColor="whiteAlpha.400" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm">
            Results
          </Button>
        </Link>
        <Link href="/" style={{ display: 'flex', flex: 1, padding: '0 2px' }}>
          <Button w="100%" h="12" variant="outline" borderColor="whiteAlpha.400" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm">
            Home
          </Button>
        </Link>
      </Flex>

    </Box>
  );
}
