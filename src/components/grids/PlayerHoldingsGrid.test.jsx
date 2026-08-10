import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import PlayerHoldingsGrid from './PlayerHoldingsGrid';

const mockDashboardState = {
  playerAssets: {
    'Alice': { cash: 500, shares: { 'PRR': 20 } },
    'Bob': { cash: 300, shares: { 'PRR': 40 } }
  },
  shareValues: {
    'PRR': 100
  },
  ors: {
    'PRR': { or1: 50 }
  }
};

const mockActiveCompanies = [
  { shortName: 'PRR', color: '#ff0000' }
];

const mockPlayers = ['Alice', 'Bob'];

const renderComponent = (props = {}) => {
  return render(
    <ChakraProvider value={defaultSystem}>
      <PlayerHoldingsGrid 
        players={mockPlayers}
        activeCompanies={mockActiveCompanies}
        maxOr={1}
        dashboardState={mockDashboardState}
        updatePlayers={vi.fn()}
        setActivePopup={vi.fn()}
        {...props}
      />
    </ChakraProvider>
  );
};

describe('PlayerHoldingsGrid', () => {
  it('renders player names and bank', () => {
    renderComponent();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Bank')).toBeInTheDocument();
  });

  it('calculates player metrics correctly', () => {
    renderComponent();
    // Verify cash values are rendered
    expect(screen.getByText('$500')).toBeInTheDocument(); // Alice cash
    expect(screen.getByText('$300')).toBeInTheDocument(); // Bob cash
  });

  it('toggles details', () => {
    renderComponent();

    // Details are hidden initially. The toggle button text should be 'Details'
    const detailsBtn = screen.getByText('Details');
    expect(screen.queryByText('↳ Share Value')).not.toBeInTheDocument();
    expect(screen.queryByText(/↳ Shares/)).not.toBeInTheDocument();

    fireEvent.click(detailsBtn);
    expect(screen.getAllByText('↳ Share Value')[0]).toBeInTheDocument();
  });

  it('names the corporate structure on the shares row', () => {
    // A company saved before structures existed still reads as 10
    renderComponent();
    fireEvent.click(screen.getByText('Details'));
    expect(screen.getByText('↳ Shares 10')).toBeInTheDocument();
  });

  it('names a 2-share structure on the shares row', () => {
    renderComponent({
      activeCompanies: [{ shortName: 'PRR', color: '#ff0000', totalShares: 2 }],
      dashboardState: {
        ...mockDashboardState,
        playerAssets: { Alice: { cash: 0, shares: { PRR: 100 } }, Bob: { cash: 0, shares: {} } }
      }
    });
    fireEvent.click(screen.getByText('Details'));
    expect(screen.getByText('↳ Shares 2')).toBeInTheDocument();
  });

  it('handles adding players', () => {
    const updatePlayers = vi.fn();

    renderComponent({ updatePlayers });

    const input = screen.getByPlaceholderText('New player...');
    fireEvent.change(input, { target: { value: 'Charlie' } });

    fireEvent.click(screen.getByText('Add'));
    expect(updatePlayers).toHaveBeenCalledWith(['Alice', 'Bob', 'Charlie']);
  });

  describe('removing a player', () => {
    // Alice holds shares and cash; Cara holds nothing at all.
    const withEmptyPlayer = {
      players: ['Alice', 'Bob', 'Cara'],
      dashboardState: {
        ...mockDashboardState,
        playerAssets: { ...mockDashboardState.playerAssets, Cara: { cash: 0, shares: {} } }
      }
    };

    it('removes a player holding nothing without asking', () => {
      const updatePlayers = vi.fn();
      renderComponent({ ...withEmptyPlayer, updatePlayers });

      fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[2]);

      expect(updatePlayers).toHaveBeenCalledWith(['Alice', 'Bob']);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('asks before removing a player who holds something', () => {
      const updatePlayers = vi.fn();
      renderComponent({ updatePlayers });

      fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(updatePlayers).not.toHaveBeenCalled();
    });

    it('names the shares and the cash that would be lost', () => {
      renderComponent();

      fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

      // Alice holds 20% of a 10-share company, so 2 shares, and $500
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveTextContent('Alice');
      expect(dialog).toHaveTextContent('2 shares');
      expect(dialog).toHaveTextContent('$500');
    });

    it('keeps the player when the confirm is cancelled', () => {
      const updatePlayers = vi.fn();
      renderComponent({ updatePlayers });

      fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(updatePlayers).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('removes the player when the confirm is accepted', () => {
      const updatePlayers = vi.fn();
      renderComponent({ updatePlayers });

      fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Remove player' }));

      expect(updatePlayers).toHaveBeenCalledWith(['Bob']);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // Cells are read by testid so the assertions name the row and the player, rather than
  // counting how often a bare digit happens to appear anywhere in the grid.
  const cells = (testId) => screen.getAllByTestId(testId).map(el => el.textContent);

  it('counts shares by the corporate structure', () => {
    // Alice 20% and Bob 40% of a 5-share company are 1 and 2 shares, leaving 2 in the bank
    renderComponent({ activeCompanies: [{ shortName: 'PRR', color: '#ff0000', totalShares: 5 }] });

    expect(cells('total-shares')).toEqual(['1', '2']);

    fireEvent.click(screen.getByText('Details'));

    expect(screen.getByText('↳ Shares 5')).toBeInTheDocument();
    expect(cells('company-shares-PRR')).toEqual(['1', '2']);
  });

  it('counts a 10-share company in tenths', () => {
    // The same percentages in a ten-share company are twice as many shares
    renderComponent();

    expect(cells('total-shares')).toEqual(['2', '4']);

    fireEvent.click(screen.getByText('Details'));
    expect(cells('company-shares-PRR')).toEqual(['2', '4']);
  });

  it('adds a player up across companies of different structures', () => {
    renderComponent({
      activeCompanies: [
        { shortName: 'PRR', color: '#ff0000', totalShares: 10 },
        { shortName: 'NYC', color: '#000000', totalShares: 5 }
      ],
      dashboardState: {
        ...mockDashboardState,
        shareValues: { PRR: 100, NYC: 100 },
        playerAssets: {
          Alice: { cash: 0, shares: { PRR: 40, NYC: 20 } }, // 4 + 1
          Bob: { cash: 0, shares: { NYC: 60 } }             // 3
        }
      }
    });

    expect(cells('total-shares')).toEqual(['5', '3']);
  });

  it('triggers popups for cash and shares', () => {
    const setActivePopup = vi.fn();
    renderComponent({ setActivePopup });
    
    // Click Alice Cash (500)
    fireEvent.click(screen.getByText('$500'));
    expect(setActivePopup).toHaveBeenCalledWith({ type: 'cash', player: 'Alice' });
    
    // Click Alice PRR shares (20%)
    fireEvent.click(screen.getByText('20%'));
    expect(setActivePopup).toHaveBeenCalledWith({ type: 'shares', player: 'Alice', companyId: 'PRR' });
  });
});
