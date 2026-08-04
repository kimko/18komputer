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

// Mock dynamic import for game data using vi.mock on a helper or just intercepting fetch/import.
// Wait, we can mock a utility function if it's easier, or mock the specific JSON if we know the ID.
// For the test, let's pretend the JSON is statically imported or we mock the module.
vi.mock('../data/games/1830.json', () => ({
  default: {
    id: '1830',
    name: '1830: Railways & Robber Barons',
    parValues: [67, 71, 76, 82, 90, 100],
    companies: [
      { name: 'Pennsylvania Railroad', shortName: 'PRR', color: '#ff0000' },
      { name: 'New York Central', shortName: 'NYC', color: '#000000' }
    ]
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
    expect(await screen.findByText(/Activate Company/i)).toBeInTheDocument();
    
    // Should display the companies from 1830.json
    expect(screen.getByText('Pennsylvania Railroad (PRR)')).toBeInTheDocument();
    expect(screen.getByText('New York Central (NYC)')).toBeInTheDocument();
  });

  it('should allow activating a company, setting its par value, and saving', async () => {
    renderWithChakra(<ActivateCompany />);
    
    // Wait for load
    await screen.findByText(/Activate Company/i);
    
    // Activate PRR
    const activatePrrBtn = screen.getByRole('button', { name: /Activate PRR/i });
    fireEvent.click(activatePrrBtn);
    
    // It should auto-save with default par value (which is 67)
    await waitFor(() => {
      expect(mockApi.updateGameState).toHaveBeenCalledWith('inst_123', {
        activeCompanies: [
          { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', parValue: 67 }
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
          { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', parValue: 71 }
        ]
      });
    });
  });
});
