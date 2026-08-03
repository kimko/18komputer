import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import RevenueCalculator from './RevenueCalculator.jsx';
import * as mockApi from '../api/mockApi.js';
import { useRoute } from 'wouter';

const mockNavigate = vi.fn();
vi.mock('wouter', () => ({
  useRoute: vi.fn(),
  useLocation: () => ['/current-path', mockNavigate]
}));

vi.mock('../api/mockApi.js', () => ({
  getGame: vi.fn(),
  updateGameState: vi.fn()
}));

const renderWithChakra = (ui) => {
  return render(
    <ChakraProvider value={defaultSystem}>
      {ui}
    </ChakraProvider>
  );
};

describe('RevenueCalculator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRoute.mockReturnValue([true, { id: 'inst_123' }]);
    
    mockApi.getGame.mockResolvedValue({
      id: 'inst_123',
      gameId: '1830',
      players: ['Alice', 'Bob'],
      state: {
        activeCompanies: [
          { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', parValue: 67 },
          { shortName: 'NYC', name: 'New York Central', color: '#000000', parValue: 71 }
        ],
        companyORs: []
      }
    });
    
    mockApi.updateGameState.mockResolvedValue({});
  });

  it('should load active companies and allow calculating revenue', async () => {
    renderWithChakra(<RevenueCalculator />);
    
    // Wait for load
    expect(await screen.findByText(/Revenue Calculator/i)).toBeInTheDocument();
    
    // Should display active companies as touch-friendly buttons for selection
    const prrBtn = screen.getByRole('button', { name: /PRR/i });
    expect(prrBtn).toBeInTheDocument();
    
    // Select PRR
    fireEvent.click(prrBtn);
    
    // Add stops: 40 + 50 + 20
    fireEvent.click(screen.getByRole('button', { name: '40' }));
    fireEvent.click(screen.getByRole('button', { name: '50' }));
    fireEvent.click(screen.getByRole('button', { name: '20' }));
    
    // Total should be 110
    expect(screen.getByText('Total: $110')).toBeInTheDocument();
    
    // Submit Revenue
    const submitBtn = screen.getByRole('button', { name: /Submit Revenue/i });
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(mockApi.updateGameState).toHaveBeenCalledWith('inst_123', {
        companyORs: [
          { companyId: 'PRR', revenue: 110 }
        ]
      });
      // Should clear the calculator after submission
      expect(screen.getByText('Total: $0')).toBeInTheDocument();
    });
  });

  it('should allow clearing the current calculation', async () => {
    renderWithChakra(<RevenueCalculator />);
    await screen.findByText(/Revenue Calculator/i);
    
    fireEvent.click(screen.getByRole('button', { name: /PRR/i }));
    fireEvent.click(screen.getByRole('button', { name: '30' }));
    expect(screen.getByText('Total: $30')).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button', { name: /Clear/i }));
    expect(screen.getByText('Total: $0')).toBeInTheDocument();
  });
});
