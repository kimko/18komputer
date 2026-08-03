import { useEffect, useState } from 'react';
import { Box, Button, VStack, Heading, Text, Center, Flex, Spinner } from '@chakra-ui/react';
import { useRoute, useLocation } from 'wouter';
import { getGame, updateGameState } from '../api/mockApi.js';

export default function RaiseFunds() {
  const [match, params] = useRoute('/game/:id/setup');
  const [, navigate] = useLocation();

  const [loading, setLoading] = useState(true);
  const [gameInstance, setGameInstance] = useState(null);
  const [gameDef, setGameDef] = useState(null);
  const [activeCompanies, setActiveCompanies] = useState({});

  useEffect(() => {
    if (!match || !params?.id) return;
    
    async function loadData() {
      try {
        const instance = await getGame(params.id);
        setGameInstance(instance);
        
        // Dynamically import the JSON definition
        const defModule = await import(`../data/games/${instance.gameId}.json`);
        setGameDef(defModule.default);
        
        // Initialize local state if there are existing active companies
        if (instance.state?.activeCompanies) {
          const map = {};
          instance.state.activeCompanies.forEach(c => {
            map[c.shortName] = c.parValue;
          });
          setActiveCompanies(map);
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
  if (loading) return <Center h="100vh" bg="gray.900"><Spinner color="teal.400" size="xl" /></Center>;
  if (!gameInstance || !gameDef) return <Center h="100vh" bg="gray.900" color="white">Error loading game data.</Center>;

  const toggleCompany = (shortName) => {
    setActiveCompanies(prev => {
      const next = { ...prev };
      if (next[shortName] !== undefined) {
        delete next[shortName];
      } else {
        // Default to first par value
        next[shortName] = gameDef.parValues[0] || 0;
      }
      return next;
    });
  };

  const updateParValue = (shortName, val) => {
    setActiveCompanies(prev => ({
      ...prev,
      [shortName]: parseInt(val, 10)
    }));
  };

  const handleSubmit = async () => {
    const finalCompanies = gameDef.companies
      .filter(c => activeCompanies[c.shortName] !== undefined)
      .map(c => ({
        ...c,
        parValue: activeCompanies[c.shortName]
      }));

    try {
      await updateGameState(gameInstance.id, {
        activeCompanies: finalCompanies
      });
      navigate(`/game/${gameInstance.id}/dashboard`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box minH="100vh" bg="gray.900" color="white" p="8">
      <Box maxW="2xl" mx="auto">
        <Heading as="h2" size="xl" color="teal.400" mb="2">
          Raise Funds
        </Heading>
        <Text color="gray.400" mb="8">Activate companies and set their initial par values.</Text>

        <VStack gap="4" align="stretch" mb="8">
          {gameDef.companies?.map(company => {
            const isActive = activeCompanies[company.shortName] !== undefined;
            return (
              <Flex 
                key={company.shortName} 
                p="4" 
                bg="gray.800" 
                borderRadius="md" 
                align="center" 
                justify="space-between"
                borderLeft="4px solid"
                borderColor={company.color}
              >
                <Box>
                  <Text fontWeight="bold">{company.name} ({company.shortName})</Text>
                </Box>
                
                <Flex align="center" gap="4">
                  {isActive && (
                    <select
                      aria-label={`Par Value for ${company.shortName}`}
                      value={activeCompanies[company.shortName]}
                      onChange={(e) => updateParValue(company.shortName, e.target.value)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        backgroundColor: '#2D3748',
                        color: 'white',
                        border: '1px solid #4A5568'
                      }}
                    >
                      {gameDef.parValues?.map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  )}
                  
                  <Button 
                    size="sm" 
                    colorPalette={isActive ? "red" : "teal"}
                    variant={isActive ? "outline" : "solid"}
                    onClick={() => toggleCompany(company.shortName)}
                  >
                    {isActive ? 'Deactivate' : `Activate ${company.shortName}`}
                  </Button>
                </Flex>
              </Flex>
            );
          })}
        </VStack>

        <Button 
          size="lg" 
          colorPalette="teal" 
          w="100%" 
          onClick={handleSubmit}
        >
          Complete Setup
        </Button>
      </Box>
    </Box>
  );
}
