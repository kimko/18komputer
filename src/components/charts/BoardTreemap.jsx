import { Box, Flex, Text } from '@chakra-ui/react';
import { Treemap, Tooltip, ResponsiveContainer } from 'recharts';
import { SURFACE, INK, money, playerColor } from './chartTheme.js';

const DIMMED = 0.18;

// Text is only drawn when it genuinely fits, rather than spilling out of its block.
const fits = (text, width, size = 11) => width > text.length * size * 0.64 + 12;

// Recharts hands every node to one renderer, so depth tells a company block from a holder's slice.
// The root arrives first with nothing on it, and only a leaf carries a holder.
function Cell({ x, y, width, height, depth, payload, focus, ...rest }) {
  if (depth === 0) return null;

  // A company block is only its frame: its children paint over it, so a label here would be buried.
  if (depth === 1) {
    return <rect x={x} y={y} width={width} height={height} fill="none" stroke={SURFACE} strokeWidth={3} />;
  }

  const slice = payload?.holder ? payload : rest;
  const holder = slice?.holder;
  if (!holder) return null;

  const lit = !focus || focus === holder;
  const held = `${holder} ${slice.percent}%`;
  // The company name rides its largest slice, which is drawn on top and so stays readable.
  const lead = slice.lead && fits(slice.lead, width, 12) && height > 30 ? slice.lead : null;
  const showHeld = fits(held, width) && height > (lead ? 32 : 16);

  return (
    <g>
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(0, width - 2)}
        height={Math.max(0, height - 2)}
        fill={slice.fill}
        fillOpacity={lit ? 0.92 : DIMMED}
        stroke={SURFACE}
        strokeWidth={2}
      />
      {lead && (
        <text x={x + 6} y={y + 16} fill="#ffffff" fontSize={12} fontWeight="bold" fillOpacity={lit ? 1 : DIMMED} pointerEvents="none">
          {lead}
        </text>
      )}
      {showHeld && (
        <text
          x={x + 6}
          y={lead ? y + 31 : y + height / 2 + 4}
          fill="#ffffff"
          fontSize={11}
          fillOpacity={lit ? 0.9 : DIMMED}
          pointerEvents="none"
        >
          {held}
        </text>
      )}
    </g>
  );
}

function Slice({ active, payload }) {
  if (!active || !payload?.length) return null;
  const node = payload[0].payload;
  if (!node?.holder) return null;

  return (
    <Box bg={SURFACE} border="1px solid" borderColor={INK.grid} borderRadius="8px" px="3" py="2">
      <Text fontSize="sm" fontWeight="bold" color={INK.secondary}>{node.company}</Text>
      <Text fontSize="xs" color={INK.secondary}>{node.holder}: {node.percent}% of the company</Text>
      <Text fontSize="xs" color={INK.secondary}>{node.shares} shares at {money(node.price)}</Text>
      <Text fontSize="xs" color={INK.secondary} mt="1">Worth {money(node.value)}</Text>
    </Box>
  );
}

export default function BoardTreemap({ board, players, focus, onFocus, height = 380, testId }) {
  if (!board.length) return null;

  const colorFor = (slice) => (slice.isBank ? INK.muted : playerColor(players.indexOf(slice.holder)));

  const data = board.map((company) => ({
    name: company.shortName,
    children: company.slices.map((slice, index) => ({
      name: `${company.shortName}-${slice.holder}`,
      lead: index === 0 ? company.shortName : null,
      company: company.shortName,
      holder: slice.holder,
      percent: slice.percent,
      shares: slice.shares,
      price: company.price,
      value: slice.value,
      isBank: Boolean(slice.isBank),
      fill: colorFor(slice)
    }))
  }));

  const seats = [...players, 'Bank'];

  return (
    <Box data-testid={testId}>
      <Box h={`${height}px`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <Treemap
            data={data}
            dataKey="value"
            nameKey="name"
            aspectRatio={4 / 3}
            isAnimationActive={false}
            content={<Cell focus={focus} />}
            onClick={(node) => node?.holder && !node.isBank && onFocus?.(node.holder)}
          >
            <Tooltip content={<Slice />} />
          </Treemap>
        </ResponsiveContainer>
      </Box>

      <Flex justify="center" gap="5" mt="2" wrap="wrap">
        {seats.map((seat, index) => (
          <Flex key={seat} align="center" gap="2">
            <Box
              w="10px"
              h="10px"
              borderRadius="2px"
              bg={seat === 'Bank' ? INK.muted : playerColor(index)}
              opacity={!focus || focus === seat ? 1 : DIMMED}
            />
            <Text fontSize="xs" color={INK.secondary} opacity={!focus || focus === seat ? 1 : 0.5}>{seat}</Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}
