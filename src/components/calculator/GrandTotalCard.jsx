import { Box, Flex, Heading, Text, Center, Button, SimpleGrid } from '@chakra-ui/react';

export default function GrandTotalCard({ grandTotal, isHalfPay, onSetHalfPay }) {
  return (
    <Box bg="gray.800" p="3" borderRadius="md" border="1px solid" borderColor="orange.400" mb="2">
      <Heading size="2xl" color="orange.400" textAlign="center" mb="6">Grand Total: ${grandTotal}</Heading>
      
      <Flex justify="space-between" align="center" mb="4">
        <Text fontWeight="bold">Revenue Per Share (Payout)</Text>
        <Flex>
          <Button 
            size="sm" 
            variant={!isHalfPay ? "solid" : "outline"} 
            colorPalette="orange" 
            onClick={() => onSetHalfPay(false)}
            borderRightRadius={0}
          >
            Full Pay
          </Button>
          <Button 
            size="sm" 
            variant={isHalfPay ? "solid" : "outline"} 
            colorPalette="orange" 
            onClick={() => onSetHalfPay(true)}
            borderLeftRadius={0}
          >
            Half Pay
          </Button>
        </Flex>
      </Flex>

      <Box overflowX="auto" mb="6">
        <Box minW="600px">
          <SimpleGrid columns={10} bg="gray.700" borderTopRadius="md" border="1px solid" borderColor="whiteAlpha.300">
            {['10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%'].map(pct => (
              <Center key={pct} p="2" borderRight="1px solid" borderColor="whiteAlpha.300">
                <Text fontWeight="bold" color={pct === '100%' ? 'orange.300' : 'gray.300'} fontSize="sm">{pct}</Text>
              </Center>
            ))}
          </SimpleGrid>
          <SimpleGrid columns={10} bg="gray.800" borderBottomRadius="md" border="1px solid" borderTop="none" borderColor="whiteAlpha.300">
            {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((mult, idx) => (
              <Center key={idx} p="2" borderRight="1px solid" borderColor="whiteAlpha.300">
                <Text color={mult === 1 ? 'orange.300' : 'white'} fontWeight={mult === 1 ? 'bold' : 'normal'} fontSize="sm">
                  ${Math.floor((isHalfPay ? grandTotal / 2 : grandTotal) * mult)}
                </Text>
              </Center>
            ))}
          </SimpleGrid>
        </Box>
      </Box>
    </Box>
  );
}
