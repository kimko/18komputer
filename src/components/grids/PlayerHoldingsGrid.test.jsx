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
    
    fireEvent.click(detailsBtn);
    expect(screen.getAllByText('↳ Share Value')[0]).toBeInTheDocument();
  });

  it('handles adding and removing players', () => {
    const updatePlayers = vi.fn();
    
    renderComponent({ updatePlayers });
    
    // Type in input
    const input = screen.getByPlaceholderText('New player...');
    fireEvent.change(input, { target: { value: 'Charlie' } });
    
    // Add
    fireEvent.click(screen.getByText('Add'));
    expect(updatePlayers).toHaveBeenCalledWith(['Alice', 'Bob', 'Charlie']);
    
    // Remove
    const removeBtns = screen.getAllByRole('button', { name: 'Remove' });
    fireEvent.click(removeBtns[0]);
    expect(updatePlayers).toHaveBeenCalledWith(['Bob']);
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
