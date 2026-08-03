import { Box, Flex, Heading, Button } from '@chakra-ui/react';
import { Link, useRoute } from 'wouter';

export default function GameLayout({ children }) {
  const [match, params] = useRoute('/game/:id/*any');
  const gameId = params?.id;

  if (!match || !gameId) {
    return <>{children}</>; // If not in a game route, just render children
  }

  return (
    <Box minH="100vh" bg="gray.900" color="white">
      {/* Top Navigation Bar */}
      <Flex 
        as="nav" 
        bg="gray.800" 
        p="4" 
        align="center" 
        justify="space-between"
        borderBottom="1px solid"
        borderColor="whiteAlpha.200"
        position="sticky"
        top="0"
        zIndex="10"
      >
        <Heading as="h1" size="md" color="teal.400">
          <Link href="/">18XXc</Link>
        </Heading>
        
        <Flex gap="4">
          <Link href={`/game/${gameId}/dashboard`}>
            <Button variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm">
              Dashboard
            </Button>
          </Link>
          <Link href={`/game/${gameId}/calculator`}>
            <Button variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm">
              Calculator
            </Button>
          </Link>
          <Link href={`/game/${gameId}/setup`}>
            <Button variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm">
              Raise Funds
            </Button>
          </Link>
        </Flex>
      </Flex>
      
      {/* Main Content Area */}
      <Box p="4">
        {children}
      </Box>
    </Box>
  );
}
