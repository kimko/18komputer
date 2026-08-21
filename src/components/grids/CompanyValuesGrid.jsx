import { Fragment, useState } from 'react';
import { Box, Flex, Heading, Button, Grid, GridItem, Text } from '@chakra-ui/react';
import { getShareValue, getCompanyOrTotal, formatCurrency } from '../../utils/dashboardMath.js';
import { solveStartPrices, toStartFields } from '../../utils/startPrice.js';
import { marketFor } from '../../utils/roundReturn.js';
import CompanyBadge from '../ui/CompanyBadge.jsx';
import ModalBackdrop from '../ui/ModalBackdrop.jsx';

const BULK_ACTIONS = {
  populate: {
    button: 'Populate all ORs',
    palette: 'teal',
    heading: 'Fill every OR from the calculator?',
    body: ({ runCount, companyCount, maxOr }) =>
      `The last run calculated for ${runCount} of ${companyCount} companies is written into all `
      + `${maxOr} operating rounds, replacing anything already recorded. A company nobody has run `
      + 'is left as it is.',
    confirm: 'Populate'
  },
  startPrices: {
    button: 'Set SP start',
    palette: 'teal',
    heading: 'Work out every SP start?',
    body: ({ placed, companyCount, approximate }) =>
      `Replaying the recorded rounds backwards places ${placed} of ${companyCount} companies`
      + `${approximate ? `, ${approximate} of them on more than one square` : ''}. `
      + 'A company whose price no square explains is left as it is, and anything already set is '
      + 'overwritten.',
    confirm: 'Work them out'
  },
  ors: {
    button: 'Set all ORs to zero',
    palette: 'red',
    heading: 'Set every OR to zero?',
    body: () => 'Every operating round already recorded is replaced with zero.',
    confirm: 'Set all to zero'
  },
  prices: {
    button: 'Set all share prices to zero',
    palette: 'red',
    heading: 'Clear every share price?',
    body: () => 'Share prices and SP start are cleared for every company, back to par value.',
    confirm: 'Clear all prices'
  }
};

export default function CompanyValuesGrid({
  activeCompanies,
  maxOr,
  dashboardState,
  staticConfig,
  players = [],
  calculatorTotals = {},
  updateMaxOr,
  updateDashboardFields,
  setActivePopup,
  onCompanyClick
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [pendingBulk, setPendingBulk] = useState(null);

  if (activeCompanies.length === 0) return null;

  // A run of nothing is what an untouched calculator looks like, so it counts as no run at all.
  const companiesWithRuns = activeCompanies.filter(c => Number(calculatorTotals[c.shortName]) > 0);

  // With no market to walk there is nothing to work backwards along, so the button is not offered.
  const hasMarket = Boolean(marketFor(staticConfig));
  const solved = hasMarket
    ? solveStartPrices({ dashboardState, staticConfig, maxOr, players, activeCompanies })
    : [];

  const zeroAllOrs = () => {
    const zeroed = Object.fromEntries(Array.from({ length: maxOr }, (_, i) => [`or${i + 1}`, 0]));
    updateDashboardFields({
      ors: () => Object.fromEntries(activeCompanies.map(c => [c.shortName, { ...zeroed }]))
    });
  };

  const populateAllOrs = () => updateDashboardFields({
    ors: (current = {}) => companiesWithRuns.reduce((next, c) => {
      const total = Number(calculatorTotals[c.shortName]);
      const filled = Object.fromEntries(Array.from({ length: maxOr }, (_, i) => [`or${i + 1}`, total]));
      return { ...next, [c.shortName]: filled };
    }, { ...current })
  });

  const setAllStartPrices = () => updateDashboardFields(toStartFields(solved, dashboardState));

  const clearAllPrices = () => updateDashboardFields({
    shareValues: {}, sharePositions: {}, startValues: {}, startPositions: {}
  });

  const BULK_APPLY = {
    populate: populateAllOrs,
    startPrices: setAllStartPrices,
    ors: zeroAllOrs,
    prices: clearAllPrices
  };

  const applyBulk = () => {
    BULK_APPLY[pendingBulk]?.();
    setPendingBulk(null);
  };

  const bulkContext = {
    runCount: companiesWithRuns.length,
    companyCount: activeCompanies.length,
    placed: solved.filter(s => s.found).length,
    approximate: solved.filter(s => s.approximate).length,
    maxOr
  };

  const bulkActions = Object.entries(BULK_ACTIONS)
    .filter(([key]) => key !== 'startPrices' || hasMarket);

  return (
    <Box mb="8">
      <Flex justify="center" align="center" gap="4" mb="4" wrap="wrap">
        <Heading as="h2" size="lg" color="teal.400" textAlign="center">Company Values & Results</Heading>
        <Flex gap="1">
          <Button size="xs" variant="outline" color="white" borderColor="gray.600" onClick={() => updateMaxOr(maxOr - 1)} disabled={maxOr <= 1}>- OR</Button>
          <Button size="xs" variant="outline" color="white" borderColor="gray.600" onClick={() => updateMaxOr(maxOr + 1)}>+ OR</Button>
          <Button data-testid="company-details-toggle" size="xs" variant="outline" color="white" borderColor="gray.600" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Hide Details' : 'Details'}
          </Button>
        </Flex>
      </Flex>

      {showDetails && (
        <Flex justify="center" gap="2" mb="4" wrap="wrap">
          {bulkActions.map(([key, action]) => (
            <Button
              key={key}
              size="xs"
              variant="outline"
              colorPalette={action.palette}
              onClick={() => setPendingBulk(key)}
              disabled={key === 'populate' && companiesWithRuns.length === 0}
            >
              {action.button}
            </Button>
          ))}
        </Flex>
      )}

      <Box overflowX="auto" mb="8">
        <Grid templateColumns={`80px 100px ${showDetails ? '100px ' : ''}80px repeat(${maxOr}, 80px)`} gap="2" alignItems="center" w="max-content" mx="auto">
          <GridItem></GridItem>
          <GridItem textAlign="center"><Text fontWeight="bold" color="white">Share Price</Text></GridItem>
          {showDetails && <GridItem textAlign="center"><Text fontWeight="bold" color="white">SP start</Text></GridItem>}
          <GridItem textAlign="center"><Text fontWeight="bold" color="cyan.300">OR Total</Text></GridItem>
          {Array.from({ length: maxOr }).map((_, i) => (
            <GridItem key={i} textAlign="center"><Text fontWeight="bold" color="white">OR {i + 1}</Text></GridItem>
          ))}

          {activeCompanies.map(c => {
            const companyOrTotal = getCompanyOrTotal(dashboardState, maxOr, c.shortName);
            return (
            <Fragment key={c.shortName}>
              <GridItem>
                <CompanyBadge company={c} onClick={() => onCompanyClick?.(c)} cursor="pointer" />
              </GridItem>
              <GridItem>
                <Button data-testid="share-price-btn" w="100%" bg="gray.800" _hover={{ bg: 'gray.700' }} color="white" onClick={() => setActivePopup({ type: 'shareValue', companyId: c.shortName })}>
                  {formatCurrency(getShareValue(dashboardState, activeCompanies, c.shortName))}
                </Button>
              </GridItem>
              {showDetails && (
                <GridItem>
                  <Button data-testid="sp-start-btn" w="100%" bg="gray.800" _hover={{ bg: 'gray.700' }} color="white" onClick={() => setActivePopup({ type: 'startValue', companyId: c.shortName })}>
                    {formatCurrency(dashboardState.startValues?.[c.shortName])}
                  </Button>
                </GridItem>
              )}
              <GridItem>
                <Box w="100%" bg="gray.900" color="cyan.300" textAlign="center" py="2" borderRadius="md" fontWeight="bold">
                  {companyOrTotal > 0 ? formatCurrency(companyOrTotal) : ''}
                </Box>
              </GridItem>
              {Array.from({ length: maxOr }).map((_, i) => {
                const val = dashboardState.ors[c.shortName]?.[`or${i + 1}`];
                return (
                  <GridItem key={i}>
                    <Button data-testid="or-btn" w="100%" bg="gray.800" _hover={{ bg: 'gray.700' }} color="white" onClick={() => setActivePopup({ type: 'or', companyId: c.shortName, orIndex: i + 1 })}>
                      {val !== undefined && val !== '' ? formatCurrency(val) : ''}
                    </Button>
                  </GridItem>
                );
              })}
            </Fragment>
          )})}
        </Grid>
      </Box>

      {pendingBulk && (
        <ModalBackdrop
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-action-title"
          onClose={() => setPendingBulk(null)}
          textAlign="center"
        >
          <Heading id="bulk-action-title" size="md" mb="2" color={`${BULK_ACTIONS[pendingBulk].palette}.400`}>
            {BULK_ACTIONS[pendingBulk].heading}
          </Heading>
          <Text color="gray.300" mb="2" fontSize="sm">{BULK_ACTIONS[pendingBulk].body(bulkContext)}</Text>
          <Text color="gray.500" mb="6" fontSize="xs">This action cannot be undone.</Text>
          <Flex gap="4">
            <Button flex="1" variant="outline" color="white" onClick={() => setPendingBulk(null)}>Cancel</Button>
            <Button flex="1" colorPalette={BULK_ACTIONS[pendingBulk].palette} onClick={applyBulk}>
              {BULK_ACTIONS[pendingBulk].confirm}
            </Button>
          </Flex>
        </ModalBackdrop>
      )}
    </Box>
  );
}
