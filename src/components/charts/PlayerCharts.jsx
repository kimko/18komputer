import { useState } from 'react';
import { Box, Heading, SimpleGrid, Flex, Text, Button } from '@chakra-ui/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { PLAYER_COLORS } from '../../utils/chartDataSelectors.js';

export default function PlayerCharts({ bubbleData, players, activeCompanies }) {
  const [bubbleMetric, setBubbleMetric] = useState('totalValue');
  const [yAxisMode, setYAxisMode] = useState('shares'); // 'shares' or 'value'
  const textColor = '#A0AEC0'; // gray.400
  const gridColor = '#2D3748'; // gray.700

  // Lookup company color for the dividend dependency stacks
  const getCompanyColor = (shortName) => {
    const comp = activeCompanies.find(c => c.shortName === shortName);
    return comp?.color || '#A0AEC0';
  };

  // Calculate max values for proportional scaling
  const maxTotalValue = Math.max(...bubbleData.map(d => d.totalValue || 0), 1);
  const maxShares = Math.max(...bubbleData.map(d => Math.ceil(d.trueShares || 0)), 1);

  return (
    <Box w="100%" mt="6">
      
      <Box bg="gray.900" p="6" borderRadius="xl" border="1px solid" borderColor="gray.800" shadow="xl">
        <Flex justify="space-between" align="center" mb="2">
          <Heading size="md" color="teal.300">Market Power Grid</Heading>
          <Flex gap={2}>
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
                dataKey={yAxisMode === 'shares' ? 'y' : `${bubbleMetric}Jitter`} 
                type="number" 
                domain={yAxisMode === 'shares' ? [0, Math.max(2, maxShares) + 1] : ['auto', 'auto']}
                ticks={yAxisMode === 'shares' ? Array.from({ length: Math.max(2, maxShares) }, (_, i) => i + 1).filter(v => Math.max(2, maxShares) <= 5 || v % 2 === 0) : undefined}
                stroke={textColor} 
                width={50} 
                name={yAxisMode === 'shares' ? 'Shares' : 'Value'} 
                tickFormatter={yAxisMode === 'value' ? (val) => `$${val}` : undefined}
              />
              <ZAxis 
                dataKey={yAxisMode === 'shares' ? bubbleMetric : 'trueShares'} 
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
              <Scatter data={bubbleData} name="Player">
                {bubbleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.8} />
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
        </Flex>
      </Box>

    </Box>
  );
}
