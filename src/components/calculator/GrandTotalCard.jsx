import { Box, Flex, Heading, Text, Center, Button, SimpleGrid } from '@chakra-ui/react';
import { calculatePayout } from '../../utils/payoutMath.js';

export default function GrandTotalCard({ grandTotal, isHalfPay, onSetHalfPay, totalShares = 10, onSetTotalShares }) {
  const shares = totalShares || 10;
  const { perShare, companyKeeps } = calculatePayout(grandTotal, shares, isHalfPay);
  const columns = Array.from({ length: shares }, (_, i) => i + 1);

  return (
    <Box bg="gray.800" p="3" borderRadius="md" border="1px solid" borderColor="orange.400" mb="2">
      <Heading size="2xl" color="orange.400" textAlign="center" mb="2">Grand Total: ${grandTotal}</Heading>

      <Text textAlign="center" color="gray.300" fontSize="sm" mb="6">
        ${perShare} per share &middot; ${companyKeeps} stays with the company
      </Text>

      <Flex justify="space-between" align="center" gap="3" wrap="wrap" mb="4">
        <Text fontWeight="bold">Revenue Per Share (Payout)</Text>
        <Flex gap="3" wrap="wrap">
          <Flex>
            <Button
              size="sm"
              variant={shares === 10 ? "solid" : "outline"}
              colorPalette="orange"
              onClick={() => onSetTotalShares(10)}
              borderRightRadius={0}
            >
              10 Share
            </Button>
            <Button
              size="sm"
              variant={shares === 5 ? "solid" : "outline"}
              colorPalette="orange"
              onClick={() => onSetTotalShares(5)}
              borderLeftRadius={0}
            >
              5 Share
            </Button>
          </Flex>
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
      </Flex>

      <Box overflowX="auto" mb="6">
        <Box minW="600px">
          <SimpleGrid columns={shares} bg="gray.700" borderTopRadius="md" border="1px solid" borderColor="whiteAlpha.300">
            {columns.map(held => (
              <Center key={held} p="2" borderRight="1px solid" borderColor="whiteAlpha.300">
                <Text fontWeight="bold" color={held === shares ? 'orange.300' : 'gray.300'} fontSize="sm">
                  {held * (100 / shares)}%
                </Text>
              </Center>
            ))}
          </SimpleGrid>
          <SimpleGrid columns={shares} bg="gray.800" borderBottomRadius="md" border="1px solid" borderTop="none" borderColor="whiteAlpha.300">
            {columns.map(held => (
              <Center key={held} p="2" borderRight="1px solid" borderColor="whiteAlpha.300">
                <Text color={held === shares ? 'orange.300' : 'white'} fontWeight={held === shares ? 'bold' : 'normal'} fontSize="sm">
                  ${perShare * held}
                </Text>
              </Center>
            ))}
          </SimpleGrid>
        </Box>
      </Box>
    </Box>
  );
}
