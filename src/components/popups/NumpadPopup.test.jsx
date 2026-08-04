import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import NumpadPopup from './NumpadPopup.jsx';

const renderWithChakra = (ui) => render(
  <ChakraProvider value={defaultSystem}>
    {ui}
  </ChakraProvider>
);

describe('NumpadPopup Component', () => {
  it('should render title and subtitle', () => {
    renderWithChakra(<NumpadPopup title="Set value for" subtitle="PRR" value="" onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Set value for')).toBeInTheDocument();
    expect(screen.getByText('PRR')).toBeInTheDocument();
  });

  it('should format and display initial value', () => {
    renderWithChakra(<NumpadPopup title="Set value" subtitle="PRR" value={1234} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('should append digits when clicked', () => {
    const handleChange = vi.fn();
    renderWithChakra(<NumpadPopup title="Set value" subtitle="PRR" value="" onChange={handleChange} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    expect(handleChange).toHaveBeenCalledWith('5');
  });

  it('should append multiple digits correctly when value exists', () => {
    const handleChange = vi.fn();
    renderWithChakra(<NumpadPopup title="Set value" subtitle="PRR" value={5} onChange={handleChange} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    expect(handleChange).toHaveBeenCalledWith('50');
  });

  it('should clear value when C is clicked', () => {
    const handleChange = vi.fn();
    renderWithChakra(<NumpadPopup title="Set value" subtitle="PRR" value={100} onChange={handleChange} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('should handle backspace/delete', () => {
    const handleChange = vi.fn();
    renderWithChakra(<NumpadPopup title="Set value" subtitle="PRR" value={100} onChange={handleChange} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '⌫' }));
    expect(handleChange).toHaveBeenCalledWith('10');
  });

  it('should close when OK is clicked', () => {
    const handleClose = vi.fn();
    renderWithChakra(<NumpadPopup title="Set value" subtitle="PRR" value={100} onChange={vi.fn()} onClose={handleClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
    
    // Background click test might be tricky without specific data-testid, but it is bound to the root element.
  });

  it('should call onSubtitleClick when subtitle is clicked', () => {
    const handleSubtitleClick = vi.fn();
    renderWithChakra(<NumpadPopup title="Set value" subtitle="PRR" value={100} onChange={vi.fn()} onClose={vi.fn()} onSubtitleClick={handleSubtitleClick} />);
    fireEvent.click(screen.getByText('PRR'));
    expect(handleSubtitleClick).toHaveBeenCalledTimes(1);
  });
  
  it('should display and call onCopyLast when provided', () => {
    const handleCopyLast = vi.fn();
    renderWithChakra(<NumpadPopup title="Set value" subtitle="PRR" value={100} onChange={vi.fn()} onClose={vi.fn()} onCopyLast={handleCopyLast} />);
    const copyBtn = screen.getByRole('button', { name: 'Copy Prev' });
    expect(copyBtn).toBeInTheDocument();
    fireEvent.click(copyBtn);
    expect(handleCopyLast).toHaveBeenCalledTimes(1);
  });
});
