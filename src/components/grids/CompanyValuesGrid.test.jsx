import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import CompanyValuesGrid from './CompanyValuesGrid';

const mockDashboardState = {
  ors: {
    'PRR': { or1: 100, or2: 120 }
  },
  shareValues: {
    'PRR': 50
  },
  startValues: {
    'PRR': 40
  }
};

const mockActiveCompanies = [
  { shortName: 'PRR', color: '#ff0000' }
];

const renderComponent = (props = {}) => {
  return render(
    <ChakraProvider value={defaultSystem}>
      <CompanyValuesGrid
        activeCompanies={mockActiveCompanies}
        maxOr={2}
        dashboardState={mockDashboardState}
        updateMaxOr={vi.fn()}
        updateDashboardFields={vi.fn()}
        setActivePopup={vi.fn()}
        {...props}
      />
    </ChakraProvider>
  );
};

const openDetails = () => fireEvent.click(screen.getByTestId('company-details-toggle'));

describe('CompanyValuesGrid', () => {
  it('renders nothing when there are no active companies', () => {
    const { container } = renderComponent({ activeCompanies: [] });
    expect(container.firstChild).toBeNull();
  });

  it('renders company values and OR inputs', () => {
    renderComponent();
    expect(screen.getByText('Company Values & Results')).toBeInTheDocument();
    expect(screen.getByText('PRR')).toBeInTheDocument();
    
    // Share Value
    expect(screen.getByText('$50')).toBeInTheDocument();
    
    // OR Total (100 + 120 = 220)
    expect(screen.getByText('$220')).toBeInTheDocument();
  });

  it('calls updateMaxOr when clicking + OR / - OR', () => {
    const updateMaxOr = vi.fn();
    renderComponent({ updateMaxOr });
    
    fireEvent.click(screen.getByText('+ OR'));
    expect(updateMaxOr).toHaveBeenCalledWith(3);
    
    fireEvent.click(screen.getByText('- OR'));
    expect(updateMaxOr).toHaveBeenCalledWith(1);
  });

  it('calls setActivePopup when clicking an OR cell', () => {
    const setActivePopup = vi.fn();
    renderComponent({ setActivePopup });
    
    // We expect the button with text '$100' to trigger the popup
    fireEvent.click(screen.getByText('$100'));
    expect(setActivePopup).toHaveBeenCalledWith({ type: 'or', companyId: 'PRR', orIndex: 1 });
  });

  describe('the details view', () => {
    it('shows the SP start column only once details are open', () => {
      renderComponent();
      expect(screen.queryByTestId('sp-start-btn')).not.toBeInTheDocument();

      openDetails();
      expect(screen.getByText('SP start')).toBeInTheDocument();
      expect(screen.getByTestId('sp-start-btn')).toHaveTextContent('$40');

      openDetails();
      expect(screen.queryByTestId('sp-start-btn')).not.toBeInTheDocument();
    });

    it('opens the price picker on the SP start cell', () => {
      const setActivePopup = vi.fn();
      renderComponent({ setActivePopup });
      openDetails();

      fireEvent.click(screen.getByTestId('sp-start-btn'));
      expect(setActivePopup).toHaveBeenCalledWith({ type: 'startValue', companyId: 'PRR' });
    });

    it('asks before setting every OR to zero, and leaves them alone on cancel', () => {
      const updateDashboardFields = vi.fn();
      renderComponent({ updateDashboardFields });
      openDetails();

      fireEvent.click(screen.getByText('Set all ORs to zero'));
      fireEvent.click(screen.getByText('Cancel'));
      expect(updateDashboardFields).not.toHaveBeenCalled();

      fireEvent.click(screen.getByText('Set all ORs to zero'));
      fireEvent.click(screen.getByText('Set all to zero'));

      const [fields] = updateDashboardFields.mock.calls[0];
      expect(fields.ors()).toEqual({ PRR: { or1: 0, or2: 0 } });
    });

    it('clears every share price and SP start once confirmed', () => {
      const updateDashboardFields = vi.fn();
      renderComponent({ updateDashboardFields });
      openDetails();

      fireEvent.click(screen.getByText('Set all share prices to zero'));
      fireEvent.click(screen.getByText('Clear all prices'));

      expect(updateDashboardFields).toHaveBeenCalledWith({
        shareValues: {}, sharePositions: {}, startValues: {}, startPositions: {}
      });
    });
  });
});
