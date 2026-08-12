import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import PricePickerPopup from './PricePickerPopup.jsx';

const renderWithChakra = (ui) => render(
  <ChakraProvider value={defaultSystem}>
    {ui}
  </ChakraProvider>
);

describe('PricePickerPopup Component', () => {
  const company = { shortName: 'B&O', color: 'blue.500' };
  const options = [67, 71, 76, 82, 90, 100];

  it('should render title and options', () => {
    renderWithChakra(<PricePickerPopup company={company} value={76} options={options} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Set final price for')).toBeInTheDocument();
    expect(screen.getByText('B&O')).toBeInTheDocument();

    options.forEach(opt => {
      expect(screen.getByRole('button', { name: String(opt) })).toBeInTheDocument();
    });
  });

  it('should call onChange and onClose when an option is clicked', () => {
    const handleChange = vi.fn();
    const handleClose = vi.fn();
    renderWithChakra(<PricePickerPopup company={company} value={76} options={options} onChange={handleChange} onClose={handleClose} />);

    fireEvent.click(screen.getByRole('button', { name: '90' }));
    expect(handleChange).toHaveBeenCalledWith(90, null);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should clear value when C is clicked', () => {
    const handleChange = vi.fn();
    renderWithChakra(<PricePickerPopup company={company} value={76} options={options} onChange={handleChange} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    expect(handleChange).toHaveBeenCalledWith('', null);
  });

  it('should navigate to previous value when ← is clicked, and stay open', () => {
    const handleChange = vi.fn();
    const handleClose = vi.fn();
    renderWithChakra(<PricePickerPopup company={company} value={76} options={options} onChange={handleChange} onClose={handleClose} />);

    fireEvent.click(screen.getByRole('button', { name: '←' }));
    // 76 is at index 2, so previous is 71 (index 1)
    expect(handleChange).toHaveBeenCalledWith(71, null);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('should navigate to next value when → is clicked, and stay open', () => {
    const handleChange = vi.fn();
    const handleClose = vi.fn();
    renderWithChakra(<PricePickerPopup company={company} value={76} options={options} onChange={handleChange} onClose={handleClose} />);

    fireEvent.click(screen.getByRole('button', { name: '→' }));
    // 76 is at index 2, so next is 82 (index 3)
    expect(handleChange).toHaveBeenCalledWith(82, null);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('should step repeatedly without reopening', () => {
    const handleChange = vi.fn();
    renderWithChakra(<PricePickerPopup company={company} value={76} options={options} onChange={handleChange} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '→' }));
    fireEvent.click(screen.getByRole('button', { name: '→' }));

    expect(handleChange).toHaveBeenNthCalledWith(1, 82, null);
    expect(handleChange).toHaveBeenNthCalledWith(2, 90, null);
  });

  it('should fallback to first option if arrows are clicked and value is invalid', () => {
    const handleChange = vi.fn();
    renderWithChakra(<PricePickerPopup company={company} value="" options={options} onChange={handleChange} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '→' }));
    expect(handleChange).toHaveBeenCalledWith(options[0], null);
  });

  it('should close when X is clicked', () => {
    const handleClose = vi.fn();
    renderWithChakra(<PricePickerPopup company={company} value={76} options={options} onChange={vi.fn()} onClose={handleClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'X' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('PricePickerPopup on a two dimensional market', () => {
  const company = { shortName: 'B&O', color: 'blue.500' };
  const market = {
    type: '2d',
    grid: [
      ['60y', '67', '71', '76p'],
      ['53y', '60y', '66', '70'],
      ['', '40o', '50y'],
      ['', '20b', '30b']
    ]
  };

  const renderMarket = (props = {}) => {
    const handleChange = vi.fn();
    const handleClose = vi.fn();
    renderWithChakra(
      <PricePickerPopup
        company={company}
        value={70}
        position={[1, 3]}
        parValue={76}
        market={market}
        options={[]}
        onChange={handleChange}
        onClose={handleClose}
        {...props}
      />
    );
    return { handleChange, handleClose };
  };

  it('draws the grid and marks where the company is standing', () => {
    renderMarket();
    expect(screen.getByTestId('market-cell-0-0')).toHaveTextContent('60');
    expect(screen.getByTestId('market-cell-1-3')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('market-cell-0-0')).not.toHaveAttribute('aria-current', 'true');
  });

  it('leaves no button where the grid has no cell', () => {
    renderMarket();
    expect(screen.queryByTestId('market-cell-2-0')).not.toBeInTheDocument();
  });

  it('works out where the company is standing when no position is stored', () => {
    renderMarket({ position: null, value: 76, parValue: 76 });
    expect(screen.getByTestId('market-cell-0-3')).toHaveAttribute('aria-current', 'true');
  });

  it('moves up a row when it runs off the end of a row, and stays open', () => {
    const { handleChange, handleClose } = renderMarket();

    fireEvent.click(screen.getByRole('button', { name: 'Move right' }));

    expect(handleChange).toHaveBeenCalledWith(76, [0, 3]);
    expect(handleClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('market-cell-0-3')).toHaveAttribute('aria-current', 'true');
  });

  it('moves down a row when it is already at the left edge', () => {
    const { handleChange } = renderMarket({ position: [0, 0], value: 60 });

    fireEvent.click(screen.getByRole('button', { name: 'Move left' }));

    expect(handleChange).toHaveBeenCalledWith(53, [1, 0]);
  });

  it('steps repeatedly, so a three share sale is three presses', () => {
    const { handleChange } = renderMarket({ position: [0, 1], value: 67 });

    const down = screen.getByRole('button', { name: 'Move down' });
    fireEvent.click(down);
    fireEvent.click(down);

    expect(handleChange).toHaveBeenNthCalledWith(1, 60, [1, 1]);
    expect(handleChange).toHaveBeenNthCalledWith(2, 40, [2, 1]);
  });

  it('disables an arrow that would hit a ledge', () => {
    renderMarket({ position: [1, 3], value: 70 });
    expect(screen.getByRole('button', { name: 'Move down' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move right' })).toBeEnabled();
  });

  it('disables both up and right at the top of the market', () => {
    renderMarket({ position: [0, 3], value: 76 });
    expect(screen.getByRole('button', { name: 'Move up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move right' })).toBeDisabled();
  });

  it('sets the price and closes when a cell is tapped', () => {
    const { handleChange, handleClose } = renderMarket();

    fireEvent.click(screen.getByTestId('market-cell-3-2'));

    expect(handleChange).toHaveBeenCalledWith(30, [3, 2]);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
