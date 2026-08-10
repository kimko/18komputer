import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import ActivateCompany from './ActivateCompany.jsx';
import * as mockApi from '../api/mockApi.js';
import { useRoute } from 'wouter';

// Mock wouter
const mockNavigate = vi.fn();
vi.mock('wouter', () => ({
  useRoute: vi.fn(),
  useLocation: () => ['/current-path', mockNavigate]
}));

// Mock API
vi.mock('../api/mockApi.js', () => ({
  getGame: vi.fn(),
  updateGameState: vi.fn()
}));

const COMPANIES = [
  { name: 'Pennsylvania Railroad', shortName: 'PRR', color: '#ff0000' },
  { name: 'New York Central', shortName: 'NYC', color: '#000000' }
];

// Mock dynamic import for game data using vi.mock on a helper or just intercepting fetch/import.
// Wait, we can mock a utility function if it's easier, or mock the specific JSON if we know the ID.
// For the test, let's pretend the JSON is statically imported or we mock the module.
vi.mock('../data/games/1830.json', () => ({
  default: {
    id: '1830',
    name: '1830: Railways & Robber Barons',
    parValues: [67, 71, 76, 82, 90, 100],
    corporateStructures: [],
    companies: COMPANIES
  }
}));

vi.mock('../data/games/1817.json', () => ({
  default: {
    id: '1817',
    name: '1817',
    parValues: [67, 71, 76, 82, 90, 100],
    corporateStructures: [0, 1, 2],
    maxPlayerHolding: 60,
    companies: COMPANIES
  }
}));

const renderWithChakra = (ui) => {
  return render(
    <ChakraProvider value={defaultSystem}>
      {ui}
    </ChakraProvider>
  );
};

describe('ActivateCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRoute.mockReturnValue([true, { id: 'inst_123' }]);

    mockApi.getGame.mockResolvedValue({
      id: 'inst_123',
      gameId: '1830',
      players: ['Alice', 'Bob'],
      state: {
        activeCompanies: []
      }
    });

    mockApi.updateGameState.mockResolvedValue({});
  });

  it('should load game data and display available companies', async () => {
    renderWithChakra(<ActivateCompany />);

    // Wait for async load
    expect(await screen.findByText(/Manage Companies/i)).toBeInTheDocument();

    // Should display the companies from 1830.json
    expect(screen.getByText('Pennsylvania Railroad (PRR)')).toBeInTheDocument();
    expect(screen.getByText('New York Central (NYC)')).toBeInTheDocument();
  });

  it('should allow activating a company, setting its par value, and saving', async () => {
    renderWithChakra(<ActivateCompany />);

    // Wait for load
    await screen.findByText(/Manage Companies/i);

    // Activate PRR
    const activatePrrBtn = screen.getAllByRole('button', { name: 'Activate' })[0];
    fireEvent.click(activatePrrBtn);

    // It should auto-save with default par value (which is 67) as a 10 share company
    await waitFor(() => {
      expect(mockApi.updateGameState).toHaveBeenCalledWith('inst_123', {
        activeCompanies: [
          { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', parValue: 67, totalShares: 10 }
        ]
      });
    });

    // Change Par Value using the touch-friendly buttons
    const par71Btn = screen.getByRole('button', { name: '71' });
    fireEvent.click(par71Btn);

    // It should auto-save the new par value
    await waitFor(() => {
      expect(mockApi.updateGameState).toHaveBeenCalledWith('inst_123', {
        activeCompanies: [
          { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', parValue: 71, totalShares: 10 }
        ]
      });
    });
  });

  it('should not offer a corporate structure when the game only has one', async () => {
    renderWithChakra(<ActivateCompany />);
    await screen.findByText(/Manage Companies/i);

    fireEvent.click(screen.getAllByRole('button', { name: 'Activate' })[0]);

    await screen.findByText('Select Initial Par Value');
    expect(screen.queryByText('Select Co. Structure')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '5 Share' })).not.toBeInTheDocument();
  });

  describe('a game with several corporate structures', () => {
    beforeEach(() => {
      mockApi.getGame.mockResolvedValue({
        id: 'inst_123',
        gameId: '1817',
        players: ['Alice', 'Bob'],
        state: { activeCompanies: [] }
      });
    });

    it('should save the picked structure without touching the par value', async () => {
      renderWithChakra(<ActivateCompany />);
      await screen.findByText(/Manage Companies/i);

      fireEvent.click(screen.getAllByRole('button', { name: 'Activate' })[0]);
      await screen.findByText('Select Co. Structure');

      fireEvent.click(screen.getByRole('button', { name: '5 Share' }));

      await waitFor(() => {
        expect(mockApi.updateGameState).toHaveBeenCalledWith('inst_123', {
          activeCompanies: [
            { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', parValue: 67, totalShares: 5 }
          ]
        });
      });
    });

    const withHoldings = (shares, totalShares = 10) => {
      mockApi.getGame.mockResolvedValue({
        id: 'inst_123',
        gameId: '1817',
        players: ['Alice', 'Bob'],
        state: {
          activeCompanies: [{ ...COMPANIES[0], parValue: 67, totalShares }],
          dashboardState: { playerAssets: { Alice: { shares: { PRR: shares } } } }
        }
      });
    };

    it('should still allow changing the structure once players hold shares', async () => {
      // 40% fits a 5 share company as neatly as it fits a 10 share one
      withHoldings(40);

      renderWithChakra(<ActivateCompany />);
      await screen.findByText('Select Co. Structure');

      // The par value is locked in once shares are out, but the structure is not
      expect(screen.queryByText('Select Initial Par Value')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '5 Share' }));

      await waitFor(() => {
        expect(mockApi.updateGameState).toHaveBeenCalledWith('inst_123', {
          activeCompanies: [
            { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', parValue: 67, totalShares: 5 }
          ]
        });
      });
    });

    it('should block a structure that cannot express what players already hold', async () => {
      // 30% is not a multiple of 20, so a 5 share company could not express it
      withHoldings(30);

      renderWithChakra(<ActivateCompany />);
      await screen.findByText('Select Co. Structure');

      expect(screen.getByRole('button', { name: '10 Share' })).toBeEnabled();
      expect(screen.getByRole('button', { name: '5 Share' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '2 Share' })).toBeDisabled();

      fireEvent.click(screen.getByRole('button', { name: '5 Share' }));
      await waitFor(() => expect(mockApi.updateGameState).not.toHaveBeenCalled());
    });

    it('should block leaving a 2 share company somebody owns outright', async () => {
      withHoldings(100, 2);

      renderWithChakra(<ActivateCompany />);
      await screen.findByText('Select Co. Structure');

      expect(screen.getByRole('button', { name: '2 Share' })).toBeEnabled();
      expect(screen.getByRole('button', { name: '10 Share' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '5 Share' })).toBeDisabled();
    });
  });
});
