import { Fragment, useMemo } from 'react';
import { Box, Flex, Heading, Button, Grid, GridItem, Text, IconButton, Input } from '@chakra-ui/react';
import { 
  getBankShares, 
  getPlayerShareValue, 
  getPlayerOperatingIncome, 
  getPlayerTotalShares, 
  getPlayerNetWorth,
  getShareValue,
  getCompanyOrTotal
} from '../../utils/dashboardMath.js';

export default function PlayerHoldingsGrid({
  players,
  activeCompanies,
  maxOr,
  dashboardState,
  showDetails,
  setShowDetails,
  newPlayerName,
  setNewPlayerName,
  handleAddPlayer,
  handleRemovePlayer,
  setActivePopup
}) {

  // Memoize all calculations
  const gridData = useMemo(() => {
    const data = {
      bankShares: {},
      shareValues: {},
      opIncomes: {},
      totalShares: {},
      totalShareValues: {},
      totalOpIncomes: {},
      netWorths: {}
    };

    activeCompanies.forEach(c => {
      data.bankShares[c.shortName] = getBankShares(dashboardState, players, c.shortName);
      data.shareValues[c.shortName] = getShareValue(dashboardState, activeCompanies, c.shortName);
      data.opIncomes[c.shortName] = getCompanyOrTotal(dashboardState, maxOr, c.shortName);
    });

    players.forEach(p => {
      data.totalShares[p] = getPlayerTotalShares(dashboardState, activeCompanies, p);
      data.totalShareValues[p] = getPlayerShareValue(dashboardState, activeCompanies, p);
      data.totalOpIncomes[p] = getPlayerOperatingIncome(dashboardState, activeCompanies, maxOr, p);
      data.netWorths[p] = getPlayerNetWorth(dashboardState, activeCompanies, maxOr, p);
    });

    return data;
  }, [players, activeCompanies, maxOr, dashboardState]);

  return (
    <Box>
      <Flex justify="center" align="center" mb="4" wrap="wrap" gap="8">
        <Flex gap="4" align="center">
          <Heading as="h3" size="lg" color="teal.400">Player Holdings</Heading>
          <Button size="xs" variant="outline" color="white" borderColor="gray.600" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? "Hide Details" : "Details"}
          </Button>
        </Flex>
        <form onSubmit={handleAddPlayer}>
          <Flex gap="2">
            <Input size="sm" w="120px" placeholder="New player..." value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} bg="gray.700" border="none" color="white"/>
            <Button size="sm" type="submit" colorPalette="teal">Add</Button>
          </Flex>
        </form>
      </Flex>
      
      {players.length > 0 && (
        <Box overflowX="auto">
          <Grid templateColumns={`100px repeat(${players.length}, 100px) 100px`} gap="2" alignItems="center" w="max-content" mx="auto">
            <GridItem></GridItem>
            {players.map(p => (
              <GridItem key={p} textAlign="center">
                <Flex align="center" justify="center" gap="1">
                  <Text fontWeight="bold" color="white" isTruncated>{p}</Text>
                  <IconButton size="2xs" variant="ghost" colorPalette="red" aria-label="Remove" onClick={() => handleRemovePlayer(p)}>✕</IconButton>
                </Flex>
              </GridItem>
            ))}
            <GridItem textAlign="center"><Text fontWeight="bold" color="gray.400">Bank</Text></GridItem>

            <GridItem><Text color="gray.400" fontSize="sm">Cash</Text></GridItem>
            {players.map(p => (
              <GridItem key={p}>
                <Button w="100%" bg="gray.800" _hover={{ bg: 'gray.700' }} color="white" onClick={() => setActivePopup({ type: 'cash', player: p })}>
                  {dashboardState.playerAssets[p]?.cash !== undefined && dashboardState.playerAssets[p]?.cash !== '' ? dashboardState.playerAssets[p]?.cash : ''}
                </Button>
              </GridItem>
            ))}
            <GridItem></GridItem>

            {activeCompanies.map(c => (
              <Fragment key={c.shortName}>
                <GridItem><Text color={c.color || "white"} fontSize="sm" fontWeight="bold">{c.shortName}</Text></GridItem>
                {players.map(p => {
                  const shares = dashboardState.playerAssets[p]?.shares?.[c.shortName];
                  return (
                    <GridItem key={p}>
                      <Button w="100%" bg="gray.800" _hover={{ bg: 'gray.700' }} color="white" onClick={() => setActivePopup({ type: 'shares', player: p, companyId: c.shortName })}>
                        {shares !== undefined && shares !== '' ? `${shares}%` : ''}
                      </Button>
                    </GridItem>
                  );
                })}
                <GridItem textAlign="center">
                  <Text color="gray.400" fontWeight="bold">{gridData.bankShares[c.shortName]}%</Text>
                </GridItem>

                {showDetails && (
                  <>
                    <GridItem><Text color="gray.500" fontSize="xs" pl="2">↳ Share Value</Text></GridItem>
                    {players.map(p => {
                      const sharePct = Number(dashboardState.playerAssets[p]?.shares?.[c.shortName] || 0);
                      const totalShares = c.totalShares || 10;
                      const sv = totalShares > 0 ? (sharePct / (100 / totalShares)) * gridData.shareValues[c.shortName] : 0;
                      return (
                        <GridItem key={`sv-${p}`} textAlign="center">
                          <Text color="gray.400" fontSize="sm">${sv}</Text>
                        </GridItem>
                      );
                    })}
                    <GridItem></GridItem>

                    <GridItem><Text color="gray.500" fontSize="xs" pl="2">↳ Op Income</Text></GridItem>
                    {players.map(p => {
                      const sharePct = Number(dashboardState.playerAssets[p]?.shares?.[c.shortName] || 0);
                      const totalShares = c.totalShares || 10;
                      const income = totalShares > 0 ? (sharePct / 100) * gridData.opIncomes[c.shortName] : 0;
                      return (
                        <GridItem key={`inc-${p}`} textAlign="center">
                          <Text color="cyan.600" fontSize="sm">${income}</Text>
                        </GridItem>
                      );
                    })}
                    <GridItem></GridItem>
                  </>
                )}
              </Fragment>
            ))}

            <GridItem><Text color="gray.400" fontSize="sm">Total Shares</Text></GridItem>
            {players.map(p => (
              <GridItem key={`ts-${p}`} textAlign="center">
                <Text fontWeight="bold" color="purple.300">{gridData.totalShares[p]}</Text>
              </GridItem>
            ))}
            <GridItem></GridItem>

            <GridItem><Text color="gray.400" fontSize="sm">Share Value</Text></GridItem>
            {players.map(p => (
              <GridItem key={p} textAlign="center">
                <Text fontWeight="bold" color="white">${gridData.totalShareValues[p]}</Text>
              </GridItem>
            ))}
            <GridItem></GridItem>

            <GridItem><Text color="gray.400" fontSize="sm">Operating Income</Text></GridItem>
            {players.map(p => (
              <GridItem key={p} textAlign="center">
                <Text fontWeight="bold" color="cyan.300">${gridData.totalOpIncomes[p]}</Text>
              </GridItem>
            ))}
            <GridItem></GridItem>

            <GridItem><Text color="gray.400" fontSize="sm">Net Worth</Text></GridItem>
            {players.map(p => (
              <GridItem key={p} textAlign="center">
                <Text fontWeight="bold" color="green.300">${gridData.netWorths[p]}</Text>
              </GridItem>
            ))}
            <GridItem></GridItem>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
