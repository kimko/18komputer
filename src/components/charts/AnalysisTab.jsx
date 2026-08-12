import { Fragment, useMemo } from 'react';
import { Box, Flex, Grid, GridItem, SimpleGrid, Text } from '@chakra-ui/react';
import ChartCard from './ChartCard.jsx';
import ReturnBreakdownChart from './ReturnBreakdownChart.jsx';
import StackedTotalChart from './StackedTotalChart.jsx';
import CompanyBadge from '../ui/CompanyBadge.jsx';
import { SERIES, INK, money } from './chartTheme.js';
import { getCompanyReturns, getPlayerReturns, describeCompany, describePlayer } from '../../utils/roundReturn.js';

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

const Cell = ({ children, ...props }) => (
  <GridItem py="2" {...props}>
    <Text fontSize="sm" color="gray.200" fontVariantNumeric="tabular-nums">{children}</Text>
  </GridItem>
);

function CompanyTable({ companies }) {
  const headings = ['', 'In bank', 'Before', 'Now', 'Dividends /sh', 'Price /sh', 'Total /sh', 'Return'];

  return (
    <Box overflowX="auto">
      <Grid templateColumns="90px repeat(7, minmax(88px, 1fr))" gap="2" alignItems="center" minW="740px">
        {headings.map((heading) => (
          <GridItem key={heading} pb="2" borderBottom="1px solid" borderColor="gray.800">
            <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">{heading}</Text>
          </GridItem>
        ))}

        {companies.map((company) => {
          const note = CERTAINTY_NOTE[company.baseline.certainty];
          const unknown = company.stockReturnPerShare === null;
          return (
            <Fragment key={company.shortName}>
              <GridItem py="2"><CompanyBadge company={company} fontSize="sm" /></GridItem>
              <Cell>{company.bankShares === 0 ? 'sold out' : `${company.bankShares}%`}</Cell>
              <Cell>{company.baseline.price === null ? '—' : money(company.baseline.price)}</Cell>
              <Cell>{money(company.priceNow)}</Cell>
              <Cell>{money(company.orIncomePerShare)}</Cell>
              <Cell color={unknown ? 'gray.500' : 'gray.200'}>
                {unknown ? '—' : money(company.stockReturnPerShare)}
              </Cell>
              <Cell>{unknown ? '—' : money(company.totalReturnPerShare)}</Cell>
              <GridItem py="2">
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
  const { companies, playerReturns } = useMemo(() => {
    const args = { dashboardState, staticConfig, maxOr, players, activeCompanies };
    return { companies: getCompanyReturns(args), playerReturns: getPlayerReturns(args) };
  }, [dashboardState, staticConfig, maxOr, players, activeCompanies]);

  if (!activeCompanies.length) {
    return <Text color="gray.500" mt="6">Activate a company to see how the last few rounds went.</Text>;
  }

  // The chart reads best with its bars in length order; the table is ranked by return instead.
  const byEarnings = [...companies].sort((a, b) => (b.totalReturnPerShare ?? -Infinity) - (a.totalReturnPerShare ?? -Infinity));
  const byReturn = [...companies].sort((a, b) => (b.returnOnBaseline ?? -Infinity) - (a.returnOnBaseline ?? -Infinity));

  const companyBars = byEarnings.map((company) => ({
    name: company.shortName,
    income: company.orIncomePerShare,
    stock: company.stockReturnPerShare || 0
  }));

  const playerBars = [...playerReturns]
    .sort((a, b) => b.totalReturn - a.totalReturn)
    .map((entry) => ({ name: entry.player, income: entry.incomeReturn, stock: entry.stockReturn }));

  const worthBars = [...playerReturns]
    .sort((a, b) => b.netWorth - a.netWorth)
    .map((entry) => ({
      name: entry.player,
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

      <SimpleGrid columns={[1, null, 2]} gap="6">
        <ChartCard
          title="Return per share"
          subtitle="What one share earned since the last share round"
          gridColumn={['1', null, '1 / span 2']}
        >
          <ReturnBreakdownChart data={companyBars} series={RETURN_SERIES} height={chartHeight(companyBars.length)} testId="company-return-chart" />
        </ChartCard>

        <ChartCard title="How each company did" subtitle="Best return first" gridColumn={['1', null, '1 / span 2']}>
          <CompanyTable companies={byReturn} />
        </ChartCard>

        <ChartCard title="Return by player" subtitle="What each player's shares earned">
          <ReturnBreakdownChart data={playerBars} series={RETURN_SERIES} height={chartHeight(playerBars.length)} testId="player-return-chart" />
        </ChartCard>

        <ChartCard title="What each player is worth" subtitle="Cash, plus these rounds' dividends, plus shares">
          <StackedTotalChart data={worthBars} series={WORTH_SERIES} height={chartHeight(worthBars.length)} testId="player-worth-chart" />
        </ChartCard>

        <ChartCard title="What happened" subtitle="The same numbers, in words" gridColumn={['1', null, '1 / span 2']}>
          <Flex direction="column" gap="3">
            {byReturn.map((company) => (
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
