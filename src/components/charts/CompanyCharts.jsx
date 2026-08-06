import { Box, Heading, SimpleGrid, Flex, Text } from '@chakra-ui/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar,
  PieChart, Pie, Cell
} from 'recharts';

export default function CompanyCharts({ trajectoryData, yieldData, activeCompanies }) {
  const textColor = '#A0AEC0'; // gray.400
  const gridColor = '#2D3748'; // gray.700



  return (
    <SimpleGrid columns={[1, null, 2]} gap={8} w="100%" mt="6">
      
      {/* 1. Revenue Trajectory (Line Chart) */}
      <Box bg="gray.900" p="6" borderRadius="xl" border="1px solid" borderColor="gray.800" shadow="xl" gridColumn={["1", null, "1 / span 2"]}>
        <Flex justify="space-between" align="center" mb="2">
          <Heading size="md" color="teal.300">Revenue Trajectory</Heading>
          <Text fontSize="sm" color="gray.500">Acceleration of operating income across rounds</Text>
        </Flex>
        <Box h="300px">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trajectoryData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" stroke={textColor} />
              <YAxis stroke={textColor} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: 'white' }}
                itemStyle={{ color: 'white' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              {activeCompanies.map(c => (
                <Line 
                  key={c.shortName} 
                  type="monotone" 
                  dataKey={c.shortName} 
                  name={c.shortName}
                  stroke={c.color || '#8884d8'} 
                  strokeWidth={3}
                  activeDot={{ r: 6 }} 
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* 2. Dividend Yield (Bar Chart) */}
      <Box bg="gray.900" p="6" borderRadius="xl" border="1px solid" borderColor="gray.800" shadow="xl">
        <Flex justify="space-between" align="center" mb="6">
          <Heading size="md" color="teal.300">Dividend Yield</Heading>
          <Text fontSize="sm" color="gray.500">Total OR Income / Market Cap</Text>
        </Flex>
        <Box h="300px">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yieldData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" stroke={textColor} />
              <YAxis stroke={textColor} tickFormatter={(val) => `${val}%`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: 'white' }}
                itemStyle={{ color: 'white' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                formatter={(value) => [`${value}%`, 'Yield']}
              />
              <Bar dataKey="yieldPct" name="Yield" radius={[4, 4, 0, 0]}>
                {yieldData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* 3. Market Dominance (Donut Chart) */}
      <Box bg="gray.900" p="6" borderRadius="xl" border="1px solid" borderColor="gray.800" shadow="xl">
        <Flex justify="space-between" align="center" mb="2">
          <Heading size="md" color="teal.300">Market Dominance</Heading>
          <Text fontSize="sm" color="gray.500">Share of total economy</Text>
        </Flex>
        <Box h="300px">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={yieldData}
                dataKey="marketCap"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
              >
                {yieldData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: 'white' }}
                itemStyle={{ color: 'white' }}
                formatter={(value) => [`$${value}`, 'Market Cap']}
              />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </Box>

    </SimpleGrid>
  );
}
