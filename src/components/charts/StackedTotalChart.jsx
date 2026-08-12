import { Box, Flex, Text } from '@chakra-ui/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { INK, BAR_SIZE, TOOLTIP_STYLE, money } from './chartTheme.js';
import { segmentPath } from './segmentGeometry.js';

// Every part of these totals is money a player has, so nothing here is ever negative.
const makeSegment = (isLast) => {
  const Segment = ({ fill, ...geometry }) => {
    const path = segmentPath({
      ...geometry,
      side: isLast ? 'right' : 'none',
      gapSide: isLast ? null : 'right'
    });
    return path ? <path d={path} fill={fill} /> : null;
  };
  Segment.displayName = 'StackSegment';
  return Segment;
};

function Breakdown({ active, payload, series }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const total = series.reduce((sum, entry) => sum + (row[entry.key] || 0), 0);

  return (
    <Box bg={TOOLTIP_STYLE.contentStyle.backgroundColor} border="1px solid" borderColor={INK.grid} borderRadius="8px" px="3" py="2">
      <Text fontSize="sm" fontWeight="bold" color={INK.secondary} mb="1">{row.name}</Text>
      {series.map((entry) => (
        <Text key={entry.key} fontSize="xs" color={INK.secondary}>{entry.label}: {money(row[entry.key] || 0)}</Text>
      ))}
      <Text fontSize="xs" color={INK.secondary} mt="1">Total: {money(total)}</Text>
    </Box>
  );
}

export default function StackedTotalChart({ data, series, height = 280, testId }) {
  if (!data.length) return null;

  return (
    <Box data-testid={testId}>
      <Box h={`${height}px`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 28, bottom: 8, left: 8 }} barSize={BAR_SIZE}>
            <CartesianGrid horizontal={false} stroke={INK.grid} />
            <XAxis type="number" stroke={INK.muted} tick={{ fill: INK.muted, fontSize: 12 }} tickFormatter={money} />
            <YAxis type="category" dataKey="name" width={68} stroke={INK.muted} tick={{ fill: INK.secondary, fontSize: 12 }} />
            <Tooltip cursor={TOOLTIP_STYLE.cursor} content={<Breakdown series={series} />} />
            {series.map((entry, index) => {
              const Shape = makeSegment(index === series.length - 1);
              return (
                <Bar
                  key={entry.key}
                  dataKey={entry.key}
                  stackId="worth"
                  fill={entry.color}
                  shape={<Shape />}
                  isAnimationActive={false}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </Box>

      <Flex justify="center" gap="5" mt="2" wrap="wrap">
        {series.map((entry) => (
          <Flex key={entry.key} align="center" gap="2">
            <Box w="10px" h="10px" borderRadius="2px" bg={entry.color} />
            <Text fontSize="xs" color={INK.secondary}>{entry.label}</Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}
