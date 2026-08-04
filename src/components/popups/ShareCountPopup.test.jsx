import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import ShareCountPopup from './ShareCountPopup.jsx';

const renderWithChakra = (ui) => render(
  <ChakraProvider value={defaultSystem}>
    {ui}
  </ChakraProvider>
);

describe('ShareCountPopup Component', () => {
  const company = { shortName: 'NYC', color: 'black' };

  it('should render title and options up to maxAvailable', () => {
    renderWithChakra(<ShareCountPopup company={company} player="Player 1" value={20} maxAvailable={40} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Set Player 1's shares for")).toBeInTheDocument();
    expect(screen.getByText('NYC')).toBeInTheDocument();
    
    // 0, 10, 20, 30, 40 should be rendered
    [0, 10, 20, 30, 40].forEach(opt => {
      expect(screen.getByRole('button', { name: `${opt}%` })).toBeInTheDocument();
    });
    
    // 50 should not be rendered
    expect(screen.queryByRole('button', { name: '50%' })).not.toBeInTheDocument();
  });

  it('should call onChange and onClose when an option is clicked', () => {
    const handleChange = vi.fn();
    const handleClose = vi.fn();
    renderWithChakra(<ShareCountPopup company={company} player="Player 1" value={20} maxAvailable={40} onChange={handleChange} onClose={handleClose} />);
    
    fireEvent.click(screen.getByRole('button', { name: '30%' }));
    expect(handleChange).toHaveBeenCalledWith(30);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should close when background is clicked', () => {
    const handleClose = vi.fn();
    const { container } = renderWithChakra(<ShareCountPopup company={company} player="Player 1" value={20} maxAvailable={40} onChange={vi.fn()} onClose={handleClose} />);
    
    // the backdrop is the first child
    fireEvent.click(container.firstChild);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
