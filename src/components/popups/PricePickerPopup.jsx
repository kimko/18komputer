import { useState } from 'react';
import { Box, Flex, Text, Button, SimpleGrid } from '@chakra-ui/react';
import ModalBackdrop from '../ui/ModalBackdrop.jsx';
import CompanyBadge from '../ui/CompanyBadge.jsx';
import { parseCell, cellAt, move, canMove, findStartCell } from '../../utils/stockMarket.js';

const ZONE_COLORS = { y: '#d6b656', o: '#d79b3c', b: '#8b5e3c' };

const ARROWS = [
  { direction: 'up', glyph: '↑', label: 'Move up' },
  { direction: 'left', glyph: '←', label: 'Move left' },
  { direction: 'right', glyph: '→', label: 'Move right' },
  { direction: 'down', glyph: '↓', label: 'Move down' }
];

function MarketGrid({ market, position, onPick }) {
  const columns = Math.max(...market.grid.map((row) => row.length));

  return (
    <Box maxH="240px" overflow="auto" mb="4">
      <SimpleGrid columns={columns} gap="1" minW="fit-content">
        {market.grid.flatMap((row, r) =>
          Array.from({ length: columns }, (_, c) => {
            const cell = parseCell(row[c]);
            if (!cell) return <Box key={`${r}-${c}`} />;

            const isHere = position?.[0] === r && position?.[1] === c;
            return (
              <Button
                key={`${r}-${c}`}
                data-testid={`market-cell-${r}-${c}`}
                aria-current={isHere ? 'true' : undefined}
                size="xs"
                minW="34px"
                px="1"
                fontSize="xs"
                color={isHere ? 'black' : 'white'}
                bg={isHere ? 'white' : ZONE_COLORS[cell.zone] || 'whiteAlpha.200'}
                borderWidth={cell.isPar ? '2px' : '1px'}
                borderColor={cell.isPar ? 'green.300' : 'transparent'}
                _hover={{ opacity: 0.8 }}
                onClick={() => onPick(cell.price, [r, c])}
              >
                {cell.price}
              </Button>
            );
          })
        )}
      </SimpleGrid>
    </Box>
  );
}

function TwoDimensionalPicker({ position, parValue, value, market, onChange, onClose }) {
  const [current, setCurrent] = useState(
    () => position || findStartCell(market, parValue, value)
  );

  const price = cellAt(market.grid, current)?.price;

  const pick = (nextPrice, nextPosition) => {
    setCurrent(nextPosition);
    onChange(nextPrice, nextPosition);
  };

  const step = (direction) => {
    const next = move(market, current, direction);
    pick(cellAt(market.grid, next).price, next);
  };

  return (
    <>
      <MarketGrid
        market={market}
        position={current}
        onPick={(nextPrice, nextPosition) => {
          pick(nextPrice, nextPosition);
          onClose();
        }}
      />

      <Flex align="center" justify="center" gap="2" mb="3">
        {ARROWS.map(({ direction, glyph, label }) => (
          <Button
            key={direction}
            aria-label={label}
            w="50px"
            h="50px"
            variant="outline"
            color="white"
            borderColor="gray.600"
            disabled={!canMove(market, current, direction)}
            onClick={() => step(direction)}
          >
            {glyph}
          </Button>
        ))}
      </Flex>

      <Flex align="center" justify="space-between">
        <Text color="white" fontSize="lg" fontWeight="bold">
          {price === undefined ? 'Not on the chart' : `$${price}`}
        </Text>
        <Button variant="outline" color="white" borderColor="gray.600" onClick={onClose}>X</Button>
      </Flex>
    </>
  );
}

function OneDimensionalPicker({ value, options, onChange, onClose }) {
  const valNum = value === '' || value === undefined ? null : Number(value);
  const [index, setIndex] = useState(() => options.findIndex(opt => opt === valNum));
  const selected = index >= 0 ? options[index] : null;

  const pick = (nextIndex) => {
    setIndex(nextIndex);
    onChange(options[nextIndex], null);
  };

  const stepTo = (nextIndex) => {
    if (options.length === 0) return;
    pick(index === -1 ? 0 : nextIndex);
  };

  const handlePrev = () => {
    if (index === -1 || index > 0) stepTo(index - 1);
  };

  const handleNext = () => {
    if (index === -1 || index < options.length - 1) stepTo(index + 1);
  };

  return (
    <Flex gap="4">
      <Box flex="1" maxH="300px" overflowY="auto">
        <SimpleGrid columns={4} gap="2">
          {options.slice().reverse().map(opt => (
            <Button
              key={opt}
              size="sm"
              variant={selected === opt ? 'solid' : 'ghost'}
              color={selected === opt ? 'black' : 'gray.300'}
              bg={selected === opt ? 'white' : 'transparent'}
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => {
                pick(options.indexOf(opt));
                onClose();
              }}
            >
              {opt}
            </Button>
          ))}
        </SimpleGrid>
      </Box>

      <Flex direction="column" gap="2" w="50px">
        <Button w="100%" h="50px" variant="outline" color="white" borderColor="gray.600" onClick={() => { setIndex(-1); onChange('', null); }}>C</Button>
        <Button w="100%" h="50px" variant="outline" color="white" borderColor="gray.600" onClick={handlePrev}>←</Button>
        <Button w="100%" h="50px" variant="outline" color="white" borderColor="gray.600" onClick={handleNext}>→</Button>
        <Button w="100%" h="50px" variant="outline" color="white" borderColor="gray.600" onClick={onClose}>X</Button>
      </Flex>
    </Flex>
  );
}

export default function PricePickerPopup({ company, value, position, parValue, options, market, onChange, onClose }) {
  const isTwoDimensional = market?.type === '2d' && market.grid?.length > 1;

  return (
    <ModalBackdrop onClose={onClose} maxW={isTwoDimensional ? 'lg' : 'sm'}>
      <Flex align="center" gap="2" mb="4">
        <Text fontWeight="bold" color="white">Set final price for</Text>
        <CompanyBadge company={company} px="2" py="1" fontSize="sm" />
      </Flex>

      {isTwoDimensional ? (
        <TwoDimensionalPicker
          position={position}
          parValue={parValue}
          value={value}
          market={market}
          onChange={onChange}
          onClose={onClose}
        />
      ) : (
        <OneDimensionalPicker
          value={value}
          options={options}
          onChange={onChange}
          onClose={onClose}
        />
      )}
    </ModalBackdrop>
  );
}
