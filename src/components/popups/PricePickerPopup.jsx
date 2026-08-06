import { Box, Flex, Text, Button, SimpleGrid } from '@chakra-ui/react';
import ModalBackdrop from '../ui/ModalBackdrop.jsx';
import CompanyBadge from '../ui/CompanyBadge.jsx';

export default function PricePickerPopup({ company, value, options, onChange, onClose }) {
  const valNum = value === '' || value === undefined ? null : Number(value);
  const currentIndex = options.findIndex(opt => opt === valNum);
  
  const handlePrev = () => {
    if (currentIndex > 0) onChange(options[currentIndex - 1]);
    else if (currentIndex === -1 && options.length > 0) onChange(options[0]);
    onClose();
  };
  
  const handleNext = () => {
    if (currentIndex < options.length - 1 && currentIndex !== -1) onChange(options[currentIndex + 1]);
    else if (currentIndex === -1 && options.length > 0) onChange(options[0]);
    onClose();
  };

  return (
    <ModalBackdrop onClose={onClose}>
        <Flex align="center" gap="2" mb="4">
          <Text fontWeight="bold" color="white">Set final price for</Text>
          <CompanyBadge company={company} px="2" py="1" fontSize="sm" />
        </Flex>

        <Flex gap="4">
          <Box flex="1" maxH="300px" overflowY="auto">
            <SimpleGrid columns={4} gap="2">
              {options.slice().reverse().map(opt => (
                <Button 
                  key={opt} 
                  size="sm" 
                  variant={valNum === opt ? 'solid' : 'ghost'} 
                  color={valNum === opt ? 'black' : 'gray.300'}
                  bg={valNum === opt ? 'white' : 'transparent'}
                  _hover={{ bg: 'whiteAlpha.200' }}
                  onClick={() => {
                    onChange(opt);
                    onClose();
                  }}
                >
                  {opt}
                </Button>
              ))}
            </SimpleGrid>
          </Box>
          
          <Flex direction="column" gap="2" w="50px">
            <Button w="100%" h="50px" variant="outline" color="white" borderColor="gray.600" onClick={() => onChange('')}>C</Button>
            <Button w="100%" h="50px" variant="outline" color="white" borderColor="gray.600" onClick={handlePrev}>←</Button>
            <Button w="100%" h="50px" variant="outline" color="white" borderColor="gray.600" onClick={handleNext}>→</Button>
            <Button w="100%" h="50px" variant="outline" color="white" borderColor="gray.600" onClick={onClose}>X</Button>
          </Flex>
        </Flex>
    </ModalBackdrop>
  );
}
