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
        showDetails={true}
        setShowDetails={vi.fn()}
        newPlayerName=""
        setNewPlayerName={vi.fn()}
        handleAddPlayer={vi.fn()}
        handleRemovePlayer={vi.fn()}
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
    expect(screen.getByText('500')).toBeInTheDocument(); // Alice cash
    expect(screen.getByText('300')).toBeInTheDocument(); // Bob cash
  });

  it('toggles details', () => {
    const setShowDetails = vi.fn();
    renderComponent({ showDetails: false, setShowDetails });
    
    const detailsBtn = screen.getByText('Details');
    fireEvent.click(detailsBtn);
    expect(setShowDetails).toHaveBeenCalledWith(true);
  });

  it('handles adding and removing players', () => {
    const handleAddPlayer = vi.fn(e => e.preventDefault());
    const handleRemovePlayer = vi.fn();
    const setNewPlayerName = vi.fn();
    
    renderComponent({ 
      handleAddPlayer, 
      handleRemovePlayer, 
      setNewPlayerName 
    });
    
    // Type in input
    const input = screen.getByPlaceholderText('New player...');
    fireEvent.change(input, { target: { value: 'Charlie' } });
    expect(setNewPlayerName).toHaveBeenCalledWith('Charlie');
    
    // Add
    fireEvent.click(screen.getByText('Add'));
    expect(handleAddPlayer).toHaveBeenCalled();
    
    // Remove
    const removeBtns = screen.getAllByRole('button', { name: 'Remove' });
    fireEvent.click(removeBtns[0]);
    expect(handleRemovePlayer).toHaveBeenCalledWith('Alice');
  });

  it('triggers popups for cash and shares', () => {
    const setActivePopup = vi.fn();
    renderComponent({ setActivePopup });
    
    // Click Alice Cash (500)
    fireEvent.click(screen.getByText('500'));
    expect(setActivePopup).toHaveBeenCalledWith({ type: 'cash', player: 'Alice' });
    
    // Click Alice PRR shares (20%)
    fireEvent.click(screen.getByText('20%'));
    expect(setActivePopup).toHaveBeenCalledWith({ type: 'shares', player: 'Alice', companyId: 'PRR' });
  });
});
