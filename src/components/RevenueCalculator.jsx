import { useEffect, useState } from 'react';
import { Box, Button, VStack, Heading, Text, Center, Flex, Spinner, SimpleGrid, Table } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { getGame, updateGameState } from '../api/mockApi.js';

export default function RevenueCalculator() {
  const [match, params] = useRoute('/game/:id/calculator');
  
  const [loading, setLoading] = useState(true);
  const [gameInstance, setGameInstance] = useState(null);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [trains, setTrains] = useState([{ id: 1, stops: [] }]);
  const [isHalfPay, setIsHalfPay] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!match || !params?.id) return;
    
    async function loadData() {
      try {
        const instance = await getGame(params.id);
        setGameInstance(instance);
        if (instance.state?.activeCompanies?.length > 0) {
          setSelectedCompanyId(instance.state.activeCompanies[0].shortName);
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
  const grandTotal = trains.reduce((sum, t) => sum + t.stops.reduce((s, v) => s + v, 0), 0);

  const handleAddStop = (trainId, val) => {
    setTrains(prev => prev.map(t => t.id === trainId ? { ...t, stops: [...t.stops, val] } : t));
  };

  const handleRemoveStop = (trainId, indexToRemove) => {
    setTrains(prev => prev.map(t => t.id === trainId ? { ...t, stops: t.stops.filter((_, idx) => idx !== indexToRemove) } : t));
  };

  const handleClearTrain = (trainId) => {
    setTrains(prev => prev.map(t => t.id === trainId ? { ...t, stops: [] } : t));
  };

  const handleRemoveTrain = (trainId) => {
    setTrains(prev => prev.filter(t => t.id !== trainId));
  };

  const handleCopyTrain = (trainToCopy) => {
    setTrains(prev => [...prev, { id: Date.now(), stops: [...trainToCopy.stops] }]);
  };

  const handleAddTrain = () => {
    setTrains(prev => [...prev, { id: Date.now(), stops: [] }]);
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
      setTrains([{ id: Date.now(), stops: [] }]);
      setIsHalfPay(false);
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

        <VStack gap="6" align="stretch" mb="6">
          {trains.map((train, i) => {
            const trainTotal = train.stops.reduce((s, v) => s + v, 0);
            return (
              <Box key={train.id} bg="gray.800" p="6" borderRadius="md" border="1px solid" borderColor="whiteAlpha.200">
                <Flex justify="space-between" align="center" mb="4">
                  <VStack align="start" gap="2">
                    <Heading size="md" color="white">Train {i + 1} Total: ${trainTotal}</Heading>
                    <Flex wrap="wrap" gap="1" align="center" minH="32px">
                      {train.stops.length === 0 && <Text color="gray.500" fontSize="sm">No stops added.</Text>}
                      {train.stops.map((stop, index) => (
                        <Flex key={index} align="center">
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
                          {index < train.stops.length - 1 && <Text color="gray.600" mx="1">+</Text>}
                        </Flex>
                      ))}
                    </Flex>
                  </VStack>
                  <VStack gap="2">
                    <Button size="xs" variant="outline" colorPalette="red" onClick={() => handleClearTrain(train.id)} disabled={train.stops.length === 0}>
                      Clear
                    </Button>
                    <Button size="xs" variant="outline" colorPalette="orange" onClick={() => handleCopyTrain(train)}>
                      Copy Train
                    </Button>
                    {trains.length > 1 && (
                      <Button size="xs" variant="ghost" colorPalette="red" onClick={() => handleRemoveTrain(train.id)}>
                        Remove Train
                      </Button>
                    )}
                  </VStack>
                </Flex>

                <SimpleGrid columns={5} gap="2">
                  {stopValues.map(val => (
                    <Button
                      key={val}
                      size="lg"
                      color="white"
                      variant="outline"
                      colorPalette="gray"
                      _hover={{ bg: 'whiteAlpha.200' }}
                      onClick={() => handleAddStop(train.id, val)}
                    >
                      {val}
                    </Button>
                  ))}
                </SimpleGrid>
              </Box>
            );
          })}
        </VStack>

        <Button size="lg" variant="outline" colorPalette="gray" w="100%" mb="8" onClick={handleAddTrain}>
          + Add Train
        </Button>

        <Box bg="gray.800" p="6" borderRadius="md" border="1px solid" borderColor="orange.400" mb="6">
          <Heading size="2xl" color="orange.400" textAlign="center" mb="6">Grand Total: ${grandTotal}</Heading>
          
          <Flex justify="space-between" align="center" mb="4">
            <Text fontWeight="bold">Revenue Per Share (Payout)</Text>
            <Flex>
              <Button 
                size="sm" 
                variant={!isHalfPay ? "solid" : "outline"} 
                colorPalette="orange" 
                onClick={() => setIsHalfPay(false)}
                borderRightRadius={0}
              >
                Full Pay
              </Button>
              <Button 
                size="sm" 
                variant={isHalfPay ? "solid" : "outline"} 
                colorPalette="orange" 
                onClick={() => setIsHalfPay(true)}
                borderLeftRadius={0}
              >
                Half Pay
              </Button>
            </Flex>
          </Flex>

          <Box overflowX="auto" mb="6">
            <Table.Root size="sm" variant="line" colorScheme="gray">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>10%</Table.ColumnHeader>
                  <Table.ColumnHeader>20%</Table.ColumnHeader>
                  <Table.ColumnHeader>30%</Table.ColumnHeader>
                  <Table.ColumnHeader>40%</Table.ColumnHeader>
                  <Table.ColumnHeader>50%</Table.ColumnHeader>
                  <Table.ColumnHeader>60%</Table.ColumnHeader>
                  <Table.ColumnHeader>70%</Table.ColumnHeader>
                  <Table.ColumnHeader>80%</Table.ColumnHeader>
                  <Table.ColumnHeader>90%</Table.ColumnHeader>
                  <Table.ColumnHeader>100%</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                <Table.Row>
                  <Table.Cell>${Math.floor((isHalfPay ? grandTotal / 2 : grandTotal) * 0.1)}</Table.Cell>
                  <Table.Cell>${Math.floor((isHalfPay ? grandTotal / 2 : grandTotal) * 0.2)}</Table.Cell>
                  <Table.Cell>${Math.floor((isHalfPay ? grandTotal / 2 : grandTotal) * 0.3)}</Table.Cell>
                  <Table.Cell>${Math.floor((isHalfPay ? grandTotal / 2 : grandTotal) * 0.4)}</Table.Cell>
                  <Table.Cell>${Math.floor((isHalfPay ? grandTotal / 2 : grandTotal) * 0.5)}</Table.Cell>
                  <Table.Cell>${Math.floor((isHalfPay ? grandTotal / 2 : grandTotal) * 0.6)}</Table.Cell>
                  <Table.Cell>${Math.floor((isHalfPay ? grandTotal / 2 : grandTotal) * 0.7)}</Table.Cell>
                  <Table.Cell>${Math.floor((isHalfPay ? grandTotal / 2 : grandTotal) * 0.8)}</Table.Cell>
                  <Table.Cell>${Math.floor((isHalfPay ? grandTotal / 2 : grandTotal) * 0.9)}</Table.Cell>
                  <Table.Cell fontWeight="bold" color="orange.300">${isHalfPay ? Math.floor(grandTotal / 2) : grandTotal}</Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table.Root>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
