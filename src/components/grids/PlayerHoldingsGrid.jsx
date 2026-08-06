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

function PlayerGridRow({ label, players, getValue, valueProps = {}, endNode = null }) {
  return (
    <>
      <GridItem><Text color="gray.400" fontSize="sm">{label}</Text></GridItem>
      {players.map(p => (
        <GridItem key={`${label}-${p}`} textAlign="center">
          <Text {...valueProps}>{getValue(p)}</Text>
        </GridItem>
      ))}
      <GridItem textAlign="center">{endNode}</GridItem>
    </>
  );
}

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
      netWorths: {},
      playerShareValues: {},
      playerOpIncomes: {},
      stockWeights: {},
      diffPcts: {}
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
      
      data.playerShareValues[p] = {};
      data.playerOpIncomes[p] = {};
      activeCompanies.forEach(c => {
        const sharePct = Number(dashboardState.playerAssets[p]?.shares?.[c.shortName] || 0);
        const totalShares = c.totalShares || 10;
        data.playerShareValues[p][c.shortName] = totalShares > 0 ? (sharePct / (100 / totalShares)) * data.shareValues[c.shortName] : 0;
        data.playerOpIncomes[p][c.shortName] = totalShares > 0 ? (sharePct / 100) * data.opIncomes[c.shortName] : 0;
      });
    });
    
    data.grandTotalCash = grandTotalCash;
    data.totalBankFundsUsed = grandTotalCash + grandTotalOpIncome;
    data.maxNetWorth = players.length > 0 ? Math.max(...players.map(p => data.netWorths[p])) : 0;
    data.totalNetWorth = players.length > 0 ? players.reduce((sum, p) => sum + data.netWorths[p], 0) : 0;

    players.forEach(p => {
      // Stock Weight
      const equity = data.netWorths[p] > 0 ? (data.totalShareValues[p] / data.netWorths[p]) * 100 : 0;
      data.stockWeights[p] = Math.round(equity) + '%';
      
      // Diff %
      if (data.maxNetWorth === 0) {
        data.diffPcts[p] = '0%';
      } else {
        const myRawPct = (data.netWorths[p] / data.maxNetWorth) * 100;
        const myRounded = Math.round(myRawPct);
        const hasCollision = players.some(other => {
          if (other === p) return false;
          const otherRaw = (data.netWorths[other] / data.maxNetWorth) * 100;
          return Math.round(otherRaw) === myRounded && data.netWorths[other] !== data.netWorths[p];
        });
        data.diffPcts[p] = (hasCollision ? myRawPct.toFixed(1) : myRounded) + '%';
      }
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
                    <PlayerGridRow 
                      label="↳ Share Value" 
                      labelProps={{ color: "gray.500", fontSize: "xs", pl: "2" }} 
                      players={players} 
                      getValue={(p) => formatCurrency(gridData.playerShareValues[p]?.[c.shortName] || 0)}
                      valueProps={{ color: "gray.400", fontSize: "sm" }} 
                    />
                    <PlayerGridRow 
                      label="↳ Op Income" 
                      labelProps={{ color: "gray.500", fontSize: "xs", pl: "2" }} 
                      players={players} 
                      getValue={(p) => formatCurrency(gridData.playerOpIncomes[p]?.[c.shortName] || 0)}
                      valueProps={{ color: "cyan.600", fontSize: "sm" }} 
                    />
                  </>
                )}
              </Fragment>
            ))}

            <PlayerGridRow
              label="Total Shares"
              players={players}
              getValue={(p) => gridData.totalShares[p]}
              valueProps={{ fontWeight: "bold", color: "purple.300" }}
            />
            
            <PlayerGridRow
              label="Share Value"
              players={players}
              getValue={(p) => formatCurrency(gridData.totalShareValues[p])}
              valueProps={{ fontWeight: "bold", color: "white" }}
            />

            <PlayerGridRow
              label="Operating Income"
              players={players}
              getValue={(p) => formatCurrency(gridData.totalOpIncomes[p])}
              valueProps={{ fontWeight: "bold", color: "cyan.300" }}
              endNode={
                <Text fontWeight="bold" color="gray.400" fontSize="sm" title="Total OR Payout">
                  {formatCurrency(gridData.grandTotalOpIncome)}
                </Text>
              }
            />

            <PlayerGridRow
              label="Net Worth"
              players={players}
              getValue={(p) => formatCurrency(gridData.netWorths[p])}
              valueProps={{ fontWeight: "bold", color: "green.300" }}
            />

            <PlayerGridRow
              label="Stock Weight"
              players={players}
              getValue={(p) => gridData.stockWeights[p]}
              valueProps={{ fontWeight: "bold", color: "cyan.200" }}
            />

            <PlayerGridRow
              label="Diff %"
              players={players}
              getValue={(p) => gridData.diffPcts[p]}
              valueProps={{ fontWeight: "bold", color: "yellow.300" }}
            />

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
