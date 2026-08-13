import { Fragment, useMemo, useState } from 'react';
import { Box, Flex, Grid, GridItem, SimpleGrid, Text } from '@chakra-ui/react';
import ChartCard from './ChartCard.jsx';
import ReturnBreakdownChart from './ReturnBreakdownChart.jsx';
import StackedTotalChart from './StackedTotalChart.jsx';
import ProjectionChart from './ProjectionChart.jsx';
import BoardTreemap from './BoardTreemap.jsx';
import WorthByCompanyChart from './WorthByCompanyChart.jsx';
import CompanyBadge from '../ui/CompanyBadge.jsx';
import { SERIES, INK, money, playerColor } from './chartTheme.js';
import { getCompanyReturns, getPlayerReturns, describeCompany, describePlayer } from '../../utils/roundReturn.js';
import { projectNetWorth } from '../../utils/gameProjection.js';
import { getBoardOwnership, getWorthByCompany } from '../../utils/boardState.js';

const RETURN_SERIES = [
  { key: 'income', label: 'Dividends', color: SERIES.income },
  { key: 'stock', label: 'Price', color: SERIES.stock }
];

// Cash was recorded before these rounds paid out, so the three add up rather than overlapping.
const WORTH_SERIES = [
  { key: 'cash', label: 'Cash', color: SERIES.cash },
  { key: 'dividends', label: 'Dividends', color: SERIES.income },
  { key: 'shares', label: 'Shares', color: SERIES.shares }
];

const CERTAINTY_NOTE = {
  approximate: { label: 'approximate', color: INK.warning },
  unexplained: { label: 'unexplained', color: INK.warning }
};

const Cell = ({ children, bold, color = 'gray.200', ...props }) => (
  <GridItem py="2" {...props}>
    <Text
      fontSize="sm"
      color={bold ? 'white' : color}
      fontWeight={bold ? 'bold' : undefined}
      fontVariantNumeric="tabular-nums"
    >
      {children}
    </Text>
  </GridItem>
);

const SORTED_BY = 'Total /sh';

function CompanyTable({ companies, faded }) {
  const headings = ['', 'In bank', 'Before', 'Now', 'Dividends /sh', 'Price /sh', SORTED_BY, 'Return'];

  return (
    <Box overflowX="auto">
      <Grid templateColumns="90px repeat(7, minmax(88px, 1fr))" gap="2" alignItems="center" minW="740px">
        {headings.map((heading) => (
          <GridItem key={heading} pb="2" borderBottom="1px solid" borderColor="gray.800">
            <Text
              fontSize="xs"
              color={heading === SORTED_BY ? 'gray.300' : 'gray.500'}
              fontWeight={heading === SORTED_BY ? 'bold' : undefined}
              textTransform="uppercase"
              letterSpacing="wide"
            >
              {heading}
            </Text>
          </GridItem>
        ))}

        {companies.map((company) => {
          const note = CERTAINTY_NOTE[company.baseline.certainty];
          const unknown = company.stockReturnPerShare === null;
          const dim = faded?.(company.shortName) ? 0.35 : 1;
          return (
            <Fragment key={company.shortName}>
              <GridItem py="2" opacity={dim}><CompanyBadge company={company} fontSize="sm" /></GridItem>
              <Cell opacity={dim}>{company.bankShares === 0 ? 'sold out' : `${company.bankShares}%`}</Cell>
              <Cell opacity={dim}>{company.baseline.price === null ? '—' : money(company.baseline.price)}</Cell>
              <Cell opacity={dim}>{money(company.priceNow)}</Cell>
              <Cell opacity={dim}>{money(company.orIncomePerShare)}</Cell>
              <Cell opacity={dim} color={unknown ? 'gray.500' : 'gray.200'}>
                {unknown ? '—' : money(company.stockReturnPerShare)}
              </Cell>
              <Cell opacity={dim} bold>{unknown ? '—' : money(company.totalReturnPerShare)}</Cell>
              <GridItem py="2" opacity={dim}>
                <Text fontSize="sm" color="gray.200" fontVariantNumeric="tabular-nums">
                  {company.returnOnBaseline === null ? '—' : `${Math.round(company.returnOnBaseline * 100)}%`}
                </Text>
                {note && <Text fontSize="xs" color={note.color}>{note.label}</Text>}
              </GridItem>
            </Fragment>
          );
        })}
      </Grid>
    </Box>
  );
}

export default function AnalysisTab({ dashboardState, staticConfig, maxOr, players, activeCompanies }) {
  const [focus, setFocus] = useState(null);
  const { companies, playerReturns, projection, board, worthByCompany } = useMemo(() => {
    const args = { dashboardState, staticConfig, maxOr, players, activeCompanies };
    return {
      companies: getCompanyReturns(args),
      playerReturns: getPlayerReturns(args),
      projection: projectNetWorth(args),
      board: getBoardOwnership(args),
      worthByCompany: getWorthByCompany(args)
    };
  }, [dashboardState, staticConfig, maxOr, players, activeCompanies]);

  if (!activeCompanies.length) {
    return <Text color="gray.500" mt="6">Activate a company to see how the last few rounds went.</Text>;
  }

  const toggleFocus = (player) => setFocus((current) => (current === player ? null : player));

  // Focus on a company view means the companies the followed player actually holds.
  const heldByFocus = (shortName) => !focus
    || Number(dashboardState?.playerAssets?.[focus]?.shares?.[shortName] || 0) > 0;

  // A company whose price we could not explain has no total, so it sorts to the bottom.
  const byEarnings = [...companies].sort((a, b) => (b.totalReturnPerShare ?? -Infinity) - (a.totalReturnPerShare ?? -Infinity));

  const companyBars = byEarnings.map((company) => ({
    name: company.shortName,
    income: company.orIncomePerShare,
    stock: company.stockReturnPerShare || 0,
    faded: !heldByFocus(company.shortName)
  }));

  const playerBars = [...playerReturns]
    .sort((a, b) => b.totalReturn - a.totalReturn)
    .map((entry) => ({ name: entry.player, income: entry.incomeReturn, stock: entry.stockReturn, faded: Boolean(focus) && focus !== entry.player }));

  const worthBars = [...playerReturns]
    .sort((a, b) => b.netWorth - a.netWorth)
    .map((entry) => ({
      name: entry.player,
      faded: Boolean(focus) && focus !== entry.player,
      cash: entry.cash,
      dividends: entry.incomeReturn,
      shares: entry.shareValue
    }));

  const chartHeight = (rows) => Math.max(200, rows * 44 + 80);

  return (
    <Box mt="6">
      <Text fontSize="sm" color="gray.500" mb="4">
        Worked out from the operating rounds you recorded, assuming each player held their shares throughout.
        Shares traded during the share round also move a price and are not recorded, so a figure marked
        approximate or unexplained is where that shows up.
      </Text>

      <Flex gap="2" mb="5" wrap="wrap" align="center">
        <Text fontSize="xs" color="gray.500" mr="1">Follow a player:</Text>
        {players.map((player, seat) => (
          <Box
            key={player}
            as="button"
            data-testid="focus-chip"
            px="3"
            py="1"
            borderRadius="full"
            border="1px solid"
            borderColor={focus === player ? playerColor(seat) : 'gray.700'}
            bg={focus === player ? 'gray.800' : 'transparent'}
            onClick={() => toggleFocus(player)}
          >
            <Flex align="center" gap="2">
              <Box w="8px" h="8px" borderRadius="full" bg={playerColor(seat)} />
              <Text fontSize="xs" color={focus === player ? 'white' : 'gray.400'}>{player}</Text>
            </Flex>
          </Box>
        ))}
        {focus && (
          <Box as="button" px="3" py="1" onClick={() => setFocus(null)}>
            <Text fontSize="xs" color="teal.300">Clear</Text>
          </Box>
        )}
      </Flex>

      <SimpleGrid columns={[1, null, 2]} gap="6">
        <ChartCard
          title="The board"
          subtitle="Every company by what it is worth, split by who owns it"
          gridColumn={['1', null, '1 / span 2']}
        >
          <BoardTreemap board={board} players={players} focus={focus} onFocus={toggleFocus} testId="board-treemap" />
        </ChartCard>

        <ChartCard
          title="What made each player's money"
          subtitle="Net worth split by the company that earned it"
          gridColumn={['1', null, '1 / span 2']}
        >
          <WorthByCompanyChart
            rows={worthByCompany}
            companies={activeCompanies}
            focus={focus}
            onFocus={toggleFocus}
            height={chartHeight(worthByCompany.length)}
            testId="worth-by-company-chart"
          />
        </ChartCard>

        <ChartCard
          title="Return per share"
          subtitle="What one share earned since the last share round"
          gridColumn={['1', null, '1 / span 2']}
        >
          <ReturnBreakdownChart data={companyBars} series={RETURN_SERIES} height={chartHeight(companyBars.length)} testId="company-return-chart" />
        </ChartCard>

        <ChartCard title="How each company did" subtitle="Most earned per share first" gridColumn={['1', null, '1 / span 2']}>
          <CompanyTable companies={byEarnings} faded={(shortName) => !heldByFocus(shortName)} />
        </ChartCard>

        <ChartCard title="Return by player" subtitle="What each player's shares earned">
          <ReturnBreakdownChart data={playerBars} series={RETURN_SERIES} height={chartHeight(playerBars.length)} testId="player-return-chart" onFocus={toggleFocus} />
        </ChartCard>

        <ChartCard title="What each player is worth" subtitle="Cash, plus these rounds' dividends, plus shares">
          <StackedTotalChart data={worthBars} series={WORTH_SERIES} height={chartHeight(worthBars.length)} testId="player-worth-chart" onFocus={toggleFocus} />
        </ChartCard>

        {projection.length > 0 && (
          <ChartCard
            title="Projected Game State"
            subtitle="Where net worth goes if these rounds keep repeating"
            gridColumn={['1', null, '1 / span 2']}
          >
            <ProjectionChart points={projection} players={players} testId="projection-chart" focus={focus} onFocus={toggleFocus} />
            <Text fontSize="xs" color="gray.500" mt="3">
              Solid to the left of <strong>now</strong> is what the recorded rounds produced; dashed to the right
              repeats the last operating round over and over. Cash is left exactly as entered, since it describes
              the position before those rounds. Nobody buys or sells, so a sold out company keeps taking its rise
              at every share round.
              {projection[0].unexplained.length > 0
                && ` ${projection[0].unexplained.join(', ')} could not be placed on the chart, so ${projection[0].unexplained.length === 1 ? 'its price is held' : 'their prices are held'} flat.`}
            </Text>
          </ChartCard>
        )}

        <ChartCard title="What happened" subtitle="The same numbers, in words" gridColumn={['1', null, '1 / span 2']}>
          <Flex direction="column" gap="3">
            {byEarnings.map((company) => (
              <Flex key={company.shortName} gap="3" align="flex-start">
                <Box w="10px" h="10px" mt="6px" borderRadius="full" bg={company.color || 'gray.600'} flexShrink="0" />
                <Text fontSize="sm" color="gray.300">{describeCompany(company)}</Text>
              </Flex>
            ))}
            {playerReturns.map((entry) => (
              <Text key={entry.player} fontSize="sm" color="gray.300" pl="22px">{describePlayer(entry)}</Text>
            ))}
          </Flex>
        </ChartCard>
      </SimpleGrid>
    </Box>
  );
}
