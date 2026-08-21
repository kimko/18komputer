import { useState, useEffect } from 'react';
import { Box, Button, VStack, Text, Center, Flex, Spinner } from '@chakra-ui/react';

import { useRoute } from 'wouter';
import { useGameData } from '../hooks/useGameData.js';
import TrainCard from './calculator/TrainCard.jsx';
import GrandTotalCard from './calculator/GrandTotalCard.jsx';
import ReceiptPrinter from './calculator/ReceiptPrinter.jsx';
import { getContrastColor } from '../utils/colorUtils.js';
import { getStructures, canUseStructure, DEFAULT_TOTAL_SHARES } from '../utils/corporateStructures.js';
import { getCompanyHoldings } from '../utils/dashboardMath.js';
import { allowsHalfPay } from '../utils/payoutMath.js';
import { toBonusEntry, trainsRevenue } from '../utils/trainMath.js';
import { toReceiptTrain } from '../services/printer/receiptLayout.js';

function withStopAdded(stops, val, slotIndex) {
  if (slotIndex === null || slotIndex > stops.length) return [...stops, val];
  return [...stops.slice(0, slotIndex), val, ...stops.slice(slotIndex)];
}

export default function RevenueCalculator() {
  const [match, params] = useRoute('/game/:id/calculator');
  const { loading, gameInstance, updateGameStateDebounced } = useGameData(params?.id);

  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  // Screen only: it is not part of the route, so it stays out of the saved game and the receipt.
  const [pendingSlot, setPendingSlot] = useState(null);

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
  // A game imported or started before the rule was known can carry the flag anyway, so it is
  // read through the title's rules rather than trusted on its own.
  const canHalfPay = allowsHalfPay(gameInstance.staticConfig);
  const isHalfPay = canHalfPay && Boolean(currentCompanyState.isHalfPay);

  const selectedCompany = activeCompanies.find(c => c.shortName === selectedCompanyId);
  const totalShares = selectedCompany?.totalShares || DEFAULT_TOTAL_SHARES;
  const holdings = getCompanyHoldings(gameInstance.state?.dashboardState?.playerAssets, gameInstance.players, selectedCompanyId);
  const structures = getStructures(gameInstance.staticConfig)
    .map(s => ({ ...s, disabled: s.totalShares !== totalShares && !canUseStructure(s, holdings) }));

  const updateCompanyState = (updates) => {
    if (!selectedCompanyId) return;
    const nextCompanyStates = {
      ...calculatorState,
      [selectedCompanyId]: { ...currentCompanyState, ...updates }
    };
    updateGameStateDebounced({ calculatorState: nextCompanyStates });
  };

  const mapTrain = (id, fn) => updateCompanyState({ trains: trains.map(t => t.id === id ? fn(t) : t) });

  const handleClear = (id) => {
    setPendingSlot(null);
    mapTrain(id, t => ({ ...t, stops: [], bonusStops: [] }));
  };

  const handleCopy = (tCopy) => {
    setPendingSlot(null);
    updateCompanyState({
      trains: [...trains, { id: Date.now() + Math.random(), stops: [...tCopy.stops], bonusStops: [...(tCopy.bonusStops || [])] }]
    });
  };

  const handleToggleExclude = (id) => {
    setPendingSlot(null);
    mapTrain(id, t => ({ ...t, isExcluded: !t.isExcluded }));
  };

  const handleRemoveTrain = (id) => {
    setPendingSlot(null);
    updateCompanyState({ trains: trains.filter(t => t.id !== id) });
  };

  const handleRemoveStop = (id, idxToRemove) => {
    setPendingSlot({ trainId: id, index: idxToRemove });
    mapTrain(id, t => ({ ...t, stops: t.stops.filter((_, idx) => idx !== idxToRemove) }));
  };

  const handleRemoveBonusStop = (id, idxToRemove) => {
    setPendingSlot(null);
    mapTrain(id, t => ({ ...t, bonusStops: t.bonusStops.filter((_, idx) => idx !== idxToRemove) }));
  };

  const handleAddStop = (id, val) => {
    const slotIndex = pendingSlot?.trainId === id ? pendingSlot.index : null;
    setPendingSlot(null);
    mapTrain(id, t => ({ ...t, stops: withStopAdded(t.stops, val, slotIndex) }));
  };

  const handleAddBonusStop = (id, bonus, val) => {
    setPendingSlot(null);
    mapTrain(id, t => ({ ...t, bonusStops: [...(t.bonusStops || []), toBonusEntry(bonus, val)] }));
  };

  const setTotalShares = (val) => {
    if (!selectedCompanyId) return;
    updateGameStateDebounced({
      activeCompanies: activeCompanies.map(c => c.shortName === selectedCompanyId ? { ...c, totalShares: val } : c)
    });
  };

  let allBonuses = [];
  if (gameInstance.staticConfig?.hasPullmans) {
    allBonuses.push({ label: 'Pullman', adds: [10, 20, 30] });
  }
  if (gameInstance.staticConfig?.revenueBonuses) {
    allBonuses = [...allBonuses, ...gameInstance.staticConfig.revenueBonuses];
  }
  
  const grandTotal = trainsRevenue(trains);

  const receiptTrains = trains.filter(t => !t.isExcluded).map(toReceiptTrain);

  return (
    <Box p="4">
      <Box maxW="2xl" mx="auto">
        {selectedCompany && (
          <Center mb="4">
            <Box
              data-testid="selected-company-name"
              bg="gray.700"
              color="white"
              px="4"
              py="2"
              borderRadius="md"
              boxShadow="lg"
              fontWeight="bold"
              textAlign="center"
            >
              {selectedCompany.name || selectedCompany.shortName}
            </Box>
          </Center>
        )}

        <Box mb="6">
          {activeCompanies.length === 0 ? (
            <Text color="red.400">No active companies. Go to Manage Companies first.</Text>
          ) : (
            <Flex wrap="wrap" gap="3">
              {activeCompanies.map(c => {
                const isSelected = selectedCompanyId === c.shortName;
                return (
                  <Button
                    key={c.shortName}
                    bg={c.color || 'gray.700'}
                    color={getContrastColor(c.color || '#2d3748')}
                    borderRadius="md"
                    fontWeight="bold"
                    outline={isSelected ? '2px solid' : 'none'}
                    outlineColor="white"
                    outlineOffset="2px"
                    _hover={{ outline: '2px solid', outlineColor: 'whiteAlpha.500', outlineOffset: '2px' }}
                    onClick={() => { setPendingSlot(null); setSelectedCompanyId(c.shortName); }}
                  >
                    {c.shortName}
                  </Button>
                );
              })}
            </Flex>
          )}
        </Box>

        <VStack gap="5" align="stretch" mb="4">
          {trains.map((train, i) => (
            <TrainCard
              key={train.id}
              train={train}
              index={i}
              totalTrains={trains.length}
              allBonuses={allBonuses}
              pendingIndex={pendingSlot?.trainId === train.id ? pendingSlot.index : null}
              onCancelPending={() => setPendingSlot(null)}
              onClear={handleClear}
              onCopy={handleCopy}
              onToggleExclude={handleToggleExclude}
              onRemove={handleRemoveTrain}
              onRemoveStop={handleRemoveStop}
              onRemoveBonusStop={handleRemoveBonusStop}
              onAddStop={handleAddStop}
              onAddBonusStop={handleAddBonusStop}
            />
          ))}
        </VStack>

        <GrandTotalCard
          grandTotal={grandTotal}
          isHalfPay={isHalfPay}
          canHalfPay={canHalfPay}
          onSetHalfPay={(val) => updateCompanyState({ isHalfPay: val })}
          totalShares={totalShares}
          onSetTotalShares={setTotalShares}
          structures={structures}
        />

        <ReceiptPrinter
          company={selectedCompanyId}
          companyName={selectedCompany?.name}
          trains={receiptTrains}
          totalRevenue={grandTotal}
          totalShares={totalShares}
          isHalfPay={isHalfPay}
        />
      </Box>
    </Box>
  );
}
