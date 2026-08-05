import { Box, Heading, SimpleGrid } from '@chakra-ui/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';

export default function PlayerCharts({ leaderboardData, radarData, players }) {
  const textColor = '#A0AEC0'; // gray.400
  const gridColor = '#2D3748'; // gray.700

  // Dynamic colors for radar chart lines
  const playerColors = ['#3182CE', '#38A169', '#D69E2E', '#E53E3E', '#805AD5', '#D53F8C'];

  return (
    <SimpleGrid columns={[1, null, 2]} gap={8} w="100%" mt="6">
      
      {/* 1. Net Worth Leaderboard (Bar Chart) */}
      <Box bg="gray.900" p="6" borderRadius="xl" border="1px solid" borderColor="gray.800" shadow="xl">
        <Heading size="md" color="teal.300" mb="6" textAlign="center">Net Worth Leaderboard</Heading>
        <Box h="350px">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={leaderboardData} margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" stroke={textColor} angle={-45} textAnchor="end" height={60} />
              <YAxis stroke={textColor} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: 'white' }}
                itemStyle={{ color: 'white' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
              />
              <Bar dataKey="netWorth" name="Net Worth" radius={[4, 4, 0, 0]}>
                {leaderboardData.map((entry, index) => (
                  <cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* 2. Portfolio Diversification (Radar Chart) */}
      <Box bg="gray.900" p="6" borderRadius="xl" border="1px solid" borderColor="gray.800" shadow="xl">
        <Heading size="md" color="teal.300" mb="6" textAlign="center">Portfolio Diversification</Heading>
        <Box h="350px">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke={gridColor} />
              <PolarAngleAxis dataKey="company" tick={{ fill: textColor, fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={{ fill: 'transparent' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568', color: 'white' }}
                itemStyle={{ color: 'white' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {players.map((p, index) => (
                <Radar 
                  key={p}
                  name={p} 
                  dataKey={p} 
                  stroke={playerColors[index % playerColors.length]} 
                  fill={playerColors[index % playerColors.length]} 
                  fillOpacity={0.3} 
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </Box>
      </Box>

    </SimpleGrid>
  );
}
