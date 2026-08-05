import { useState, useReducer, useEffect } from 'react';
import { Box, Button, VStack, Text, Center, Flex, Spinner } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { useGameData } from '../hooks/useGameData.js';
import TrainCard from './calculator/TrainCard.jsx';
import GrandTotalCard from './calculator/GrandTotalCard.jsx';

export default function RevenueCalculator() {
  const [match, params] = useRoute('/game/:id/calculator');
  const { loading, gameInstance, updateGameStateDebounced } = useGameData(params?.id);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  // Auto-select first active company on load
  useEffect(() => {
    if (gameInstance?.state?.activeCompanies?.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(gameInstance.state.activeCompanies[0].shortName);
    }
  }, [gameInstance, selectedCompanyId]);

  if (!match) return null;
  if (loading) return <Center h="100vh" bg="gray.900"><Spinner color="orange.400" size="xl" /></Center>;
  if (!gameInstance) return <Center h="100vh" bg="gray.900" color="white">Error loading game data.</Center>;

  const activeCompanies = gameInstance.state?.activeCompanies || [];
  const calculatorState = gameInstance.state?.calculatorState || {};
  
  const currentCompanyState = calculatorState[selectedCompanyId] || { trains: [{ id: 1, stops: [], bonusStops: [] }], isHalfPay: false };
  const trains = currentCompanyState.trains || [{ id: 1, stops: [], bonusStops: [] }];
  const isHalfPay = currentCompanyState.isHalfPay || false;

  const updateCompanyState = (updates) => {
    if (!selectedCompanyId) return;
    const nextCompanyStates = {
      ...calculatorState,
      [selectedCompanyId]: { ...currentCompanyState, ...updates }
    };
    updateGameStateDebounced({ calculatorState: nextCompanyStates });
  };

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

  return (
    <Box p="4">
      <Box maxW="2xl" mx="auto">
        <Box mb="6">
          {activeCompanies.length === 0 ? (
            <Text color="red.400">No active companies. Go to Activate Company first.</Text>
          ) : (
            <Flex wrap="wrap" gap="2">
              {activeCompanies.map(c => (
                <Button
                  key={c.shortName}
                  bg={selectedCompanyId === c.shortName ? 'gray.700' : 'gray.800'}
                  _hover={{ bg: 'gray.700' }}
                  color="white"
                  borderWidth={selectedCompanyId === c.shortName ? "2px" : "1px"}
                  borderColor={selectedCompanyId === c.shortName ? (c.color || 'orange.400') : 'transparent'}
                  onClick={() => setSelectedCompanyId(c.shortName)}
                >
                  {c.shortName}
                </Button>
              ))}
            </Flex>
          )}
        </Box>

        <VStack gap="3" align="stretch" mb="4">
          {trains.map((train, i) => (
            <TrainCard
              key={train.id}
              train={train}
              index={i}
              totalTrains={trains.length}
              allBonuses={allBonuses}
              onClear={(id) => updateCompanyState({ trains: trains.map(t => t.id === id ? { ...t, stops: [], bonusStops: [] } : t) })}
              onCopy={(tCopy) => updateCompanyState({ trains: [...trains, { id: Date.now() + Math.random(), stops: [...tCopy.stops], bonusStops: [...tCopy.bonusStops] }] })}
              onToggleExclude={(id) => updateCompanyState({ trains: trains.map(t => t.id === id ? { ...t, isExcluded: !t.isExcluded } : t) })}
              onRemove={(id) => updateCompanyState({ trains: trains.filter(t => t.id !== id) })}
              onRemoveStop={(id, idxToRemove) => updateCompanyState({ trains: trains.map(t => t.id === id ? { ...t, stops: t.stops.filter((_, idx) => idx !== idxToRemove) } : t) })}
              onRemoveBonusStop={(id, idxToRemove) => updateCompanyState({ trains: trains.map(t => t.id === id ? { ...t, bonusStops: t.bonusStops.filter((_, idx) => idx !== idxToRemove) } : t) })}
              onAddStop={(id, val) => updateCompanyState({ trains: trains.map(t => t.id === id ? { ...t, stops: [...t.stops, val] } : t) })}
              onAddBonusStop={(id, val, label) => updateCompanyState({ trains: trains.map(t => t.id === id ? { ...t, bonusStops: [...(t.bonusStops || []), { val, label }] } : t) })}
            />
          ))}
        </VStack>

        <GrandTotalCard 
          grandTotal={grandTotal} 
          isHalfPay={isHalfPay} 
          onSetHalfPay={(val) => updateCompanyState({ isHalfPay: val })}
        />
      </Box>
    </Box>
  );
}
