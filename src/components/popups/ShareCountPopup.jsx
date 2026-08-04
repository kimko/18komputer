import { Box, Flex, Text, Button, SimpleGrid } from '@chakra-ui/react';
import { getContrastColor } from '../../utils/colorUtils.js';

export default function ShareCountPopup({ company, player, value, maxAvailable, onChange, onClose }) {
  const options = [];
  for (let i = 0; i <= maxAvailable; i += 10) {
    options.push(i);
  }

  return (
    <Box position="fixed" top="0" left="0" w="100vw" h="100vh" bg="blackAlpha.700" zIndex="1000" display="flex" alignItems="center" justifyContent="center" onClick={onClose}>
      <Box bg="gray.900" p="4" borderRadius="lg" border="1px solid" borderColor="whiteAlpha.300" onClick={e => e.stopPropagation()} maxW="sm" w="100%">
        <Flex align="center" gap="2" mb="4">
          <Text fontWeight="bold" color="white">Set {player}'s shares for</Text>
          <Box bg={company.color || 'gray.700'} px="2" py="1" borderRadius="md">
            <Text fontSize="sm" color={getContrastColor(company.color || '#2d3748')}>{company.shortName}</Text>
          </Box>
        </Flex>

        <SimpleGrid columns={4} gap="2" mb="4">
          {options.map(opt => (
            <Button 
              key={opt} 
              size="sm" 
              variant={Number(value) === opt ? 'solid' : 'outline'} 
              color={Number(value) === opt ? 'black' : 'white'}
              bg={Number(value) === opt ? 'white' : 'transparent'}
              borderColor="gray.600"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => {
                onChange(opt);
                onClose();
              }}
            >
              {opt}%
            </Button>
          ))}
        </SimpleGrid>
        <Button w="100%" variant="outline" color="white" borderColor="gray.600" onClick={onClose}>Cancel</Button>
      </Box>
    </Box>
  );
}
