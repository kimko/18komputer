import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import ResumeGame from './ResumeGame.jsx';
import * as mockApi from '../api/mockApi.js';

const mockNavigate = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => ['/current-path', mockNavigate]
}));

vi.mock('../api/mockApi.js', () => ({
  getGamesList: vi.fn()
}));

const renderWithChakra = (ui) => {
  return render(
    <ChakraProvider value={defaultSystem}>
      {ui}
    </ChakraProvider>
  );
};

describe('ResumeGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an empty state when there are no games', async () => {
    mockApi.getGamesList.mockResolvedValue([]);
    
    renderWithChakra(<ResumeGame />);
    
    await waitFor(() => {
      expect(screen.getByText('No active games found.')).toBeInTheDocument();
    });
  });

  it('renders a list of games and navigates on click', async () => {
    const mockGames = [
      {
        id: 'game_123_456',
        gameId: '1830',
        createdAt: '2026-08-04T12:00:00Z',
        players: ['Alice', 'Bob']
      }
    ];
    
    mockApi.getGamesList.mockResolvedValue(mockGames);
    
    renderWithChakra(<ResumeGame />);
    
    await waitFor(() => {
      expect(screen.getByText('1830')).toBeInTheDocument();
      expect(screen.getByText('#456')).toBeInTheDocument();
      expect(screen.getByText('2 Players')).toBeInTheDocument();
    });

    // Click the game card
    const card = screen.getByText('1830').closest('div').parentElement;
    fireEvent.click(card);

    expect(mockNavigate).toHaveBeenCalledWith('/game/game_123_456/dashboard');
  });

  it('navigates back to menu when Back button is clicked', async () => {
    mockApi.getGamesList.mockResolvedValue([]);
    
    renderWithChakra(<ResumeGame />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Back to Menu' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back to Menu' }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
