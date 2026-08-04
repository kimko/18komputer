import { useEffect, useState } from 'react';
import { Box, Button, VStack, Heading, Text, Center, Flex, Spinner } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { getGame, updateGameState } from '../api/mockApi.js';
import { getContrastColor } from '../utils/colorUtils.js';

export default function ActivateCompany() {
  const [match, params] = useRoute('/game/:id/setup');

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
  if (loading) return <Center h="100vh" bg="gray.900"><Spinner color="orange.400" size="xl" /></Center>;
  if (!gameInstance || !gameDef) return <Center h="100vh" bg="gray.900" color="white">Error loading game data.</Center>;

  const saveState = async (newState) => {
    const finalCompanies = gameDef.companies
      .filter(c => newState[c.shortName] !== undefined)
      .map(c => ({
        ...c,
        parValue: newState[c.shortName]
      }));

    try {
      await updateGameState(gameInstance.id, {
        activeCompanies: finalCompanies
      });
    } catch (err) {
      console.error(err);
    }
  };

  const hasPlayerShares = (shortName) => {
    if (!gameInstance?.state?.dashboardState?.playerAssets) return false;
    const assets = gameInstance.state.dashboardState.playerAssets;
    return Object.values(assets).some(player => player.shares && Number(player.shares[shortName]) > 0);
  };

  const toggleCompany = (shortName) => {
    const next = { ...activeCompanies };
    if (next[shortName] !== undefined) {
      delete next[shortName];
    } else {
      next[shortName] = gameDef.parValues[0] || 0;
    }
    setActiveCompanies(next);
    saveState(next);
  };

  const updateParValue = (shortName, val) => {
    const next = {
      ...activeCompanies,
      [shortName]: parseInt(val, 10)
    };
    setActiveCompanies(next);
    saveState(next);
  };

  return (
    <Box minH="100vh" bg="gray.900" color="white" p="8">
      <Box maxW="2xl" mx="auto">
        <Heading as="h2" size="xl" color="orange.400" mb="2">
          Activate Company
        </Heading>
        <Text color="gray.400" mb="8">Activate companies and set their initial par values.</Text>

        <VStack gap="4" align="stretch" mb="8">
          {gameDef.companies?.map(company => {
            const isActive = activeCompanies[company.shortName] !== undefined;
            const hasShares = hasPlayerShares(company.shortName);
            return (
              <Box
                key={company.shortName} 
                p="4" 
                bg="gray.800" 
                borderRadius="md" 
                borderLeft="4px solid"
                borderColor={company.color}
              >
                <Flex align="center" justify="space-between">
                  <Text fontWeight="bold">{company.name} ({company.shortName})</Text>
                  
                  <Button 
                    size="sm" 
                    colorPalette={isActive ? "red" : undefined}
                    bg={isActive ? undefined : (company.color || 'gray.700')}
                    color={isActive ? "white" : getContrastColor(company.color || '#2d3748')}
                    variant={isActive ? "outline" : "solid"}
                    onClick={() => toggleCompany(company.shortName)}
                    disabled={isActive && hasShares}
                  >
                    {isActive ? (hasShares ? 'Shares Held' : 'Deactivate') : `Activate ${company.shortName}`}
                  </Button>
                </Flex>

                {isActive && !hasShares && gameDef.parValues && gameDef.parValues.length > 0 && (
                  <Box mt="4">
                    <Text fontSize="sm" color="gray.400" mb="2">Select Initial Par Value</Text>
                    <Flex wrap="wrap" gap="2">
                      {gameDef.parValues.map(val => (
                        <Button
                          key={val}
                          size="md"
                          flex="1"
                          minW="60px"
                          color={activeCompanies[company.shortName] === val ? "white" : "whiteAlpha.800"}
                          _hover={{ bg: activeCompanies[company.shortName] === val ? undefined : 'whiteAlpha.200' }}
                          colorPalette={activeCompanies[company.shortName] === val ? "orange" : "gray"}
                          variant={activeCompanies[company.shortName] === val ? "solid" : "outline"}
                          onClick={() => updateParValue(company.shortName, val)}
                        >
                          {val}
                        </Button>
                      ))}
                    </Flex>
                  </Box>
                )}
              </Box>
            );
          })}
        </VStack>
      </Box>
    </Box>
  );
}
