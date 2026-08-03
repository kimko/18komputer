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
          { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', parValue: 67 }
        ],
        companyORs: []
      }
    });
    
    mockApi.updateGameState.mockResolvedValue({});
  });

  it('should allow adding multiple trains and calculating grand total', async () => {
    renderWithChakra(<RevenueCalculator />);
    await screen.findByText(/Revenue Calculator/i);
    
    // Select company
    fireEvent.click(screen.getByRole('button', { name: /PRR/i }));

    // By default, one train panel should exist
    const numpads = screen.getAllByRole('button', { name: '40' });
    expect(numpads).toHaveLength(1);

    // Add stops to train 1
    fireEvent.click(numpads[0]); // +40
    fireEvent.click(screen.getByRole('button', { name: '50' })); // +50
    // Train 1 total: 90. Grand Total: 90.
    expect(screen.getByText(/Grand Total: \$90/)).toBeInTheDocument();

    // Copy train 1
    fireEvent.click(screen.getByRole('button', { name: /Copy Train/i }));
    
    // Now there should be two trains with 90 each, grand total 180
    expect(screen.getByText(/Grand Total: \$180/)).toBeInTheDocument();

    // Add a new empty train
    fireEvent.click(screen.getByRole('button', { name: /Add Train/i }));
    
    // Now there should be 3 numpads
    expect(screen.getAllByRole('button', { name: '40' })).toHaveLength(3);
    
    // Add 20 to train 3
    const numpads20 = screen.getAllByRole('button', { name: '20' });
    fireEvent.click(numpads20[2]); // +20
    
    // Grand total: 90 + 90 + 20 = 200
    expect(screen.getByText(/Grand Total: \$200/)).toBeInTheDocument();

    // Remove train 2
    const removeTrainBtns = screen.getAllByRole('button', { name: /Remove Train/i });
    fireEvent.click(removeTrainBtns[1]); // Remove the copied train

    // Grand total: 90 + 20 = 110
    expect(screen.getByText(/Grand Total: \$110/)).toBeInTheDocument();
  });

  it('should render a payout table and submit the operating decision', async () => {
    renderWithChakra(<RevenueCalculator />);
    await screen.findByText(/Revenue Calculator/i);
    
    fireEvent.click(screen.getByRole('button', { name: /PRR/i }));
    
    // Make total 100 for easy math
    fireEvent.click(screen.getByRole('button', { name: '100' }));
    
    // Check payout table (10% should be $10)
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('$10')).toBeInTheDocument();
    
    // Submit "Pay Out 100%"
    const payoutBtn = screen.getByRole('button', { name: /Pay Out 100%/i });
    fireEvent.click(payoutBtn);
    
    await waitFor(() => {
      expect(mockApi.updateGameState).toHaveBeenCalledWith('inst_123', {
        companyORs: [
          { companyId: 'PRR', revenue: 100, decision: 'payout' }
        ]
      });
    });
  });
});
