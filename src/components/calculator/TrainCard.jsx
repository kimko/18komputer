import { Box, Button, Flex, Heading, Text, VStack, SimpleGrid } from '@chakra-ui/react';

export default function TrainCard({
  train,
  index,
  totalTrains,
  allBonuses,
  onClear,
  onCopy,
  onToggleExclude,
  onRemove,
  onRemoveStop,
  onRemoveBonusStop,
  onAddStop,
  onAddBonusStop
}) {
  const stopsSum = train.stops.reduce((s, v) => s + v, 0);
  const bonusSum = (train.bonusStops || []).reduce((s, b) => s + b.val, 0);
  const trainTotal = stopsSum + bonusSum;

  return (
    <Box 
      bg="gray.800" 
      p="3" 
      borderRadius="md" 
      border="1px solid" 
      borderColor={train.isExcluded ? "gray.600" : "whiteAlpha.200"}
      opacity={train.isExcluded ? 0.6 : 1}
      transition="opacity 0.2s"
    >
      <Flex justify="flex-end" gap="2" mb="2" wrap="wrap">
        <Button size="xs" variant="outline" colorPalette="red" onClick={() => onClear(train.id)} disabled={train.stops.length === 0 && (!train.bonusStops || train.bonusStops.length === 0)}>
          Clear
        </Button>
        <Button size="xs" variant="outline" colorPalette="orange" onClick={() => onCopy(train)}>
          Copy
        </Button>
        <Button size="xs" variant={train.isExcluded ? "solid" : "outline"} color="white" colorPalette={train.isExcluded ? "green" : "gray"} onClick={() => onToggleExclude(train.id)}>
          Exclude
        </Button>
        {totalTrains > 1 && (
          <Button size="xs" variant="ghost" colorPalette="red" onClick={() => onRemove(train.id)}>
            Remove
          </Button>
        )}
      </Flex>

      <VStack align="start" gap="2" mb="4">
        <Heading size="lg" color={train.isExcluded ? "gray.400" : "white"}>
          Train {index + 1} Total: ${trainTotal}
          <Text as="span" fontSize="sm" color="gray.400" fontWeight="normal" ml="2">
            ({train.stops.length} {train.stops.length === 1 ? 'stop' : 'stops'})
          </Text>
        </Heading>
        <Flex wrap="wrap" gap="1" align="center" minH="32px">
          {train.stops.length === 0 && (!train.bonusStops || train.bonusStops.length === 0) && <Text color="gray.500" fontSize="sm">No stops added.</Text>}
          {train.stops.map((stop, idx) => (
            <Flex key={`reg-${idx}`} align="center">
              <Button 
                size="xs" 
                variant="ghost" 
                color="orange.300"
                aria-label={`Remove stop ${stop}`}
                onClick={() => onRemoveStop(train.id, idx)}
                _hover={{ bg: 'whiteAlpha.200', textDecoration: 'line-through' }}
              >
                {stop}
              </Button>
              {(idx < train.stops.length - 1 || (train.bonusStops && train.bonusStops.length > 0)) && <Text color="gray.600" mx="1">+</Text>}
            </Flex>
          ))}
          {train.bonusStops && train.bonusStops.map((stop, idx) => (
            <Flex key={`bonus-${idx}`} align="center">
              <Button 
                size="xs" 
                variant="ghost" 
                color="cyan.400"
                aria-label={`Remove bonus stop ${stop.val}`}
                onClick={() => onRemoveBonusStop(train.id, idx)}
                _hover={{ bg: 'whiteAlpha.200', textDecoration: 'line-through' }}
              >
                {stop.val}({stop.label})
              </Button>
              {idx < train.bonusStops.length - 1 && <Text color="gray.600" mx="1">+</Text>}
            </Flex>
          ))}
        </Flex>
      </VStack>

      <SimpleGrid columns={5} gap="2" mt="4">
        {allBonuses.map(bonus => 
          bonus.adds.map((val) => (
            <Button 
              key={`b-${bonus.label}-${val}`} 
              size="lg" 
              variant="outline" 
              color="cyan.300"
              colorPalette="cyan"
              onClick={() => onAddBonusStop(train.id, val, bonus.label[0])}
              disabled={train.isExcluded}
            >
              {val}({bonus.label[0]})
            </Button>
          ))
        )}
        {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val) => (
          <Button 
            key={val} 
            size="lg" 
            variant="outline" 
            color="white"
            colorPalette="gray"
            onClick={() => onAddStop(train.id, val)}
            disabled={train.isExcluded}
          >
            {val}
          </Button>
        ))}
      </SimpleGrid>
    </Box>
  );
}
