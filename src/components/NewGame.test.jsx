import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import NewGame from './NewGame.jsx';
import * as mockApi from '../api/mockApi.js';

const mockNavigate = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/new', mockNavigate]
}));

// Mock the API
vi.mock('../api/mockApi.js', () => ({
  createGame: vi.fn()
}));

// Mock the JSON import
vi.mock('../data/games/index.json', () => ({
  default: [
    { id: '1830', name: '1830: Railways & Robber Barons', bggId: 421 },
    { id: '1817', name: '1817: Modern Trains', bggId: 123 }
  ]
}));

const renderWithChakra = (ui) => {
  return render(
    <ChakraProvider value={defaultSystem}>
      {ui}
    </ChakraProvider>
  );
};

describe('NewGame Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the game selection and player inputs', () => {
    renderWithChakra(<NewGame />);
    
    // Check if games are rendered in a select/dropdown
    expect(screen.getByText(/1830: Railways/i)).toBeInTheDocument();
    expect(screen.getByText(/1817: Modern Trains/i)).toBeInTheDocument();

    // Check for player input
    expect(screen.getByPlaceholderText(/Player Name/i)).toBeInTheDocument();
  });

  it('should allow adding multiple players and submitting the form', async () => {
    mockApi.createGame.mockResolvedValue({ id: 'inst_123', gameId: '1830', players: ['Alice', 'Bob'] });
    
    renderWithChakra(<NewGame />);

    // Select the game
    const gameBtn = screen.getByRole('button', { name: /1830: Railways/i });
    fireEvent.click(gameBtn);

    // Add first player
    const input = screen.getByPlaceholderText(/Player Name/i);
    fireEvent.change(input, { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Player/i }));

    // Add second player
    fireEvent.change(input, { target: { value: 'Bob' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Player/i }));

    // Verify players are listed
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Start Game/i }));

    await waitFor(() => {
      expect(mockApi.createGame).toHaveBeenCalledWith('1830', ['Alice', 'Bob']);
      // Should navigate to the setup phase (Raise Funds)
      expect(mockNavigate).toHaveBeenCalledWith('/game/inst_123/setup');
    });
  });
});
