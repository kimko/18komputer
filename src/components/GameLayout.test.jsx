import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import GameLayout from './GameLayout.jsx';

// Mock wouter
vi.mock('wouter', () => ({
  useRoute: vi.fn(),
  useLocation: vi.fn(() => ['/', vi.fn()]),
  Link: ({ children, href }) => <a href={href}>{children}</a>,
}));

import { useRoute } from 'wouter';

const renderWithChakra = (ui) => {
  return render(
    <ChakraProvider value={defaultSystem}>
      {ui}
    </ChakraProvider>
  );
};

describe('GameLayout', () => {
  it('renders children without navigation when not in a game route', () => {
    useRoute.mockReturnValue([false, null]);
    renderWithChakra(<GameLayout><div>Child Content</div></GameLayout>);
    
    expect(screen.getByText('Child Content')).toBeInTheDocument();
    expect(screen.queryByText('Activate Company')).not.toBeInTheDocument();
  });

  it('renders navigation when in a game route', () => {
    useRoute.mockReturnValue([true, { id: 'test-game' }]);
    renderWithChakra(<GameLayout><div>Child Content</div></GameLayout>);
    
    expect(screen.getByText('Child Content')).toBeInTheDocument();
    
    expect(screen.getAllByText('Activate Company').length).toBe(1);
    expect(screen.getAllByText('Company').length).toBe(1);
    expect(screen.getAllByText('Calculator').length).toBe(1);
    expect(screen.getAllByText('Calc').length).toBe(1);
    expect(screen.getAllByText('Results').length).toBe(2);
  });
});
