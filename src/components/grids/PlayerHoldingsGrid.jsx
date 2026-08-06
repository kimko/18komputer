import { Fragment, useMemo, useState } from 'react';
import { Box, Flex, Heading, Button, Grid, GridItem, Text, IconButton, Input } from '@chakra-ui/react';
import { 
  getBankShares, 
  getPlayerShareValue, 
  getPlayerOperatingIncome, 
  getPlayerTotalShares, 
  getPlayerNetWorth,
  getShareValue,
  getCompanyOrTotal,
  formatCurrency
} from '../../utils/dashboardMath.js';
import CompanyBadge from '../ui/CompanyBadge.jsx';
import { saveUsers } from '../../api/mockApi.js';

export default function PlayerHoldingsGrid({
  players,
  activeCompanies,
  maxOr,
  dashboardState,
  updatePlayers,
  setActivePopup
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleAddPlayer = (e) => {
    e.preventDefault();
    const name = newPlayerName.trim();
    if (name && !players.includes(name)) {
      updatePlayers([...players, name]);
      saveUsers([name]);
      setNewPlayerName('');
    }
  };

  const handleRemovePlayer = (playerToRemove) => {
    updatePlayers(players.filter(p => p !== playerToRemove));
  };


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

    let grandTotalOpIncome = 0;
    activeCompanies.forEach(c => {
      data.bankShares[c.shortName] = getBankShares(dashboardState, players, c.shortName);
      data.shareValues[c.shortName] = getShareValue(dashboardState, activeCompanies, c.shortName);
      data.opIncomes[c.shortName] = getCompanyOrTotal(dashboardState, maxOr, c.shortName);
      grandTotalOpIncome += data.opIncomes[c.shortName];
    });
    data.grandTotalOpIncome = grandTotalOpIncome;

    let grandTotalCash = 0;
    players.forEach(p => {
      grandTotalCash += Number(dashboardState.playerAssets[p]?.cash || 0);
      data.totalShares[p] = getPlayerTotalShares(dashboardState, activeCompanies, p);
      data.totalShareValues[p] = getPlayerShareValue(dashboardState, activeCompanies, p);
      data.totalOpIncomes[p] = getPlayerOperatingIncome(dashboardState, activeCompanies, maxOr, p);
      data.netWorths[p] = getPlayerNetWorth(dashboardState, activeCompanies, maxOr, p);
    });
    data.grandTotalCash = grandTotalCash;
    data.totalBankFundsUsed = grandTotalCash + grandTotalOpIncome;

    data.maxNetWorth = players.length > 0 ? Math.max(...players.map(p => data.netWorths[p])) : 0;
    data.totalNetWorth = players.length > 0 ? players.reduce((sum, p) => sum + data.netWorths[p], 0) : 0;

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
        <Box overflowX="auto" py="2" px="1">
          <Grid templateColumns={`100px repeat(${players.length}, 100px) 100px`} gap="2" alignItems="center" w="max-content" mx="auto" position="relative">
            {players.length > 0 && gridData.maxNetWorth > 0 && players.map((p, winningIndex) => {
              if (gridData.netWorths[p] !== gridData.maxNetWorth) return null;
              return (
                <Box
                  key={`winner-${p}`}
                  position="absolute"
                  top="-2"
                  bottom="-2"
                  left={`calc(100px + 0.5rem + ${winningIndex} * (100px + 0.5rem))`}
                  width="100px"
                  border="2px solid"
                  borderColor="red.500"
                  borderRadius="md"
                  pointerEvents="none"
                  zIndex={1}
                />
              );
            })}
            <GridItem></GridItem>
            {players.map(p => (
              <GridItem key={p} textAlign="center">
                <Flex align="center" justify="center" gap="1">
                  <Text fontWeight="bold" color="white" isTruncated maxWidth="70px">{p}</Text>
                  <IconButton size="2xs" variant="ghost" colorPalette="red" aria-label="Remove" onClick={() => handleRemovePlayer(p)}>✕</IconButton>
                </Flex>
              </GridItem>
            ))}
            <GridItem textAlign="center"><Text fontWeight="bold" color="gray.400">Bank</Text></GridItem>

            <GridItem><Text color="gray.400" fontSize="sm">Cash</Text></GridItem>
            {players.map(p => (
              <GridItem key={p}>
                <Button data-testid="cash-btn" w="100%" bg="gray.800" _hover={{ bg: 'gray.700' }} color="white" onClick={() => setActivePopup({ type: 'cash', player: p })}>
                  {dashboardState.playerAssets[p]?.cash !== undefined && dashboardState.playerAssets[p]?.cash !== '' ? formatCurrency(dashboardState.playerAssets[p]?.cash) : ''}
                </Button>
              </GridItem>
            ))}
            <GridItem textAlign="center">
              <Text fontWeight="bold" color="gray.400" fontSize="sm" title="Total Cash">
                {formatCurrency(gridData.grandTotalCash)}
              </Text>
            </GridItem>

            {activeCompanies.map(c => (
              <Fragment key={c.shortName}>
                <GridItem>
                  <CompanyBadge company={c} />
                </GridItem>
                {players.map(p => {
                  const shares = dashboardState.playerAssets[p]?.shares?.[c.shortName];
                  return (
                    <GridItem key={p}>
                      <Button data-testid="share-btn" w="100%" bg="gray.800" _hover={{ bg: 'gray.700' }} color="white" onClick={() => setActivePopup({ type: 'shares', player: p, companyId: c.shortName })}>
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
                          <Text color="gray.400" fontSize="sm">{formatCurrency(sv)}</Text>
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
                          <Text color="cyan.600" fontSize="sm">{formatCurrency(income)}</Text>
                        </GridItem>
                      );
                    })}
                    <GridItem></GridItem>
                  </>
                )}
              </Fragment>
            ))}

            <GridItem><Text color="gray.400" fontSize="sm">Total Shares</Text></GridItem>
            {players.map(p => <GridItem key={`ts-${p}`} textAlign="center">
                    <Text fontWeight="bold" color="purple.300">{gridData.totalShares[p]}</Text>
                  </GridItem>
            )}
            <GridItem></GridItem>

            <GridItem><Text color="gray.400" fontSize="sm">Share Value</Text></GridItem>
            {players.map(p => (
              <GridItem key={p} textAlign="center">
                <Text fontWeight="bold" color="white">{formatCurrency(gridData.totalShareValues[p])}</Text>
              </GridItem>
            ))}
            <GridItem></GridItem>

            <GridItem><Text color="gray.400" fontSize="sm">Operating Income</Text></GridItem>
            {players.map(p => <GridItem key={`to-${p}`} textAlign="center">
                    <Text fontWeight="bold" color="cyan.300">{formatCurrency(gridData.totalOpIncomes[p])}</Text>
                  </GridItem>
            )}
            <GridItem textAlign="center">
              <Text fontWeight="bold" color="gray.400" fontSize="sm" title="Total OR Payout">
                {formatCurrency(gridData.grandTotalOpIncome)}
              </Text>
            </GridItem>

            <GridItem><Text color="gray.400" fontSize="sm">Net Worth</Text></GridItem>
            {players.map(p => <GridItem key={`nw-${p}`} textAlign="center">
                    <Text fontWeight="bold" color="green.300">{formatCurrency(gridData.netWorths[p])}</Text>
                  </GridItem>
            )}
            <GridItem></GridItem>

            <GridItem><Text color="gray.400" fontSize="sm">Stock Weight</Text></GridItem>
            {players.map(p => {
              const equity = gridData.netWorths[p] > 0 ? (gridData.totalShareValues[p] / gridData.netWorths[p]) * 100 : 0;
              return (
                <GridItem key={`eq-${p}`} textAlign="center">
                  <Text fontWeight="bold" color="cyan.200">{Math.round(equity)}%</Text>
                </GridItem>
              );
            })}
            <GridItem></GridItem>

            <GridItem><Text color="gray.400" fontSize="sm">Diff %</Text></GridItem>
            {players.map(p => {
              if (gridData.maxNetWorth === 0) {
                return <GridItem key={`diff-${p}`} textAlign="center"><Text fontWeight="bold" color="yellow.300">0%</Text></GridItem>;
              }
              const myNetWorth = gridData.netWorths[p];
              const myRawPct = (myNetWorth / gridData.maxNetWorth) * 100;
              const myRounded = Math.round(myRawPct);
              
              // Check if anyone else rounds to the same number but has a different net worth
              const hasCollision = players.some(other => {
                if (other === p) return false;
                const otherRaw = (gridData.netWorths[other] / gridData.maxNetWorth) * 100;
                return Math.round(otherRaw) === myRounded && gridData.netWorths[other] !== myNetWorth;
              });
              
              const displayPct = hasCollision ? myRawPct.toFixed(1) : myRounded;
              
              return (
                <GridItem key={`diff-${p}`} textAlign="center">
                  <Text fontWeight="bold" color="yellow.300">{displayPct}%</Text>
                </GridItem>
              );
            })}
            <GridItem></GridItem>

            {showDetails && (
              <Fragment>
                <GridItem><Text color="gray.400" fontSize="sm">Total bank funds used</Text></GridItem>
                <GridItem colSpan={players.length}></GridItem>
                <GridItem textAlign="center">
                  <Text fontWeight="bold" color="red.300" fontSize="sm" title="Total Cash + Total OR Income">
                    {formatCurrency(gridData.totalBankFundsUsed)}
                  </Text>
                </GridItem>
              </Fragment>
            )}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
