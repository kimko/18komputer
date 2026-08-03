import { useEffect, useState } from 'react';
import { Box, Button, VStack, Heading, Text, Center, Flex, Spinner, SimpleGrid, Table } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { getGame, updateGameState } from '../api/mockApi.js';

export default function RevenueCalculator() {
  const [match, params] = useRoute('/game/:id/calculator');
  
  const [loading, setLoading] = useState(true);
  const [gameInstance, setGameInstance] = useState(null);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companyStates, setCompanyStates] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const trains = companyStates[selectedCompanyId]?.trains || [{ id: 1, stops: [], bonusStops: [] }];
  const isHalfPay = companyStates[selectedCompanyId]?.isHalfPay || false;

  const updateCompanyState = (updates) => {
    if (!selectedCompanyId) return;
    setCompanyStates(prev => {
      const currentState = prev[selectedCompanyId] || { trains: [{ id: 1, stops: [], bonusStops: [] }], isHalfPay: false };
      return {
        ...prev,
        [selectedCompanyId]: { ...currentState, ...updates }
      };
    });
  };

  useEffect(() => {
    if (!match || !params?.id) return;
    
    async function loadData() {
      try {
        const data = await getGame(params.id);
        const configModule = await import(`../data/games/${data.gameId}.json`);
        data.staticConfig = configModule.default || configModule;
        setGameInstance(data);
        if (data.state?.activeCompanies?.length > 0) {
          setSelectedCompanyId(data.state.activeCompanies[0].shortName);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [match, params?.id]);

  if (!match) return null;
  if (loading) return <Center h="100vh" bg="gray.900"><Spinner color="orange.400" size="xl" /></Center>;
  if (!gameInstance) return <Center h="100vh" bg="gray.900" color="white">Error loading game data.</Center>;

  const activeCompanies = gameInstance.state?.activeCompanies || [];
  
  let allBonuses = [];
  if (gameInstance.staticConfig?.hasPullmans) {
    allBonuses.push({ label: 'Pullman', adds: [10, 20, 30] });
  }
  if (gameInstance.staticConfig?.revenueBonuses) {
    allBonuses = [...allBonuses, ...gameInstance.staticConfig.revenueBonuses];
  }
  
  const grandTotal = trains
    .filter(t => !t.isExcluded)
    .reduce((sum, t) => {
      const stopsSum = t.stops.reduce((s, v) => s + v, 0);
      const bonusSum = (t.bonusStops || []).reduce((s, b) => s + b.val, 0);
      return sum + stopsSum + bonusSum;
    }, 0);

  const handleAddStop = (trainId, val) => {
    const updatedTrains = trains.map(t => t.id === trainId ? { ...t, stops: [...t.stops, val] } : t);
    updateCompanyState({ trains: updatedTrains });
  };

  const handleAddBonusStop = (trainId, val, label) => {
    const updatedTrains = trains.map(t => t.id === trainId ? { ...t, bonusStops: [...(t.bonusStops || []), { val, label }] } : t);
    updateCompanyState({ trains: updatedTrains });
  };

  const handleRemoveStop = (trainId, indexToRemove) => {
    const updatedTrains = trains.map(t => t.id === trainId ? { ...t, stops: t.stops.filter((_, idx) => idx !== indexToRemove) } : t);
    updateCompanyState({ trains: updatedTrains });
  };

  const handleRemoveBonusStop = (trainId, indexToRemove) => {
    const updatedTrains = trains.map(t => t.id === trainId ? { ...t, bonusStops: t.bonusStops.filter((_, idx) => idx !== indexToRemove) } : t);
    updateCompanyState({ trains: updatedTrains });
  };

  const handleClearTrain = (trainId) => {
    const updatedTrains = trains.map(t => t.id === trainId ? { ...t, stops: [], bonusStops: [] } : t);
    updateCompanyState({ trains: updatedTrains });
  };

  const handleRemoveTrain = (trainId) => {
    const updatedTrains = trains.filter(t => t.id !== trainId);
    updateCompanyState({ trains: updatedTrains });
  };

  const handleToggleExclude = (trainId) => {
    const updatedTrains = trains.map(t => t.id === trainId ? { ...t, isExcluded: !t.isExcluded } : t);
    updateCompanyState({ trains: updatedTrains });
  };

  const handleCopyTrain = (trainToCopy) => {
    const updatedTrains = [...trains, { id: Date.now(), stops: [...trainToCopy.stops], bonusStops: [...trainToCopy.bonusStops] }];
    updateCompanyState({ trains: updatedTrains });
  };

  const handleSubmit = async (decision) => {
    if (!selectedCompanyId) return;
    
    setSubmitting(true);
    try {
      const newOR = { companyId: selectedCompanyId, revenue: grandTotal, decision };
      const existingORs = gameInstance.state?.companyORs || [];
      const updatedORs = [...existingORs, newOR];
      
      await updateGameState(gameInstance.id, {
        companyORs: updatedORs
      });
      
      setGameInstance(prev => ({
        ...prev,
        state: { ...prev.state, companyORs: updatedORs }
      }));
      
      // Reset calc
      updateCompanyState({ trains: [{ id: Date.now(), stops: [], bonusStops: [] }], isHalfPay: false });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const stopValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  return (
    <Box p="4">
      <Box maxW="2xl" mx="auto">
        <Heading as="h2" size="xl" color="orange.400" mb="2">
          Revenue Calculator
        </Heading>
        <Text color="gray.400" mb="6">Calculate multiple trains and make operating decisions.</Text>
        
        <Box mb="6">
          <Text fontWeight="bold" mb="2">Operating Company</Text>
          {activeCompanies.length === 0 ? (
            <Text color="red.400">No active companies. Go to Raise Funds first.</Text>
          ) : (
            <Flex wrap="wrap" gap="2">
              {activeCompanies.map(c => (
                <Button
                  key={c.shortName}
                  color="white"
                  _hover={{ bg: selectedCompanyId === c.shortName ? undefined : 'whiteAlpha.200' }}
                  variant={selectedCompanyId === c.shortName ? "solid" : "outline"}
                  colorPalette={selectedCompanyId === c.shortName ? "orange" : "gray"}
                  onClick={() => setSelectedCompanyId(c.shortName)}
                >
                  {c.shortName}
                </Button>
              ))}
            </Flex>
          )}
        </Box>

        <VStack gap="6" align="stretch" mb="8">
          {trains.map((train, i) => {
            const stopsSum = train.stops.reduce((s, v) => s + v, 0);
            const bonusSum = (train.bonusStops || []).reduce((s, b) => s + b.val, 0);
            const trainTotal = stopsSum + bonusSum;
            
            return (
              <Box 
                key={train.id} 
                bg="gray.800" 
                p="6" 
                borderRadius="md" 
                border="1px solid" 
                borderColor={train.isExcluded ? "gray.600" : "whiteAlpha.200"}
                opacity={train.isExcluded ? 0.6 : 1}
                transition="opacity 0.2s"
              >
                <Flex justify="flex-end" gap="2" mb="2" wrap="wrap">
                  <Button size="xs" variant="outline" colorPalette="red" onClick={() => handleClearTrain(train.id)} disabled={train.stops.length === 0 && (!train.bonusStops || train.bonusStops.length === 0)}>
                    Clear
                  </Button>
                  <Button size="xs" variant="outline" colorPalette="orange" onClick={() => handleCopyTrain(train)}>
                    Copy
                  </Button>
                  <Button size="xs" variant={train.isExcluded ? "solid" : "outline"} color="white" colorPalette={train.isExcluded ? "green" : "gray"} onClick={() => handleToggleExclude(train.id)}>
                    Exclude
                  </Button>
                  {trains.length > 1 && (
                    <Button size="xs" variant="ghost" colorPalette="red" onClick={() => handleRemoveTrain(train.id)}>
                      Remove
                    </Button>
                  )}
                </Flex>

                <VStack align="start" gap="2" mb="4">
                  <Heading size="lg" color={train.isExcluded ? "gray.400" : "white"}>
                    Train {i + 1} Total: ${trainTotal}
                    <Text as="span" fontSize="sm" color="gray.400" fontWeight="normal" ml="2">
                      ({train.stops.length} {train.stops.length === 1 ? 'stop' : 'stops'})
                    </Text>
                    {train.isExcluded && <Text as="span" ml="2" color="red.400">(Excluded)</Text>}
                  </Heading>
                  <Flex wrap="wrap" gap="1" align="center" minH="32px">
                    {train.stops.length === 0 && (!train.bonusStops || train.bonusStops.length === 0) && <Text color="gray.500" fontSize="sm">No stops added.</Text>}
                    {train.stops.map((stop, index) => (
                      <Flex key={`reg-${index}`} align="center">
                        <Button 
                          size="xs" 
                          variant="ghost" 
                          color="orange.300"
                          aria-label={`Remove stop ${stop}`}
                          onClick={() => handleRemoveStop(train.id, index)}
                          _hover={{ bg: 'whiteAlpha.200', textDecoration: 'line-through' }}
                        >
                          {stop}
                        </Button>
                        {(index < train.stops.length - 1 || (train.bonusStops && train.bonusStops.length > 0)) && <Text color="gray.600" mx="1">+</Text>}
                      </Flex>
                    ))}
                    {train.bonusStops && train.bonusStops.map((stop, index) => (
                      <Flex key={`bonus-${index}`} align="center">
                        <Button 
                          size="xs" 
                          variant="ghost" 
                          color="cyan.400"
                          aria-label={`Remove bonus stop ${stop.val}`}
                          onClick={() => handleRemoveBonusStop(train.id, index)}
                          _hover={{ bg: 'whiteAlpha.200', textDecoration: 'line-through' }}
                        >
                          {stop.val}({stop.label})
                        </Button>
                        {index < train.bonusStops.length - 1 && <Text color="gray.600" mx="1">+</Text>}
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
                        onClick={() => handleAddBonusStop(train.id, val, bonus.label[0])}
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
                      onClick={() => handleAddStop(train.id, val)}
                      disabled={train.isExcluded}
                    >
                      {val}
                    </Button>
                  ))}
                </SimpleGrid>
              </Box>
            );
          })}
        </VStack>

        <Box bg="gray.800" p="6" borderRadius="md" border="1px solid" borderColor="orange.400" mb="6">
          <Heading size="2xl" color="orange.400" textAlign="center" mb="6">Grand Total: ${grandTotal}</Heading>
          
          <Flex justify="space-between" align="center" mb="4">
            <Text fontWeight="bold">Revenue Per Share (Payout)</Text>
            <Flex>
              <Button 
                size="sm" 
                variant={!isHalfPay ? "solid" : "outline"} 
                colorPalette="orange" 
                onClick={() => updateCompanyState({ isHalfPay: false })}
                borderRightRadius={0}
              >
                Full Pay
              </Button>
              <Button 
                size="sm" 
                variant={isHalfPay ? "solid" : "outline"} 
                colorPalette="orange" 
                onClick={() => updateCompanyState({ isHalfPay: true })}
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
      </Box>
    </Box>
  );
}
