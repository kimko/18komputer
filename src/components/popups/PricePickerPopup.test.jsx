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
    expect(handleChange).toHaveBeenCalledWith(90);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should clear value when C is clicked', () => {
    const handleChange = vi.fn();
    renderWithChakra(<PricePickerPopup company={company} value={76} options={options} onChange={handleChange} onClose={vi.fn()} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('should navigate to previous value when ← is clicked', () => {
    const handleChange = vi.fn();
    const handleClose = vi.fn();
    renderWithChakra(<PricePickerPopup company={company} value={76} options={options} onChange={handleChange} onClose={handleClose} />);
    
    fireEvent.click(screen.getByRole('button', { name: '←' }));
    // 76 is at index 2, so previous is 71 (index 1)
    expect(handleChange).toHaveBeenCalledWith(71);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should navigate to next value when → is clicked', () => {
    const handleChange = vi.fn();
    const handleClose = vi.fn();
    renderWithChakra(<PricePickerPopup company={company} value={76} options={options} onChange={handleChange} onClose={handleClose} />);
    
    fireEvent.click(screen.getByRole('button', { name: '→' }));
    // 76 is at index 2, so next is 82 (index 3)
    expect(handleChange).toHaveBeenCalledWith(82);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
  
  it('should fallback to first option if arrows are clicked and value is invalid', () => {
    const handleChange = vi.fn();
    renderWithChakra(<PricePickerPopup company={company} value="" options={options} onChange={handleChange} onClose={vi.fn()} />);
    
    fireEvent.click(screen.getByRole('button', { name: '→' }));
    expect(handleChange).toHaveBeenCalledWith(options[0]);
  });

  it('should close when X is clicked', () => {
    const handleClose = vi.fn();
    renderWithChakra(<PricePickerPopup company={company} value={76} options={options} onChange={vi.fn()} onClose={handleClose} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'X' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
