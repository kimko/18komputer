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

vi.mock('../data/games/1830.json', () => ({
  default: { id: '1830', name: '1830', corporateStructures: [] }
}));

vi.mock('../data/games/1817.json', () => ({
  default: { id: '1817', name: '1817', corporateStructures: [0, 1, 2], maxPlayerHolding: 60 }
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

  it('names the selected company at the top, and swaps it when you switch', async () => {
    mockApi.getGame.mockResolvedValue({
      id: 'inst_123',
      gameId: '1830',
      players: ['Alice', 'Bob'],
      state: {
        activeCompanies: [
          { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', parValue: 67 },
          { shortName: 'NYC', name: 'New York Central', color: '#000000', parValue: 67 }
        ],
        companyORs: []
      }
    });

    renderWithChakra(<RevenueCalculator />);
    await screen.findByText(/Grand Total/i);

    // The first company is selected on load
    expect(await screen.findByTestId('selected-company-name')).toHaveTextContent('Pennsylvania Railroad');

    fireEvent.click(screen.getByRole('button', { name: /NYC/i }));
    expect(screen.getByTestId('selected-company-name')).toHaveTextContent('New York Central');
  });

  it('numbers each train so they can be told apart', async () => {
    renderWithChakra(<RevenueCalculator />);
    await screen.findByText(/Grand Total/i);

    fireEvent.click(screen.getByRole('button', { name: /PRR/i }));
    expect(screen.getAllByText('Train')).toHaveLength(1);
    expect(screen.getByText('1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Copy$/i }));

    expect(screen.getAllByText('Train')).toHaveLength(2);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should allow adding multiple trains and calculating grand total', async () => {
    renderWithChakra(<RevenueCalculator />);
    await screen.findByText(/Grand Total/i);
    
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
    fireEvent.click(screen.getByRole('button', { name: /^Copy$/i }));
    
    // Now there should be two trains with 90 each, grand total 180
    expect(screen.getByText(/Grand Total: \$180/)).toBeInTheDocument();

    // Add an empty train by copying and clearing
    const copyTrainBtns = screen.getAllByRole('button', { name: /^Copy$/i });
    fireEvent.click(copyTrainBtns[1]); // Copy train 2
    
    // Now there should be 3 numpads
    expect(screen.getAllByRole('button', { name: '40' })).toHaveLength(3);

    // Clear train 3
    const clearBtns = screen.getAllByRole('button', { name: /^Clear$/i });
    fireEvent.click(clearBtns[2]); // Clear train 3
    
    // Add 20 to train 3
    const numpads20 = screen.getAllByRole('button', { name: '20' });
    fireEvent.click(numpads20[2]); // +20
    
    // Grand total: 90 + 90 + 20 = 200
    expect(screen.getByText(/Grand Total: \$200/)).toBeInTheDocument();

    // Exclude train 1
    const excludeBtns = screen.getAllByRole('button', { name: /Exclude/i });
    fireEvent.click(excludeBtns[0]);
    
    // Grand total: (90 excluded) + 90 + 20 = 110
    expect(screen.getByText(/Grand Total: \$110/)).toBeInTheDocument();

    // Re-include train 1
    const includeBtns = screen.getAllByRole('button', { name: /^Exclude$/i });
    fireEvent.click(includeBtns[0]);
    
    // Grand total back to 200
    expect(screen.getByText(/Grand Total: \$200/)).toBeInTheDocument();

    // Remove train 2
    const removeTrainBtns = screen.getAllByRole('button', { name: /^Remove$/i });
    fireEvent.click(removeTrainBtns[1]); // Remove the copied train

    // Grand total: 90 + 20 = 110
    expect(screen.getByText(/Grand Total: \$110/)).toBeInTheDocument();
  });

  it('should render a payout table and submit the operating decision', async () => {
    renderWithChakra(<RevenueCalculator />);
    await screen.findByText(/Grand Total/i);
    
    fireEvent.click(screen.getByRole('button', { name: /PRR/i }));
    
    // Make total 100 for easy math
    fireEvent.click(screen.getByRole('button', { name: '100' }));
    
    // Check payout table (10% should be $10 on full pay)
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('$10')).toBeInTheDocument();
    
    // Toggle to Half Pay
    const halfPayToggle = screen.getByRole('button', { name: /Half Pay/i });
    fireEvent.click(halfPayToggle);
    
    // Check payout table updates (10% of 50 should be $5)
    expect(screen.getByText('$5')).toBeInTheDocument();
  });

  it('rounds a 10-share half pay up to the next whole dollar per share', async () => {
    renderWithChakra(<RevenueCalculator />);
    await screen.findByText(/Grand Total/i);

    fireEvent.click(screen.getByRole('button', { name: /PRR/i }));

    // A $190 run: half is $95, which is $9.50 across 10 shares
    fireEvent.click(screen.getByRole('button', { name: '100' }));
    fireEvent.click(screen.getByRole('button', { name: '90' }));
    expect(screen.getByText(/Grand Total: \$190/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Half Pay' }));

    expect(screen.getByText('$10')).toBeInTheDocument();
    expect(screen.getByText(/\$10 per share .* \$90 stays with the company/)).toBeInTheDocument();
  });

  it('shows one column per share for a 5-share company', async () => {
    mockApi.getGame.mockResolvedValue({
      id: 'inst_123',
      gameId: '1817',
      players: ['Alice', 'Bob'],
      state: {
        activeCompanies: [
          { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', parValue: 67 }
        ],
        companyORs: []
      }
    });

    renderWithChakra(<RevenueCalculator />);
    await screen.findByText(/Grand Total/i);

    fireEvent.click(screen.getByRole('button', { name: /PRR/i }));
    fireEvent.click(screen.getByRole('button', { name: '100' }));
    fireEvent.click(screen.getByRole('button', { name: '90' }));

    fireEvent.click(screen.getByRole('button', { name: '5 Share' }));

    // Five columns of 20% each, so no 10% column any more
    expect(screen.queryByText('10%')).not.toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    // Full pay: $190 over 5 shares is $38 each
    expect(screen.getByText('$38')).toBeInTheDocument();
    expect(screen.getByText(/\$38 per share .* \$0 stays with the company/)).toBeInTheDocument();

    // Half pay divides evenly: $95 over 5 shares is $19 each
    fireEvent.click(screen.getByRole('button', { name: 'Half Pay' }));
    expect(screen.getByText('$19')).toBeInTheDocument();
    expect(screen.getByText(/\$19 per share .* \$95 stays with the company/)).toBeInTheDocument();
  });

  it('keeps the corporate structure per company and saves it on the company', async () => {
    mockApi.getGame.mockResolvedValue({
      id: 'inst_123',
      gameId: '1817',
      players: ['Alice', 'Bob'],
      state: {
        activeCompanies: [
          { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', parValue: 67 },
          { shortName: 'NYC', name: 'New York Central', color: '#000000', parValue: 67 }
        ],
        companyORs: []
      }
    });

    renderWithChakra(<RevenueCalculator />);
    await screen.findByText(/Grand Total/i);

    fireEvent.click(screen.getByRole('button', { name: /PRR/i }));
    fireEvent.click(screen.getByRole('button', { name: '5 Share' }));
    expect(screen.queryByText('10%')).not.toBeInTheDocument();

    // The choice belongs to the company, so the Manage Companies screen sees it too
    await waitFor(() => {
      expect(mockApi.updateGameState).toHaveBeenCalledWith('inst_123', {
        activeCompanies: [
          { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', parValue: 67, totalShares: 5 },
          { shortName: 'NYC', name: 'New York Central', color: '#000000', parValue: 67 }
        ]
      });
    });

    // NYC has not been touched, so it falls back to 10 shares
    fireEvent.click(screen.getByRole('button', { name: /NYC/i }));
    expect(screen.getByText('10%')).toBeInTheDocument();

    // PRR still remembers
    fireEvent.click(screen.getByRole('button', { name: /PRR/i }));
    expect(screen.queryByText('10%')).not.toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('blocks a structure that cannot express what players already hold', async () => {
    mockApi.getGame.mockResolvedValue({
      id: 'inst_123',
      gameId: '1817',
      players: ['Alice', 'Bob'],
      state: {
        activeCompanies: [
          { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', parValue: 67, totalShares: 10 }
        ],
        dashboardState: { playerAssets: { Alice: { shares: { PRR: 30 } } } },
        companyORs: []
      }
    });

    renderWithChakra(<RevenueCalculator />);
    await screen.findByText(/Grand Total/i);

    fireEvent.click(screen.getByRole('button', { name: /PRR/i }));

    expect(screen.getByRole('button', { name: '10 Share' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '5 Share' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '2 Share' })).toBeDisabled();
  });

  it('drops the payout table for a 2-share company and splits half pay evenly', async () => {
    mockApi.getGame.mockResolvedValue({
      id: 'inst_123',
      gameId: '1817',
      players: ['Alice', 'Bob'],
      state: {
        activeCompanies: [
          { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', parValue: 67, totalShares: 2 }
        ],
        companyORs: []
      }
    });

    renderWithChakra(<RevenueCalculator />);
    await screen.findByText(/Grand Total/i);

    fireEvent.click(screen.getByRole('button', { name: /PRR/i }));
    fireEvent.click(screen.getByRole('button', { name: '100' }));
    fireEvent.click(screen.getByRole('button', { name: '90' }));

    // No table at all, so no percentage columns
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();

    expect(screen.getByText(/\$190 to the shareholder .* \$0 stays with the company/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Half Pay' }));
    expect(screen.getByText(/\$95 to the shareholder .* \$95 stays with the company/)).toBeInTheDocument();
  });

  it('starts on the structure already saved on the company', async () => {
    mockApi.getGame.mockResolvedValue({
      id: 'inst_123',
      gameId: '1817',
      players: ['Alice', 'Bob'],
      state: {
        activeCompanies: [
          { shortName: 'PRR', name: 'Pennsylvania Railroad', color: '#ff0000', parValue: 67, totalShares: 5 }
        ],
        companyORs: []
      }
    });

    renderWithChakra(<RevenueCalculator />);
    await screen.findByText(/Grand Total/i);

    fireEvent.click(screen.getByRole('button', { name: /PRR/i }));
    fireEvent.click(screen.getByRole('button', { name: '100' }));

    // Five shares of 20% each, $20 apiece, without anyone touching the toggle
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.queryByText('10%')).not.toBeInTheDocument();
    expect(screen.getByText('$20')).toBeInTheDocument();
  });

  it('offers no structure buttons when the game only has one', async () => {
    renderWithChakra(<RevenueCalculator />);
    await screen.findByText(/Grand Total/i);

    fireEvent.click(screen.getByRole('button', { name: /PRR/i }));

    expect(screen.queryByRole('button', { name: '10 Share' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '5 Share' })).not.toBeInTheDocument();
  });
});
