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

import { useRoute, useLocation } from 'wouter';
vi.mock('../hooks/useGameData.js', () => ({
  useGameData: vi.fn()
}));
import { useGameData } from '../hooks/useGameData.js';

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
    useGameData.mockReturnValue({ error: null, loading: false });
    renderWithChakra(<GameLayout><div>Child Content</div></GameLayout>);
    
    expect(screen.getByText('Child Content')).toBeInTheDocument();
    expect(screen.queryByText('Manage Companies')).not.toBeInTheDocument();
  });

  it('renders navigation when in a game route', () => {
    useRoute.mockReturnValue([true, { id: 'test-game' }]);
    useGameData.mockReturnValue({ error: null, loading: false });
    renderWithChakra(<GameLayout><div>Child Content</div></GameLayout>);
    
    expect(screen.getByText('Child Content')).toBeInTheDocument();
    
    expect(screen.getAllByText('Home').length).toBe(2);
    expect(screen.getAllByText('Manage Companies').length).toBe(1);
    expect(screen.getAllByText('Companies').length).toBe(1);
    expect(screen.getAllByText('Calculator').length).toBe(1);
    expect(screen.getAllByText('Calc').length).toBe(1);
    expect(screen.getAllByText('Results').length).toBe(2);
  });

  it('redirects to home if game does not exist in storage', () => {
    useRoute.mockReturnValue([true, { id: 'invalid-game' }]);
    useGameData.mockReturnValue({ error: new Error('Game not found'), loading: false });
    const mockNavigate = vi.fn();
    useLocation.mockReturnValue(['/', mockNavigate]);
    
    renderWithChakra(<GameLayout><div>Child Content</div></GameLayout>);
    
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('displays the game name in the navigation bar when a game is loaded', () => {
    useRoute.mockReturnValue([true, { id: 'test-game' }]);
    useGameData.mockReturnValue({
      error: null,
      loading: false,
      gameInstance: { gameName: '1830 4p Aug-06' },
      updateGameName: vi.fn(),
    });

    renderWithChakra(<GameLayout><div>Child Content</div></GameLayout>);

    expect(screen.getAllByText('1830 4p Aug-06').length).toBeGreaterThan(0);
  });
});
