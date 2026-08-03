import { Box, Button, VStack, Heading, Text, Center } from '@chakra-ui/react';
import { useLocation } from 'wouter';

export default function MainMenu() {
  const [, navigate] = useLocation();

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
        <VStack gap="8" align="stretch">
          <Box textAlign="center">
            <Heading as="h1" size="2xl" mb="2" color="orange.400">
              TRAIN CALCULATOR
            </Heading>
            <Text color="gray.400">18XX Board Game Assistant</Text>
          </Box>

          <VStack gap="4">
            <Button
              size="lg"
              colorPalette="orange"
              w="100%"
              h="16"
              onClick={() => navigate('/new')}
            >
              NEW GAME
            </Button>

            <Button
              size="lg"
              colorPalette="yellow"
              variant="outline"
              w="100%"
              h="16"
              onClick={() => navigate('/resume')}
            >
              RESUME GAME
            </Button>
          </VStack>

          <Button
            size="md"
            variant="ghost"
            colorPalette="gray"
            onClick={() => navigate('/users')}
          >
            USER MANAGEMENT
          </Button>
        </VStack>
      </Box>
    </Center>
  );
}
