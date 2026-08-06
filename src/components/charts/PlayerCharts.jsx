import { useState, useMemo } from 'react';
import { Box, Heading, Flex, Text, Button } from '@chakra-ui/react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { getBubbleChartData } from '../../utils/chartDataSelectors.js';

export default function PlayerCharts({ dashboardState, maxOr, players, activeCompanies }) {
  const [bubbleMetric, setBubbleMetric] = useState('totalValue');
  const [yAxisMode, setYAxisMode] = useState('value'); // 'shares' or 'value'
  const [includeCash, setIncludeCash] = useState(true);
  const [includeTotal, setIncludeTotal] = useState(false);
  const textColor = '#A0AEC0'; // gray.400
  const gridColor = '#2D3748'; // gray.700

  const bubbleData = useMemo(() => {
    return getBubbleChartData(dashboardState, activeCompanies, maxOr, players, includeCash, includeTotal);
  }, [dashboardState, activeCompanies, maxOr, players, includeCash, includeTotal]);



  // Calculate max values for proportional scaling
  const maxTotalValue = Math.max(...bubbleData.map(d => d.totalValue || 0), 1);
  const maxShares = Math.max(...bubbleData.map(d => Math.ceil(d.trueShares || 0)), 1);

  // Map active metrics to constant dataKeys for smooth animation interpolation
  const animatedData = useMemo(() => {
    return bubbleData.map(d => ({
      ...d,
      animatedY: yAxisMode === 'shares' ? d.y : d[`${bubbleMetric}Jitter`],
      animatedZ: yAxisMode === 'shares' 
        ? d[bubbleMetric] 
        : (d.company === 'Cash' ? Math.max(1, maxShares * 0.2) : d.trueShares)
    }));
  }, [bubbleData, yAxisMode, bubbleMetric, maxShares]);

  return (
    <Box w="100%" mt="6">
      
      <Box bg="gray.900" p="6" borderRadius="xl" border="1px solid" borderColor="gray.800" shadow="xl">
        <Flex direction={{ base: "column", lg: "row" }} justify="space-between" align={{ base: "flex-start", lg: "center" }} mb="2" gap="4">
          <Heading size="md" color="teal.300">Market Power Grid</Heading>
          <Flex wrap="wrap" gap={3} align="center">
            <Button size="sm" onClick={() => setYAxisMode(m => m === 'shares' ? 'value' : 'shares')} bg="gray.800" color="white" border="1px solid" borderColor="gray.600" _hover={{ bg: 'gray.700' }}>
              ⇄ Flip Axes
            </Button>
            <Box 
              as="select"
              w="auto" 
              value={bubbleMetric} 
              onChange={(e) => setBubbleMetric(e.target.value)} 
              bg="gray.800" 
              borderColor="gray.600" 
              color="white"
              p={1}
              borderRadius="md"
              border="1px solid"
            >
              <option value="shareValue">Share Value</option>
              <option value="opIncome">Operating Income</option>
              <option value="totalValue">Total Value</option>
            </Box>
            <Flex 
              align="center" 
              gap={2} 
            >
              <input 
                id="include-cash-checkbox"
                type="checkbox" 
                checked={includeCash} 
                onChange={(e) => setIncludeCash(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <Text as="label" htmlFor="include-cash-checkbox" fontSize="sm" color="white" userSelect="none" cursor="pointer">Include Cash</Text>
            </Flex>
            <Flex 
              align="center" 
              gap={2} 
            >
              <input 
                id="include-total-checkbox"
                type="checkbox" 
                checked={includeTotal} 
                onChange={(e) => setIncludeTotal(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <Text as="label" htmlFor="include-total-checkbox" fontSize="sm" color="white" userSelect="none" cursor="pointer">Include Total</Text>
            </Flex>
          </Flex>
        </Flex>
        <Text fontSize="sm" color="gray.500" mb="4">Ownership value comparison</Text>
        <Box h="350px">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis 
                dataKey="x" 
                type="number" 
                domain={[0, (players.length + 1) * 10]} 
                ticks={players.map((_, i) => (i + 1) * 10)} 
                tickFormatter={(val) => players[val / 10 - 1] || ''} 
                stroke={textColor} 
              />
              <YAxis 
                dataKey="animatedY" 
                type="number" 
                domain={yAxisMode === 'shares' ? [0, Math.max(2, maxShares) + 1] : ['auto', 'auto']}
                ticks={yAxisMode === 'shares' ? Array.from({ length: Math.max(2, maxShares) }, (_, i) => i + 1).filter(v => Math.max(2, maxShares) <= 5 || v % 2 === 0) : undefined}
                stroke={textColor} 
                width={50} 
                name={yAxisMode === 'shares' ? 'Shares' : 'Value'} 
                tickFormatter={yAxisMode === 'value' ? (val) => `$${val}` : undefined}
              />
              <ZAxis 
                dataKey="animatedZ" 
                type="number" 
                domain={yAxisMode === 'shares' ? [0, maxTotalValue] : [0, maxShares]}
                range={yAxisMode === 'shares' ? [0, 3000] : [0, 1000]} 
                name={yAxisMode === 'shares' ? 'Value' : 'Shares'} 
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: 'white' }}
                itemStyle={{ color: 'white' }}
                labelStyle={{ color: 'white' }}
                formatter={(value, name, props) => {
                  if (name === 'Value') return [`$${Math.round(value)}`, bubbleMetric === 'shareValue' ? 'Share Value' : bubbleMetric === 'opIncome' ? 'Op Income' : 'Total Value'];
                  if (name === 'Shares') return [props.payload.trueShares, 'Shares'];
                  if (name === 'x') return [props.payload.company, 'Company'];
                  return [value, name];
                }}
              />
              <Scatter data={animatedData} name="Player" animationDuration={800} animationEasing="ease-out">
                {animatedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill} 
                    fillOpacity={entry.isCumulative ? 0.4 : 0.8}
                    stroke={entry.isCumulative ? entry.stroke : 'none'}
                    strokeWidth={0}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Box>
        <Flex wrap="wrap" gap={4} justify="center" mt={6}>
          {activeCompanies.map(c => (
            <Flex key={c.shortName} align="center" gap={2}>
              <Box w={3} h={3} borderRadius="50%" bg={c.color || '#8884d8'} />
              <Text fontSize="sm" color="gray.400">{c.name || c.shortName}</Text>
            </Flex>
          ))}
          {includeCash && (
            <Flex align="center" gap={2}>
              <Box w={3} h={3} borderRadius="50%" bg="#48BB78" />
              <Text fontSize="sm" color="gray.400">Cash</Text>
            </Flex>
          )}
          {includeTotal && (
            <Flex align="center" gap={2}>
              <Box w={3} h={3} borderRadius="50%" bg="#A0AEC0" opacity={0.4} />
              <Text fontSize="sm" color="gray.400">Total Cumulative</Text>
            </Flex>
          )}
        </Flex>
      </Box>

    </Box>
  );
}
