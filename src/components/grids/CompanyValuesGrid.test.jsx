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

    describe('populating the ORs from the calculator', () => {
      const twoCompanies = [
        { shortName: 'PRR', color: '#ff0000' },
        { shortName: 'NYC', color: '#0000ff' }
      ];

      it('writes each company last calculated run into every operating round', () => {
        const updateDashboardFields = vi.fn();
        renderComponent({
          updateDashboardFields,
          activeCompanies: twoCompanies,
          calculatorTotals: { PRR: 130, NYC: 80 }
        });
        openDetails();

        fireEvent.click(screen.getByText('Populate all ORs'));
        fireEvent.click(screen.getByText('Populate'));

        const [fields] = updateDashboardFields.mock.calls[0];
        expect(fields.ors()).toEqual({
          PRR: { or1: 130, or2: 130 },
          NYC: { or1: 80, or2: 80 }
        });
      });

      // A company nobody has run is not a company that earned nothing, so its rounds are left
      // alone rather than being overwritten with a zero that would read as a withheld dividend.
      it('leaves a company with no calculated run exactly as it was', () => {
        const updateDashboardFields = vi.fn();
        renderComponent({
          updateDashboardFields,
          activeCompanies: twoCompanies,
          calculatorTotals: { PRR: 130, NYC: 0 }
        });
        openDetails();

        fireEvent.click(screen.getByText('Populate all ORs'));
        fireEvent.click(screen.getByText('Populate'));

        const [fields] = updateDashboardFields.mock.calls[0];
        expect(fields.ors({ PRR: { or1: 5 }, NYC: { or1: 55 } })).toEqual({
          NYC: { or1: 55 },
          PRR: { or1: 130, or2: 130 }
        });
      });

      it('says how many companies it is about to fill', () => {
        renderComponent({ activeCompanies: twoCompanies, calculatorTotals: { PRR: 130, NYC: 0 } });
        openDetails();

        fireEvent.click(screen.getByText('Populate all ORs'));
        expect(screen.getByText(/1 of 2 companies/)).toBeTruthy();
      });

      it('asks first, and writes nothing on cancel', () => {
        const updateDashboardFields = vi.fn();
        renderComponent({ updateDashboardFields, calculatorTotals: { PRR: 130 } });
        openDetails();

        fireEvent.click(screen.getByText('Populate all ORs'));
        fireEvent.click(screen.getByText('Cancel'));
        expect(updateDashboardFields).not.toHaveBeenCalled();
      });

      it('offers nothing to populate when no company has been run', () => {
        renderComponent({ calculatorTotals: {} });
        openDetails();

        expect(screen.getByText('Populate all ORs').closest('button').disabled).toBe(true);
      });
    });

    describe('working out every SP start', () => {
      // Two rows, so a sold out company can climb and a paying round can run off the end.
      const staticConfig = {
        stockMarket: { type: '2d', grid: [['60', '70', '80', '90'], ['30', '40', '50p', '60']] }
      };

      const renderSolvable = (props = {}) => renderComponent({
        staticConfig,
        players: ['Ada'],
        dashboardState: {
          ors: { PRR: { or1: 100 } },
          shareValues: { PRR: 70 },
          playerAssets: { Ada: { shares: { PRR: 50 } } }
        },
        ...props
      });

      it('writes the start price and square it worked out', () => {
        const updateDashboardFields = vi.fn();
        renderSolvable({ updateDashboardFields });
        openDetails();

        fireEvent.click(screen.getByText('Set SP start'));
        fireEvent.click(screen.getByText('Work them out'));

        expect(updateDashboardFields).toHaveBeenCalledWith({
          startValues: { PRR: 60 },
          startPositions: { PRR: [0, 0] }
        });
      });

      it('asks first, and writes nothing on cancel', () => {
        const updateDashboardFields = vi.fn();
        renderSolvable({ updateDashboardFields });
        openDetails();

        fireEvent.click(screen.getByText('Set SP start'));
        fireEvent.click(screen.getByText('Cancel'));
        expect(updateDashboardFields).not.toHaveBeenCalled();
      });

      it('says how many it could place and how many are only approximate', () => {
        renderSolvable();
        openDetails();

        fireEvent.click(screen.getByText('Set SP start'));
        expect(screen.getByText(/1 of 1 companies/)).toBeTruthy();
      });

      it('is offered but explains itself when no company can be placed', () => {
        renderSolvable({ dashboardState: { ors: {}, shareValues: { PRR: 999 }, playerAssets: {} } });
        openDetails();

        fireEvent.click(screen.getByText('Set SP start'));
        expect(screen.getByText(/0 of 1 companies/)).toBeTruthy();
      });

      it('is not offered at all on a title with no market', () => {
        renderComponent({ staticConfig: {} });
        openDetails();

        expect(screen.queryByText('Set SP start')).toBeNull();
      });
    });
  });
});
