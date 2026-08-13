import { Box, Flex, Text } from '@chakra-ui/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';
import { INK, BAR_SIZE, TOOLTIP_STYLE, money } from './chartTheme.js';
import { segmentPath } from './segmentGeometry.js';

const DIMMED = 0.18;

const Segment = ({ fill, payload, ...geometry }) => {
  const path = segmentPath(geometry);
  if (!path) return null;
  return <path d={path} fill={fill} fillOpacity={payload?.faded ? DIMMED : 1} />;
};

const FirstSegment = (props) => (
  <Segment {...props} side={props.payload?.secondUp > 0 ? 'none' : 'right'} gapSide={props.payload?.secondUp > 0 ? 'right' : null} />
);
const UpSegment = (props) => (props.payload?.secondUp > 0 ? <Segment {...props} side="right" /> : null);
const DownSegment = (props) => (props.payload?.secondDown < 0 ? <Segment {...props} side="left" gapSide="right" /> : null);

function Breakdown({ active, payload, series }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const [first, second] = series;

  return (
    <Box bg={TOOLTIP_STYLE.contentStyle.backgroundColor} border="1px solid" borderColor={INK.grid} borderRadius="8px" px="3" py="2">
      <Text fontSize="sm" fontWeight="bold" color={INK.secondary} mb="1">{row.name}</Text>
      <Text fontSize="xs" color={INK.secondary}>{first.label}: {money(row.first)}</Text>
      <Text fontSize="xs" color={INK.secondary}>{second.label}: {money(row.second)}</Text>
      <Text fontSize="xs" color={INK.secondary} mt="1">Total: {money(row.first + row.second)}</Text>
    </Box>
  );
}

export default function ReturnBreakdownChart({ data, series, height = 280, testId, onFocus }) {
  if (!data.length) return null;

  const [first, second] = series;
  // Recharts will not lay out a negative segment inside a mixed-sign stack, so the two
  // directions are separate series and sign stacking grows each one away from zero.
  const rows = data.map((row) => ({
    name: row.name,
    faded: row.faded,
    first: row[first.key],
    second: row[second.key],
    secondUp: Math.max(0, row[second.key]),
    secondDown: Math.min(0, row[second.key])
  }));
  const axisWidth = Math.min(150, Math.max(68, Math.max(...rows.map((row) => String(row.name).length)) * 8));

  return (
    <Box data-testid={testId}>
      <Box h={`${height}px`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart data={rows} layout="vertical" stackOffset="sign" margin={{ top: 8, right: 28, bottom: 8, left: 8 }} barSize={BAR_SIZE}>
            <CartesianGrid horizontal={false} stroke={INK.grid} />
            <XAxis type="number" stroke={INK.muted} tick={{ fill: INK.muted, fontSize: 12 }} tickFormatter={money} />
            <YAxis type="category" dataKey="name" width={axisWidth} stroke={INK.muted} tick={{ fill: INK.secondary, fontSize: 12 }} />
            <Tooltip cursor={TOOLTIP_STYLE.cursor} content={<Breakdown series={series} />} />
            <ReferenceLine x={0} stroke={INK.muted} />
            <Bar dataKey="first" stackId="split" fill={first.color} shape={<FirstSegment />} isAnimationActive={false} onClick={(bar) => onFocus?.(bar?.payload?.name)} />
            <Bar dataKey="secondUp" stackId="split" fill={second.color} shape={<UpSegment />} isAnimationActive={false} onClick={(bar) => onFocus?.(bar?.payload?.name)} />
            <Bar dataKey="secondDown" stackId="split" fill={second.color} shape={<DownSegment />} isAnimationActive={false} onClick={(bar) => onFocus?.(bar?.payload?.name)} />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      <Flex justify="center" gap="5" mt="2">
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
