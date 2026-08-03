import { useEffect, useState } from 'react';
import { Box, Button, VStack, Heading, Text, Center, Flex, Spinner, SimpleGrid } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { getGame, updateGameState } from '../api/mockApi.js';

export default function RevenueCalculator() {
  const [match, params] = useRoute('/game/:id/calculator');
  
  const [loading, setLoading] = useState(true);
  const [gameInstance, setGameInstance] = useState(null);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [stops, setStops] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!match || !params?.id) return;
    
    async function loadData() {
      try {
        const instance = await getGame(params.id);
        setGameInstance(instance);
        // Default select the first active company
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
  const currentTotal = stops.reduce((sum, val) => sum + val, 0);

  const handleAddStop = (val) => {
    setStops(prev => [...prev, val]);
  };

  const handleRemoveStop = (indexToRemove) => {
    setStops(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleClear = () => {
    setStops([]);
  };

  const handleSubmit = async () => {
    if (!selectedCompanyId) return;
    
    setSubmitting(true);
    try {
      const newOR = { companyId: selectedCompanyId, revenue: currentTotal };
      const existingORs = gameInstance.state?.companyORs || [];
      const updatedORs = [...existingORs, newOR];
      
      await updateGameState(gameInstance.id, {
        companyORs: updatedORs
      });
      
      // Update local instance to reflect changes
      setGameInstance(prev => ({
        ...prev,
        state: {
          ...prev.state,
          companyORs: updatedORs
        }
      }));
      
      // Reset calc
      setStops([]);
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
        <Text color="gray.400" mb="6">Tap stops to calculate train revenue.</Text>
        
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

        <Box bg="gray.800" p="6" borderRadius="md" border="1px solid" borderColor="whiteAlpha.200" mb="6">
          <Flex justify="space-between" align="center" mb="6">
            <VStack align="start" gap="2">
              <Flex wrap="wrap" gap="1" align="center" minH="32px">
                {stops.length === 0 && <Text color="gray.500" fontSize="sm">No stops added yet.</Text>}
                {stops.map((stop, index) => (
                  <Flex key={index} align="center">
                    <Button 
                      size="xs" 
                      variant="ghost" 
                      color="orange.300"
                      aria-label={`Remove stop ${stop}`}
                      onClick={() => handleRemoveStop(index)}
                      _hover={{ bg: 'whiteAlpha.200', textDecoration: 'line-through' }}
                    >
                      {stop}
                    </Button>
                    {index < stops.length - 1 && <Text color="gray.600" mx="1">+</Text>}
                  </Flex>
                ))}
              </Flex>
              <Heading size="2xl" color="white">
                Total: ${currentTotal} <Text as="span" fontSize="lg" color="gray.400" fontWeight="normal">({stops.length} stops)</Text>
              </Heading>
            </VStack>
            <Button variant="outline" colorPalette="red" onClick={handleClear} disabled={stops.length === 0}>
              Clear
            </Button>
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
                onClick={() => handleAddStop(val)}
              >
                {val}
              </Button>
            ))}
          </SimpleGrid>
        </Box>

        <Button 
          size="lg" 
          colorPalette="orange" 
          w="100%" 
          h="14"
          onClick={handleSubmit}
          disabled={!selectedCompanyId || submitting}
          loading={submitting}
        >
          Submit Revenue
        </Button>
      </Box>
    </Box>
  );
}
