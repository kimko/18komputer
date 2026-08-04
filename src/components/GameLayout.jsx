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
          <Link href="/">18komputer</Link>
        </Heading>
        
        <Flex gap="1" flexWrap="wrap" justify="flex-end">
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
              Activate Company
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
        py="2"
        justify="space-between"
      >
        <Link href={`/game/${gameId}/dashboard`}>
          <Button variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm" flex="1" px="2">
            Dashboard
          </Button>
        </Link>
        <Link href={`/game/${gameId}/calculator`}>
          <Button variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm" flex="1" px="2">
            Calculator
          </Button>
        </Link>
        <Link href={`/game/${gameId}/setup`}>
          <Button variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm" flex="1" px="2">
            Activate Company
          </Button>
        </Link>
      </Flex>
    </Box>
  );
}
