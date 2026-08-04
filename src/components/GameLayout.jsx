import { Box, Flex, Heading, Button, Text } from '@chakra-ui/react';
import { Link, useRoute, useLocation } from 'wouter';
import { useState } from 'react';

export default function GameLayout({ children }) {
  const [match, params] = useRoute('/game/:id/*any');
  const [, navigate] = useLocation();
  const [showConfirm, setShowConfirm] = useState(false);
  const gameId = params?.id;

  if (!match || !gameId) {
    return <>{children}</>; // If not in a game route, just render children
  }

  if (match && !gameId) {
    navigate('/');
    return null;
  }

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
        <Heading as="h1" size="sm" color="orange.400">
          <Link href="/">🚂</Link>
        </Heading>
        
        <Flex gap="1" flexWrap="wrap" justify="flex-end">
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
        <Box style={{ display: 'flex', flex: 1, padding: '0 2px' }}>
          <Button w="100%" h="12" variant="outline" borderColor="whiteAlpha.400" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm" onClick={() => setShowConfirm(true)}>
            New
          </Button>
        </Box>
      </Flex>

      {showConfirm && (
        <Box role="dialog" aria-modal="true" aria-labelledby="modal-title" position="fixed" tabIndex="-1" onKeyDown={(e) => { if(e.key === 'Escape') setShowConfirm(false); }} top="0" left="0" w="100vw" h="100vh" bg="blackAlpha.700" zIndex="1000" display="flex" alignItems="center" justifyContent="center" onClick={() => setShowConfirm(false)}>
          <Box bg="gray.900" p="6" borderRadius="lg" border="1px solid" borderColor="whiteAlpha.300" onClick={e => e.stopPropagation()} maxW="xs" w="100%" textAlign="center">
            <Heading id="modal-title" size="md" mb="2" color="white">Are you sure?</Heading>
            <Text color="gray.300" mb="6" fontSize="sm">This will leave the current game.</Text>
            <Flex gap="4">
              <Button flex="1" variant="outline" color="white" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button flex="1" colorPalette="red" onClick={() => { setShowConfirm(false); navigate('/new'); }}>Leave</Button>
            </Flex>
          </Box>
        </Box>
      )}
    </Box>
  );
}
