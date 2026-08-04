import { Box, Flex, Text, Button, SimpleGrid, GridItem } from '@chakra-ui/react';
import { getContrastColor } from '../../utils/colorUtils.js';

export default function NumpadPopup({ title, subtitle, badgeColor, value, onChange, onClose, onCopyLast, onSubtitleClick }) {
  const handleType = (num) => {
    onChange(String(value || '') + num);
  };
  const handleBackspace = () => {
    const str = String(value || '');
    onChange(str.slice(0, -1));
  };
  const handleClear = () => onChange('');
  
  return (
    <Box position="fixed" top="0" left="0" w="100vw" h="100vh" bg="blackAlpha.700" zIndex="1000" display="flex" alignItems="center" justifyContent="center" onClick={onClose}>
      <Box bg="gray.900" p="4" borderRadius="lg" border="1px solid" borderColor="whiteAlpha.300" onClick={e => e.stopPropagation()} maxW="sm" w="100%">
        <Flex align="center" gap="2" mb="4">
          <Text fontWeight="bold" color="white">{title}</Text>
          {subtitle && (
            onSubtitleClick ? (
              <Button size="sm" bg={badgeColor || 'gray.700'} color={getContrastColor(badgeColor || '#2d3748')} onClick={onSubtitleClick} _hover={{ bg: 'whiteAlpha.300' }}>
                {subtitle}
              </Button>
            ) : (
              <Box bg={badgeColor || 'gray.700'} px="2" py="1" borderRadius="md">
                <Text fontSize="sm" color={getContrastColor(badgeColor || '#2d3748')}>{subtitle}</Text>
              </Box>
            )
          )}
        </Flex>
        
        <Box bg="gray.800" p="3" borderRadius="md" mb="4" textAlign="right" h="12" display="flex" alignItems="center" justifyContent="flex-end">
          <Text fontSize="xl" fontWeight="bold" color="white">{value || '0'}</Text>
        </Box>

        <SimpleGrid columns={4} gap="2">
          <GridItem colSpan={3}>
            <SimpleGrid columns={3} gap="2">
              {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => (
                <Button key={n} h="12" variant="outline" color="white" borderColor="gray.600" _hover={{ bg: 'gray.800' }} onClick={() => handleType(n)}>{n}</Button>
              ))}
              <Button h="12" variant="outline" color="red.300" borderColor="gray.600" _hover={{ bg: 'gray.800' }} onClick={handleClear}>C</Button>
              <Button h="12" variant="outline" color="white" borderColor="gray.600" _hover={{ bg: 'gray.800' }} onClick={() => handleType(0)}>0</Button>
              <Button h="12" variant="outline" color="orange.300" borderColor="gray.600" _hover={{ bg: 'gray.800' }} onClick={handleBackspace}>⌫</Button>
            </SimpleGrid>
          </GridItem>
          <GridItem colSpan={1}>
            <Flex direction="column" h="100%" gap="2">
              {onCopyLast && (
                <Button flex="1" fontSize="xs" whiteSpace="normal" lineHeight="1.2" variant="outline" color="white" borderColor="gray.600" _hover={{ bg: 'gray.800' }} onClick={onCopyLast}>
                  Copy Prev
                </Button>
              )}
              <Button flex="1" colorPalette="teal" onClick={onClose}>OK</Button>
            </Flex>
          </GridItem>
        </SimpleGrid>
      </Box>
    </Box>
  );
}
