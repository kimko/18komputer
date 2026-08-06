import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import MainMenu from './MainMenu.jsx';

const mockNavigate = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockNavigate]
}));

const renderWithChakra = (ui) => {
  return render(
    <ChakraProvider value={defaultSystem}>
      {ui}
    </ChakraProvider>
  );
};

describe('MainMenu Component', () => {
  it('should render the application title and main action buttons', () => {
    renderWithChakra(<MainMenu />);
    
    // Check for title
    expect(screen.getByText('🚂')).toBeInTheDocument();

    // Check for primary buttons
    expect(screen.getByRole('button', { name: /NEW GAME/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /RESUME GAME/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /MANAGE USERS/i })).toBeInTheDocument();
  });

  it('should navigate to the correct routes when buttons are clicked', () => {
    renderWithChakra(<MainMenu />);
    
    // Click New Game
    fireEvent.click(screen.getByRole('button', { name: /NEW GAME/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/new');
    
    // Click Resume Game
    fireEvent.click(screen.getByRole('button', { name: /RESUME GAME/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/resume');
    
    // Click User Management
    fireEvent.click(screen.getByRole('button', { name: /MANAGE USERS/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/users');
  });

  it('should display the application version from environment variables', () => {
    // Mock the environment variable
    vi.stubEnv('VITE_APP_VERSION', '9.9.9-test');
    
    renderWithChakra(<MainMenu />);
    
    expect(screen.getByText('v9.9.9-test')).toBeInTheDocument();
    
    // Clean up
    vi.unstubAllEnvs();
  });
});
