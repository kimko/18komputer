import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import ResumeGame from './ResumeGame.jsx';
import * as mockApi from '../api/mockApi.js';

const mockNavigate = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => ['/current-path', mockNavigate]
}));

vi.mock('../api/mockApi.js', () => ({
  getGamesList: vi.fn(),
  getGame: vi.fn(),
  importGame: vi.fn(),
  deleteGame: vi.fn(),
  deleteAllGames: vi.fn()
}));

vi.mock('../services/remote/gamesSheet.js', () => ({ loadGameFromSheet: vi.fn() }));
import { loadGameFromSheet } from '../services/remote/gamesSheet.js';

vi.mock('../services/monitoring/monitoring.js', () => ({ reportProblem: vi.fn() }));
import { reportProblem } from '../services/monitoring/monitoring.js';

const renderWithChakra = (ui) => {
  return render(
    <ChakraProvider value={defaultSystem}>
      {ui}
    </ChakraProvider>
  );
};

describe('ResumeGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an empty state when there are no games', async () => {
    mockApi.getGamesList.mockResolvedValue([]);
    
    renderWithChakra(<ResumeGame />);
    
    await waitFor(() => {
      expect(screen.getByText('No active games found.')).toBeInTheDocument();
    });
  });

  it('renders a list of games and navigates on click', async () => {
    const mockGames = [
      {
        id: 'game_123_456',
        gameId: '1830',
        createdAt: '2026-08-04T12:00:00Z',
        players: ['Alice', 'Bob']
      }
    ];
    
    mockApi.getGamesList.mockResolvedValue(mockGames);
    
    renderWithChakra(<ResumeGame />);
    
    await waitFor(() => {
      expect(screen.getByText('1830')).toBeInTheDocument();
      expect(screen.getByText('#456')).toBeInTheDocument();
      expect(screen.getByText('2 Players')).toBeInTheDocument();
    });

    // Click the game card
    const card = screen.getByText('1830').closest('div').parentElement;
    fireEvent.click(card);

    expect(mockNavigate).toHaveBeenCalledWith('/game/game_123_456/dashboard');
  });

  it('navigates back to menu when Back button is clicked', async () => {
    mockApi.getGamesList.mockResolvedValue([]);
    
    renderWithChakra(<ResumeGame />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Back to Menu' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back to Menu' }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  describe('opening a link that fetches the game from the sheet', () => {
    const shared = {
      id: 'game_123_456',
      gameId: '1830',
      gameName: 'Friday night',
      players: ['Alice', 'Bob'],
      createdAt: '2026-08-04T12:00:00Z',
      state: { dashboardState: { playerAssets: {} } }
    };
    const mine = { ...shared, gameName: 'My copy', updatedAt: '2026-08-10T09:00:00Z' };

    beforeEach(() => {
      window.location.hash = '#remote=game_123_456';
      mockApi.getGamesList.mockResolvedValue([]);
      mockApi.importGame.mockResolvedValue();
    });

    afterEach(() => {
      window.location.hash = '';
    });

    it('imports the game and opens it when this device does not have it', async () => {
      loadGameFromSheet.mockResolvedValue({ game: shared, updatedAt: '2026-08-11T19:02:00.000Z' });
      mockApi.getGame.mockRejectedValue(new Error('Game not found'));

      renderWithChakra(<ResumeGame />);

      await waitFor(() => expect(mockApi.importGame).toHaveBeenCalledWith(shared));
      expect(mockNavigate).toHaveBeenCalledWith('/game/game_123_456/dashboard');
    });

    it('asks which copy to keep when this device already has the game', async () => {
      loadGameFromSheet.mockResolvedValue({ game: shared, updatedAt: '2026-08-11T19:02:00.000Z' });
      mockApi.getGame.mockResolvedValue(mine);

      renderWithChakra(<ResumeGame />);

      expect(await screen.findByText('You already have this game')).toBeInTheDocument();
      expect(screen.getByText('My copy')).toBeInTheDocument();
      expect(screen.getByText('Friday night')).toBeInTheDocument();
      expect(mockApi.importGame).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('keeps the local game untouched when asked to', async () => {
      loadGameFromSheet.mockResolvedValue({ game: shared, updatedAt: '2026-08-11T19:02:00.000Z' });
      mockApi.getGame.mockResolvedValue(mine);

      renderWithChakra(<ResumeGame />);
      fireEvent.click(await screen.findByRole('button', { name: 'Keep mine' }));

      await waitFor(() => {
        expect(screen.queryByText('You already have this game')).not.toBeInTheDocument();
      });
      expect(mockApi.importGame).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('replaces the local game and opens it when asked to', async () => {
      loadGameFromSheet.mockResolvedValue({ game: shared, updatedAt: '2026-08-11T19:02:00.000Z' });
      mockApi.getGame.mockResolvedValue(mine);

      renderWithChakra(<ResumeGame />);
      fireEvent.click(await screen.findByRole('button', { name: 'Use the shared one' }));

      await waitFor(() => expect(mockApi.importGame).toHaveBeenCalledWith(shared));
      expect(mockNavigate).toHaveBeenCalledWith('/game/game_123_456/dashboard');
    });

    // Fake timers do not mix with the waitFor/findBy* the rest of this file leans on, so this
    // case drives the clock by hand instead.
    it('escalates what the spinner says while the sheet keeps them waiting', async () => {
      vi.useFakeTimers();
      loadGameFromSheet.mockReturnValue(new Promise(() => {}));

      renderWithChakra(<ResumeGame />);
      await act(async () => {});

      expect(screen.getByText('Fetching the shared game...')).toBeInTheDocument();
      expect(screen.queryByText(/Still waiting/)).not.toBeInTheDocument();

      await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
      expect(screen.getByText('This is taking longer than usual...')).toBeInTheDocument();
      expect(screen.getByText(/Still waiting/)).toHaveTextContent('Still waiting — 3s');

      await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
      expect(screen.getByText(/Still waiting/)).toHaveTextContent('Still waiting — 5s');

      await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
      expect(screen.getByText('Still trying — the connection looks slow...')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('says so and reports it when this device cannot store the game', async () => {
      loadGameFromSheet.mockResolvedValue({ game: shared, updatedAt: '2026-08-11T19:02:00.000Z' });
      mockApi.getGame.mockRejectedValue(new Error('Game not found'));
      mockApi.importGame.mockRejectedValue(new Error('The quota has been exceeded.'));

      renderWithChakra(<ResumeGame />);

      expect(await screen.findByText('The quota has been exceeded.')).toBeInTheDocument();
      expect(reportProblem).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ stage: 'importing the shared game', id: 'game_123_456' })
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('says so and reports it when replacing the local copy cannot be stored', async () => {
      loadGameFromSheet.mockResolvedValue({ game: shared, updatedAt: '2026-08-11T19:02:00.000Z' });
      mockApi.getGame.mockResolvedValue(mine);
      mockApi.importGame.mockRejectedValue(new Error('The quota has been exceeded.'));

      renderWithChakra(<ResumeGame />);
      fireEvent.click(await screen.findByRole('button', { name: 'Use the shared one' }));

      expect(await screen.findByText('The quota has been exceeded.')).toBeInTheDocument();
      expect(reportProblem).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ stage: 'importing the shared game', id: 'game_123_456' })
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    // gamesSheet.js reports its own failures, so this catch must not report them again.
    it('leaves the sheet to report its own failures', async () => {
      loadGameFromSheet.mockRejectedValue(new Error('That game is not in the sheet.'));

      renderWithChakra(<ResumeGame />);

      expect(await screen.findByText('That game is not in the sheet.')).toBeInTheDocument();
      expect(reportProblem).not.toHaveBeenCalled();
    });

    it('says why nothing happened when the sheet cannot be read', async () => {
      loadGameFromSheet.mockRejectedValue(new Error('That game is not in the sheet.'));

      renderWithChakra(<ResumeGame />);

      expect(await screen.findByText('That game is not in the sheet.')).toBeInTheDocument();
      expect(mockApi.importGame).not.toHaveBeenCalled();
    });
  });
});
