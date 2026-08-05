import { useState } from 'react';
import { Box, Heading, SimpleGrid, Flex, Text, Button } from '@chakra-ui/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { PLAYER_COLORS } from '../../utils/chartDataSelectors.js';

export default function PlayerCharts({ assetData, dividendData, radarData, bubbleData, players, activeCompanies }) {
  const [bubbleMetric, setBubbleMetric] = useState('totalValue');
  const [yAxisMode, setYAxisMode] = useState('shares'); // 'shares' or 'value'
  const textColor = '#A0AEC0'; // gray.400
  const gridColor = '#2D3748'; // gray.700

  // Colors for asset breakdown
  const ASSET_COLORS = {
    'Stock Value': '#805AD5', // purple
    'Cash': '#38A169',        // green
    'Op Income': '#3182CE'    // blue
  };

  // Lookup company color for the dividend dependency stacks
  const getCompanyColor = (shortName) => {
    const comp = activeCompanies.find(c => c.shortName === shortName);
    return comp?.color || '#A0AEC0';
  };

  return (
    <SimpleGrid columns={[1, null, 2]} gap={8} w="100%" mt="6">
      
      {/* 1. Asset Breakdown (Stacked Bar Chart) */}
      <Box bg="gray.900" p="6" borderRadius="xl" border="1px solid" borderColor="gray.800" shadow="xl" gridColumn={["1", null, "1 / span 2"]}>
        <Flex justify="space-between" align="center" mb="6">
          <Heading size="md" color="teal.300">Asset Breakdown (Liquidity & Earnings)</Heading>
          <Text fontSize="sm" color="gray.500">Long-term Equity vs Historical Cash vs Fresh Income</Text>
        </Flex>
        <Box h="350px">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={assetData} margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" stroke={textColor} angle={-45} textAnchor="end" height={60} />
              <YAxis stroke={textColor} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: 'white' }}
                itemStyle={{ color: 'white' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="Stock Value" stackId="a" fill={ASSET_COLORS['Stock Value']} />
              <Bar dataKey="Cash" stackId="a" fill={ASSET_COLORS['Cash']} />
              <Bar dataKey="Op Income" stackId="a" fill={ASSET_COLORS['Op Income']} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* 2. Dividend Dependency (Stacked Bar Chart) */}
      <Box bg="gray.900" p="6" borderRadius="xl" border="1px solid" borderColor="gray.800" shadow="xl">
        <Flex justify="space-between" align="center" mb="6">
          <Heading size="md" color="teal.300">Dividend Dependency</Heading>
          <Text fontSize="sm" color="gray.500">Sources of current operating income</Text>
        </Flex>
        <Box h="350px">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dividendData} margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" stroke={textColor} angle={-45} textAnchor="end" height={60} />
              <YAxis stroke={textColor} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: 'white' }}
                itemStyle={{ color: 'white' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {activeCompanies.map((c, idx) => (
                <Bar 
                  key={c.shortName} 
                  dataKey={c.shortName} 
                  stackId="b" 
                  fill={c.color || '#8884d8'} 
                  radius={idx === activeCompanies.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* 3. Controlling Interest (Radar Chart) */}
      <Box bg="gray.900" p="6" borderRadius="xl" border="1px solid" borderColor="gray.800" shadow="xl">
        <Flex justify="space-between" align="center" mb="2">
          <Heading size="md" color="teal.300">Controlling Interest</Heading>
          <Text fontSize="sm" color="gray.500">Ownership weighted by Market Cap</Text>
        </Flex>
        <Box h="350px">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke={gridColor} />
              <PolarAngleAxis dataKey="company" tick={{ fill: textColor, fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={{ fill: 'transparent' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: 'white' }}
                itemStyle={{ color: 'white' }}
                formatter={(value, name) => [`$${value}`, name]}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {players.map((p, index) => (
                <Radar 
                  key={p}
                  name={p} 
                  dataKey={p} 
                  stroke={PLAYER_COLORS[index % PLAYER_COLORS.length]} 
                  fill={PLAYER_COLORS[index % PLAYER_COLORS.length]} 
                  fillOpacity={0.3} 
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* 4. Market Power (Bubble Chart) */}
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
                domain={yAxisMode === 'shares' ? [0, Math.max(2, ...bubbleData.map(d => Math.ceil(d.trueShares || 0))) + 1] : ['auto', 'auto']}
                ticks={yAxisMode === 'shares' ? Array.from({ length: Math.max(2, ...bubbleData.map(d => Math.ceil(d.trueShares || 0))) }, (_, i) => i + 1).filter(v => Math.max(2, ...bubbleData.map(d => Math.ceil(d.trueShares || 0))) <= 5 || v % 2 === 0) : undefined}
                stroke={textColor} 
                width={50} 
                name={yAxisMode === 'shares' ? 'Shares' : 'Value'} 
                tickFormatter={yAxisMode === 'value' ? (val) => `$${val}` : undefined}
              />
              <ZAxis 
                dataKey={yAxisMode === 'shares' ? bubbleMetric : 'trueShares'} 
                type="number" 
                range={yAxisMode === 'shares' ? [50, 800] : [100, 600]} 
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
      </Box>

    </SimpleGrid>
  );
}
