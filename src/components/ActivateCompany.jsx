import { useState, useEffect } from 'react';
import { Box, Button, VStack, Heading, Text, Center, Flex, Spinner, Input } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { useGameData } from '../hooks/useGameData.js';
import { getContrastColor } from '../utils/colorUtils.js';
import { getStructures, hasStructureChoice, canUseStructure, DEFAULT_TOTAL_SHARES } from '../utils/corporateStructures.js';
import { getCompanyHoldings } from '../utils/dashboardMath.js';

export default function ActivateCompany() {
  const [match, params] = useRoute('/game/:id/setup');
  const { loading, gameInstance, updateGameStateDebounced } = useGameData(params?.id);
  const [activeCompanies, setActiveCompanies] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (gameInstance?.state?.activeCompanies) {
      const map = {};
      gameInstance.state.activeCompanies.forEach(c => {
        map[c.shortName] = {
          parValue: c.parValue,
          totalShares: c.totalShares || DEFAULT_TOTAL_SHARES
        };
      });
      setActiveCompanies(map);
    }
  }, [gameInstance]);

  if (!match) return null;
  if (loading) return <Center h="100vh" bg="gray.900"><Spinner color="orange.400" size="xl" /></Center>;
  if (!gameInstance || !gameInstance.staticConfig) return <Center h="100vh" bg="gray.900" color="white">Error loading game data.</Center>;

  const gameDef = gameInstance.staticConfig;
  const structures = getStructures(gameDef);
  const showStructures = hasStructureChoice(gameDef);

  const saveState = (newState) => {
    const finalCompanies = gameDef.companies
      .filter(c => newState[c.shortName] !== undefined)
      .map(c => ({
        ...c,
        parValue: newState[c.shortName].parValue,
        totalShares: newState[c.shortName].totalShares
      }));

    updateGameStateDebounced({ activeCompanies: finalCompanies });
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
      next[shortName] = {
        parValue: gameDef.parValues[0] || 0,
        totalShares: DEFAULT_TOTAL_SHARES
      };
    }
    setActiveCompanies(next);
    saveState(next);
  };

  const updateCompany = (shortName, updates) => {
    const next = {
      ...activeCompanies,
      [shortName]: { ...activeCompanies[shortName], ...updates }
    };
    setActiveCompanies(next);
    saveState(next);
  };

  return (
    <Box minH="100vh" bg="gray.900" color="white" p="8">
      <Box maxW="2xl" mx="auto">
        <Heading as="h2" size="xl" color="orange.400" mb="6">
          Manage Companies
        </Heading>

        {gameDef.companies?.length > 6 && (
          <Box mb="6">
            <Input 
              placeholder="Search companies..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              bg="gray.800"
              border="1px solid"
              borderColor="whiteAlpha.300"
            />
          </Box>
        )}

        <VStack gap="4" align="stretch" mb="8">
          {gameDef.companies?.filter(c => {
            if (!searchQuery) return true;
            const term = searchQuery.toLowerCase();
            return c.name.toLowerCase().includes(term) || c.shortName.toLowerCase().includes(term);
          }).map(company => {
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
                    {isActive ? (hasShares ? 'Shares Held' : 'Deactivate') : 'Activate'}
                  </Button>
                </Flex>

                {isActive && showStructures && (
                  <Box mt="4">
                    <Text fontSize="sm" color="gray.400" mb="2">Select Co. Structure</Text>
                    <Flex wrap="wrap" gap="2">
                      {structures.map(structure => {
                        const isSelected = activeCompanies[company.shortName]?.totalShares === structure.totalShares;
                        const holdings = getCompanyHoldings(gameInstance?.state?.dashboardState?.playerAssets, company.shortName);
                        return (
                          <Button
                            key={structure.totalShares}
                            size="md"
                            flex="1"
                            minW="60px"
                            color={isSelected ? "white" : "whiteAlpha.800"}
                            _hover={{ bg: isSelected ? undefined : 'whiteAlpha.200' }}
                            colorPalette={isSelected ? "orange" : "gray"}
                            variant={isSelected ? "solid" : "outline"}
                            disabled={!isSelected && !canUseStructure(structure, holdings)}
                            onClick={() => updateCompany(company.shortName, { totalShares: structure.totalShares })}
                          >
                            {structure.name}
                          </Button>
                        );
                      })}
                    </Flex>
                  </Box>
                )}

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
                          color={activeCompanies[company.shortName]?.parValue === val ? "white" : "whiteAlpha.800"}
                          _hover={{ bg: activeCompanies[company.shortName]?.parValue === val ? undefined : 'whiteAlpha.200' }}
                          colorPalette={activeCompanies[company.shortName]?.parValue === val ? "orange" : "gray"}
                          variant={activeCompanies[company.shortName]?.parValue === val ? "solid" : "outline"}
                          onClick={() => updateCompany(company.shortName, { parValue: parseInt(val, 10) })}
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
