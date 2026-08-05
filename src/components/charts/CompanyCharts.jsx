import { Box, Heading, SimpleGrid } from '@chakra-ui/react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
  BarChart, Bar
} from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Box bg="gray.800" p="3" border="1px solid" borderColor="gray.600" borderRadius="md" color="white">
        <Heading size="sm" mb="2" color={data.fill}>{data.fullName} ({data.name})</Heading>
        <p>Share Price: ${data.sharePrice}</p>
        <p>Operating Income: ${data.operatingIncome}</p>
        <p>Market Cap: ${data.marketCap}</p>
      </Box>
    );
  }
  return null;
};

export default function CompanyCharts({ data }) {
  const textColor = '#A0AEC0'; // gray.400
  const gridColor = '#2D3748'; // gray.700

  return (
    <SimpleGrid columns={[1, null, 2]} gap={8} w="100%" mt="6">
      
      {/* 1. Value vs Income (Scatter Plot) */}
      <Box bg="gray.900" p="6" borderRadius="xl" border="1px solid" borderColor="gray.800" shadow="xl">
        <Heading size="md" color="teal.300" mb="6" textAlign="center">Efficiency: Share Price vs Op Income</Heading>
        <Box h="350px">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis type="number" dataKey="sharePrice" name="Share Price" unit="$" stroke={textColor} />
              <YAxis type="number" dataKey="operatingIncome" name="Op Income" unit="$" stroke={textColor} />
              <ZAxis type="number" dataKey="marketCap" range={[100, 1000]} name="Market Cap" />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Companies" data={data} fill="#8884d8">
                {data.map((entry, index) => (
                  <cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList dataKey="name" position="inside" fill="#fff" fontSize={11} fontWeight="bold" />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* 2. Relative Market Cap (Bar Chart) */}
      <Box bg="gray.900" p="6" borderRadius="xl" border="1px solid" borderColor="gray.800" shadow="xl">
        <Heading size="md" color="teal.300" mb="6" textAlign="center">Relative Market Cap</Heading>
        <Box h="350px">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" stroke={textColor} />
              <YAxis stroke={textColor} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: 'white' }}
                itemStyle={{ color: 'white' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
              />
              <Bar dataKey="marketCap" name="Market Cap" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>

    </SimpleGrid>
  );
}
