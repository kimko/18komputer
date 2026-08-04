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
        setActivePopup={vi.fn()}
        {...props}
      />
    </ChakraProvider>
  );
};

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
    expect(screen.getByText('50')).toBeInTheDocument();
    
    // OR Total (100 + 120 = 220)
    expect(screen.getByText('220')).toBeInTheDocument();
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
    
    // We expect the button with text '100' to trigger the popup
    fireEvent.click(screen.getByText('100'));
    expect(setActivePopup).toHaveBeenCalledWith({ type: 'or', companyId: 'PRR', orIndex: 1 });
  });
});
