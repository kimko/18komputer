import { Box, Flex, Text } from '@chakra-ui/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';
import { SURFACE, INK, TOOLTIP_STYLE, money, playerColor } from './chartTheme.js';

const DIMMED = 0.18;

const compact = (value) => (Math.abs(value) >= 1000 ? `$${Math.round(value / 100) / 10}k` : money(value));

function Standings({ active, payload, players }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const ranked = [...players]
    .map((player, index) => ({ player, index, worth: row.worth[player] }))
    .sort((a, b) => b.worth - a.worth);

  return (
    <Box bg={SURFACE} border="1px solid" borderColor={INK.grid} borderRadius="8px" px="3" py="2">
      <Text fontSize="sm" fontWeight="bold" color={INK.secondary}>{row.label}</Text>
      <Text fontSize="xs" color={INK.muted} mb="1">{row.recorded ? 'recorded' : 'projected'}</Text>
      {ranked.map(({ player, index, worth }) => (
        <Flex key={player} align="center" gap="2">
          <Box w="8px" h="8px" borderRadius="2px" bg={playerColor(index)} />
          <Text fontSize="xs" color={INK.secondary}>{player}: {money(worth)}</Text>
        </Flex>
      ))}
    </Box>
  );
}

export default function ProjectionChart({ points, players, height = 340, testId, focus, onFocus }) {
  if (!points.length || !players.length) return null;

  const boundary = points.reduce((last, point, index) => (point.recorded ? index : last), 0);

  // Two lines per player: the recorded stretch, then a dashed one that picks up where it ends.
  const rows = points.map((point, index) => {
    const row = { id: point.id, label: point.label, recorded: point.recorded, worth: point.netWorth };
    players.forEach((player, seat) => {
      const worth = point.netWorth[player];
      row[`r${seat}`] = point.recorded ? worth : null;
      row[`p${seat}`] = !point.recorded || index === boundary ? worth : null;
    });
    return row;
  });

  const Marker = ({ cx, cy, index, stroke }) => (index === boundary ? (
    <circle cx={cx} cy={cy} r={5} fill={stroke} stroke={SURFACE} strokeWidth={2} />
  ) : null);

  return (
    <Box data-testid={testId}>
      <Box h={`${height}px`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          {/* The top margin leaves room for the "now" label to sit above the plot. */}
          <LineChart data={rows} margin={{ top: 24, right: 24, bottom: 8, left: 8 }}>
            <CartesianGrid vertical={false} stroke={INK.grid} />
            <XAxis
              dataKey="id"
              stroke={INK.muted}
              tick={{ fill: INK.secondary, fontSize: 11 }}
              tickFormatter={(id) => rows.find((row) => row.id === id)?.label || ''}
              interval={0}
            />
            <YAxis stroke={INK.muted} tick={{ fill: INK.muted, fontSize: 12 }} tickFormatter={compact} width={56} />
            <Tooltip cursor={TOOLTIP_STYLE.cursor} content={<Standings players={players} />} />
            <ReferenceLine
              x={rows[boundary].id}
              stroke={INK.muted}
              label={{ value: 'now', position: 'top', fill: INK.muted, fontSize: 11 }}
            />
            {players.map((player, seat) => {
              const lit = !focus || focus === player;
              return [
              <Line
                key={`r${seat}`}
                dataKey={`r${seat}`}
                name={player}
                stroke={playerColor(seat)}
                strokeWidth={2}
                strokeOpacity={lit ? 1 : DIMMED}
                dot={<Marker />}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />,
              <Line
                key={`p${seat}`}
                dataKey={`p${seat}`}
                name={player}
                stroke={playerColor(seat)}
                strokeWidth={2}
                strokeOpacity={lit ? 1 : DIMMED}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
              ];
            })}
          </LineChart>
        </ResponsiveContainer>
      </Box>

      <Flex justify="center" gap="5" mt="2" wrap="wrap">
        {players.map((player, seat) => (
          <Flex
            key={player}
            align="center"
            gap="2"
            cursor="pointer"
            opacity={!focus || focus === player ? 1 : 0.5}
            onClick={() => onFocus?.(player)}
          >
            <Box w="10px" h="10px" borderRadius="2px" bg={playerColor(seat)} />
            <Text fontSize="xs" color={INK.secondary}>{player}</Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}
