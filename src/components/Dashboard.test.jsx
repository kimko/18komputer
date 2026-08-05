import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  updateGameState: vi.fn(),
  updateGamePlayers: vi.fn()
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
        { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', parValue: 67 }
      ],
      dashboardState: {
        ors: {
          'PRR': { or1: 100, or2: 200 }
        },
        playerAssets: {
          'Alice': { cash: 50, shares: { 'PRR': 40 } },
          'Bob': { cash: 20, shares: { 'PRR': 20 } }
        },
        shareValues: {
          'PRR': 50
        }
      }
    },
    staticConfig: {
      maxOr: 3
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getGame.mockResolvedValue(JSON.parse(JSON.stringify(mockGameData)));
    updateGameState.mockResolvedValue();
  });

  it('renders the dashboard tables correctly', async () => {
    renderWithChakra(<Dashboard />);
    
    expect(await screen.findByText('Company Values & Results')).toBeInTheDocument();
    expect(screen.getAllByText(/PRR/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/OR 1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/OR 2/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/OR 3/).length).toBeGreaterThan(0);
  });

  it('calculates player holdings math correctly', async () => {
    renderWithChakra(<Dashboard />);
    await screen.findByText('Player Holdings');
    
    // Alice math: PRR price 50, shares 40%. Share value = 50 * 4 = 200
    // OR total = 300. Op income = 300 * 0.4 = 120. Net worth = 50 + 200 + 120 = 370
    // Bob math: PRR price 50, shares 20%. Share value = 50 * 2 = 100
    // Op income = 300 * 0.2 = 60. Net worth = 20 + 100 + 60 = 180

    expect(screen.getByText('$370')).toBeInTheDocument(); // Alice net worth
    expect(screen.getByText('$180')).toBeInTheDocument(); // Bob net worth
  });

  it('toggles details view', async () => {
    renderWithChakra(<Dashboard />);
    await screen.findByText('Player Holdings');
    
    const detailsButton = screen.getByText('Details');
    fireEvent.click(detailsButton);
    
    expect(screen.getByText('Hide Details')).toBeInTheDocument();
    
    // Alice details: share value 200, op income 120
    expect(screen.getAllByText('$200').length).toBeGreaterThan(1);
    expect(screen.getAllByText('$120').length).toBeGreaterThan(1);
    expect(screen.getByText('↳ Op Income')).toBeInTheDocument();
  });

  it('opens and updates via popups', async () => {
    renderWithChakra(<Dashboard />);
    await screen.findByText('Company Values & Results');
    
    // 1. Share Value Popup
    const shareValBtn = screen.getAllByRole('button', { name: '$50' })[0]; // First 50 is share value, second is cash
    fireEvent.click(shareValBtn);
    expect(screen.getByText('Set final price for')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '67' }));
    
    // 2. OR Popup
    fireEvent.click(screen.getByText('$100'));
    expect(screen.getByText('Set OR 1 revenue for')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    
    const cashBtn = screen.getByRole('button', { name: '$20' }); // Bob's cash
    fireEvent.click(cashBtn);
    expect(screen.getByText('Set cash for')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    // 4. Share Count Popup
    fireEvent.click(screen.getAllByText('40%')[0]);
    expect(screen.getByText("Set Alice's shares for")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '50%' }));
    await waitFor(() => {
      expect(updateGameState).toHaveBeenCalledTimes(1);
    }, { timeout: 2000 });
  });
});
