import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import Dashboard from './Dashboard.jsx';

// Mock wouter
vi.mock('wouter', () => ({
  useRoute: () => [true, { id: 'test-game-123' }]
}));

// Mock API
vi.mock('../api/mockApi.js', () => ({
  getGame: vi.fn(),
  updateGameState: vi.fn()
}));
import { getGame, updateGameState } from '../api/mockApi.js';

const renderWithChakra = (ui) => {
  return render(
    <ChakraProvider value={defaultSystem}>
      {ui}
    </ChakraProvider>
  );
};

describe('Dashboard', () => {
  const mockGameData = {
    id: 'test-game-123',
    gameId: '1830',
    players: ['Alice', 'Bob'],
    state: {
      activeCompanies: [
        { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', initialValue: 67 }
      ]
    },
    staticConfig: {
      maxOr: 3
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getGame.mockResolvedValue(mockGameData);
    updateGameState.mockResolvedValue();
  });

  it('renders the dashboard tables correctly', async () => {
    renderWithChakra(<Dashboard />);
    
    // Check for sections
    expect(await screen.findByText('Company Values & Results')).toBeInTheDocument();
    
    // Check for Company row
    expect(screen.getByText('PRR')).toBeInTheDocument();
    
    // Check for OR columns based on maxOr
    expect(screen.getByText('OR 1')).toBeInTheDocument();
    expect(screen.getByText('OR 2')).toBeInTheDocument();
    expect(screen.getByText('OR 3')).toBeInTheDocument();
    
    // Check for Player columns
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });
});
