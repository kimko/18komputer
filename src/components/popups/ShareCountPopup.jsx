import { Box, Flex, Text, Button, SimpleGrid } from '@chakra-ui/react';
import ModalBackdrop from '../ui/ModalBackdrop.jsx';
import CompanyBadge from '../ui/CompanyBadge.jsx';

export default function ShareCountPopup({ company, player, value, maxAvailable, onChange, onClose }) {
  const options = [];
  for (let i = 0; i <= maxAvailable; i += 10) {
    options.push(i);
  }

  return (
    <ModalBackdrop onClose={onClose}>
        <Flex align="center" gap="2" mb="4">
          <Text fontWeight="bold" color="white">Set {player}'s shares for</Text>
          <CompanyBadge company={company} px="2" py="1" fontSize="sm" />
        </Flex>

        <SimpleGrid columns={4} gap="2" mb="4">
          {options.map(opt => (
            <Button 
              key={opt} 
              data-testid="share-pct-btn"
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
    </ModalBackdrop>
  );
}
