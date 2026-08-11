import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import ResultsPrinter from './ResultsPrinter.jsx';
import { usePrinterConnection } from '../hooks/printerConnection.js';
import { printResults } from '../services/printer/PrinterService.js';

vi.mock('../hooks/printerConnection.js', () => ({ usePrinterConnection: vi.fn() }));
vi.mock('../services/printer/PrinterService.js', () => ({ printResults: vi.fn() }));
vi.mock('../services/remote/gamesSheet.js', () => ({ saveGameToSheet: vi.fn() }));
import { saveGameToSheet } from '../services/remote/gamesSheet.js';

vi.mock('./ui/toast.js', () => ({ toastSheetOutcome: vi.fn(), toaster: { create: vi.fn() } }));
import { toastSheetOutcome } from './ui/toast.js';

const gameInstance = {
  id: 'inst_1', gameId: '1817', gameName: '1817 4p Aug-07', players: ['Liam'],
  state: { activeCompanies: [{ shortName: 'UR', totalShares: 5 }], calculatorState: {}, dashboardState: {} }
};
const dashboardState = { ors: {}, shareValues: {}, playerAssets: { Liam: { cash: 10, shares: {} } } };

const bluetooth = (overrides = {}) => ({
  connect: vi.fn(), disconnect: vi.fn(), isConnected: false, isConnecting: false,
  error: null, characteristic: null, deviceName: null, printer: null, ...overrides
});

const renderIt = () => render(
  <ChakraProvider value={defaultSystem}>
    <ResultsPrinter gameInstance={gameInstance} dashboardState={dashboardState} maxOr={3} />
  </ChakraProvider>
);

describe('ResultsPrinter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    printResults.mockResolvedValue();
    saveGameToSheet.mockResolvedValue({ outcome: 'updated', updatedAt: '2026-08-11T19:02:00.000Z' });
  });

  it('offers to pair when nothing is connected', () => {
    usePrinterConnection.mockReturnValue(bluetooth());
    renderIt();
    expect(screen.getByRole('button', { name: /pair/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /print results/i })).not.toBeInTheDocument();
  });

  it('offers to print once the receipt printer is connected', () => {
    usePrinterConnection.mockReturnValue(bluetooth({
      isConnected: true, characteristic: {}, deviceName: 'PT-210',
      printer: { id: 'pt210', displayName: 'GOOJPRT PT-210', buildResultsPayloads: vi.fn() }
    }));
    renderIt();
    expect(screen.getByRole('button', { name: /print results/i })).toBeInTheDocument();
  });

  it('says results need the receipt printer when a label printer is connected', () => {
    usePrinterConnection.mockReturnValue(bluetooth({
      isConnected: true, characteristic: {}, deviceName: 'D30',
      printer: { id: 'd30', displayName: 'Phomemo D30' }
    }));
    renderIt();
    expect(screen.getByText(/receipt printer/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /print results/i })).not.toBeInTheDocument();
  });

  it('saves the game, then prints the standings and a code that fetches it back', async () => {
    const printer = { id: 'pt210', displayName: 'GOOJPRT PT-210', buildResultsPayloads: vi.fn() };
    usePrinterConnection.mockReturnValue(bluetooth({ isConnected: true, characteristic: {}, printer }));
    renderIt();

    fireEvent.click(screen.getByRole('button', { name: /print results/i }));

    await waitFor(() => expect(printResults).toHaveBeenCalled());
    expect(saveGameToSheet).toHaveBeenCalledWith(gameInstance, dashboardState);
    const [, sentPrinter, data] = printResults.mock.calls[0];
    expect(sentPrinter).toBe(printer);
    expect(data.gameName).toBe('1817 4p Aug-07');
    expect(data.players).toEqual(['Liam']);
    expect(data.shareUrl).toContain('/resume#remote=inst_1');
  });

  it('says what happened to the sheet, and still prints a code when nothing was written', async () => {
    saveGameToSheet.mockResolvedValue({ outcome: 'unchanged', updatedAt: null });
    usePrinterConnection.mockReturnValue(bluetooth({
      isConnected: true, characteristic: {},
      printer: { id: 'pt210', buildResultsPayloads: vi.fn() }
    }));
    renderIt();

    fireEvent.click(screen.getByRole('button', { name: /print results/i }));

    await waitFor(() => expect(printResults).toHaveBeenCalled());
    expect(toastSheetOutcome).toHaveBeenCalledWith('unchanged');
    expect(printResults.mock.calls[0][2].shareUrl).toContain('/resume#remote=inst_1');
  });

  it('still prints when the sheet is unreachable, but sends no link to put in a code', async () => {
    saveGameToSheet.mockRejectedValue(new Error('Could not reach the sheet.'));
    usePrinterConnection.mockReturnValue(bluetooth({
      isConnected: true, characteristic: {},
      printer: { id: 'pt210', buildResultsPayloads: vi.fn() }
    }));
    renderIt();

    fireEvent.click(screen.getByRole('button', { name: /print results/i }));

    await waitFor(() => expect(printResults).toHaveBeenCalled());
    expect(printResults.mock.calls[0][2].shareUrl).toBeNull();
    expect(await screen.findByRole('status')).toHaveTextContent('without a code to scan');
  });

  it('shows a print failure on screen, not only in the console', async () => {
    printResults.mockRejectedValue(new Error('printer jammed'));
    usePrinterConnection.mockReturnValue(bluetooth({
      isConnected: true, characteristic: {},
      printer: { id: 'pt210', buildResultsPayloads: vi.fn() }
    }));
    renderIt();

    fireEvent.click(screen.getByRole('button', { name: /print results/i }));

    expect(await screen.findByText(/printer jammed/i)).toBeInTheDocument();
  });
});
