import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import RaiseFunds from './RaiseFunds.jsx';
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

describe('RaiseFunds Component', () => {
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
    renderWithChakra(<RaiseFunds />);
    
    // Wait for async load
    expect(await screen.findByText(/Raise Funds/i)).toBeInTheDocument();
    
    // Should display the companies from 1830.json
    expect(screen.getByText('Pennsylvania Railroad (PRR)')).toBeInTheDocument();
    expect(screen.getByText('New York Central (NYC)')).toBeInTheDocument();
  });

  it('should allow activating a company, setting its par value, and saving', async () => {
    renderWithChakra(<RaiseFunds />);
    
    // Wait for load
    await screen.findByText(/Raise Funds/i);
    
    // Find the toggle/checkbox for PRR and activate it
    // Assuming we have a button or checkbox to activate
    const activatePrrBtn = screen.getByRole('button', { name: /Activate PRR/i });
    fireEvent.click(activatePrrBtn);
    
    // After activating, a select for Par Value should appear (or be enabled)
    // We'll select 67 as the par value
    const parSelects = screen.getAllByRole('combobox', { name: /Par Value/i });
    fireEvent.change(parSelects[0], { target: { value: '67' } });
    
    // Submit the form
    const saveBtn = screen.getByRole('button', { name: /Complete Setup/i });
    fireEvent.click(saveBtn);
    
    await waitFor(() => {
      expect(mockApi.updateGameState).toHaveBeenCalledWith('inst_123', {
        activeCompanies: [
          { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', parValue: 67 }
        ]
      });
      expect(mockNavigate).toHaveBeenCalledWith('/game/inst_123/dashboard');
    });
  });
});
