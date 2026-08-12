import { Box, Flex, Heading, Text } from '@chakra-ui/react';

export default function ChartCard({ title, subtitle, children, ...props }) {
  return (
    <Box bg="gray.900" p="6" borderRadius="xl" border="1px solid" borderColor="gray.800" shadow="xl" {...props}>
      <Flex justify="space-between" align="baseline" gap="3" mb="4" wrap="wrap">
        <Heading size="md" color="teal.300">{title}</Heading>
        {subtitle && <Text fontSize="sm" color="gray.500">{subtitle}</Text>}
      </Flex>
      {children}
    </Box>
  );
}
