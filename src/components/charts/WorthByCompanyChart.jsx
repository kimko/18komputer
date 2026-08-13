import { Box, Flex, Text } from '@chakra-ui/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SURFACE, INK, BAR_SIZE, TOOLTIP_STYLE, money } from './chartTheme.js';
import { segmentPath } from './segmentGeometry.js';
import { getContrastColor } from '../../utils/colorUtils.js';

const CASH_KEY = '__cash';
const DIMMED = 0.18;

const makeSegment = (isLast) => {
  const Segment = ({ fill, payload, ...geometry }) => {
    const path = segmentPath({ ...geometry, side: isLast ? 'right' : 'none', gapSide: isLast ? null : 'right' });
    if (!path) return null;
    return <path d={path} fill={fill} fillOpacity={payload?.faded ? DIMMED : 1} />;
  };
  Segment.displayName = 'WorthSegment';
  return Segment;
};

// Only label a segment when the text genuinely fits, rather than cropping it. Recharts hands a
// stacked bar its running total, so the segment's own figure is read back off the row.
const makeLabel = (color, key, rows) => {
  const Label = ({ x, y, width, height, index }) => {
    const own = rows[index]?.[key];
    if (!own) return null;

    const text = money(own);
    if (!width || width < text.length * 7 + 10 || height < 14) return null;
    return (
      <text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle" fontSize={10} fill={color}>
        {text}
      </text>
    );
  };
  Label.displayName = 'WorthLabel';
  return Label;
};

function Split({ active, payload, companies }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  const parts = [
    { label: 'Cash', value: row[CASH_KEY], color: INK.muted },
    ...companies
      .filter((company) => row[company.shortName] > 0)
      .map((company) => ({ label: company.shortName, value: row[company.shortName], color: company.color }))
  ].sort((a, b) => b.value - a.value);

  return (
    <Box bg={SURFACE} border="1px solid" borderColor={INK.grid} borderRadius="8px" px="3" py="2">
      <Text fontSize="sm" fontWeight="bold" color={INK.secondary} mb="1">{row.name}</Text>
      {parts.map((part) => (
        <Flex key={part.label} align="center" gap="2">
          <Box w="8px" h="8px" borderRadius="2px" bg={part.color} />
          <Text fontSize="xs" color={INK.secondary}>{part.label}: {money(part.value)}</Text>
        </Flex>
      ))}
      <Text fontSize="xs" color={INK.secondary} mt="1">Total: {money(row.total)}</Text>
    </Box>
  );
}

export default function WorthByCompanyChart({ rows, companies, focus, onFocus, height = 300, testId }) {
  if (!rows.length) return null;

  const order = rows[0].order;
  const held = companies.filter((company) => rows.some((row) => row.byCompany[company.shortName] > 0));
  const ordered = order
    .map((shortName) => held.find((company) => company.shortName === shortName))
    .filter(Boolean);

  const data = [...rows]
    .sort((a, b) => b.netWorth - a.netWorth)
    .map((row) => ({
      name: row.player,
      faded: Boolean(focus) && focus !== row.player,
      total: row.netWorth,
      [CASH_KEY]: row.cash,
      ...Object.fromEntries(ordered.map((company) => [company.shortName, row.byCompany[company.shortName] || 0]))
    }));

  const axisWidth = Math.min(150, Math.max(68, Math.max(...data.map((row) => String(row.name).length)) * 8));
  const keys = [{ key: CASH_KEY, color: INK.muted, ink: '#ffffff' },
    ...ordered.map((company) => ({ key: company.shortName, color: company.color || INK.muted, ink: getContrastColor(company.color) === 'white' ? '#ffffff' : '#0b0b0b' }))];

  return (
    <Box data-testid={testId}>
      <Box h={`${height}px`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 28, bottom: 8, left: 8 }} barSize={BAR_SIZE}>
            <CartesianGrid horizontal={false} stroke={INK.grid} />
            <XAxis type="number" stroke={INK.muted} tick={{ fill: INK.muted, fontSize: 12 }} tickFormatter={money} />
            <YAxis type="category" dataKey="name" width={axisWidth} stroke={INK.muted} tick={{ fill: INK.secondary, fontSize: 12 }} />
            <Tooltip cursor={TOOLTIP_STYLE.cursor} content={<Split companies={ordered} />} />
            {keys.map((entry, index) => {
              const Shape = makeSegment(index === keys.length - 1);
              const Label = makeLabel(entry.ink, entry.key, data);
              return (
                <Bar
                  key={entry.key}
                  dataKey={entry.key}
                  stackId="worth"
                  fill={entry.color}
                  shape={<Shape />}
                  label={<Label />}
                  isAnimationActive={false}
                  onClick={(bar) => onFocus?.(bar?.payload?.name)}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </Box>

      <Flex justify="center" gap="4" mt="2" wrap="wrap">
        <Flex align="center" gap="2">
          <Box w="10px" h="10px" borderRadius="2px" bg={INK.muted} />
          <Text fontSize="xs" color={INK.secondary}>Cash</Text>
        </Flex>
        {ordered.map((company) => (
          <Flex key={company.shortName} align="center" gap="2">
            <Box w="10px" h="10px" borderRadius="2px" bg={company.color || INK.muted} />
            <Text fontSize="xs" color={INK.secondary}>{company.shortName}</Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}
