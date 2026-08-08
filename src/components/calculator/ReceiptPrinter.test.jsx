import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import ReceiptPrinter from './ReceiptPrinter.jsx';
import { useWebBluetooth } from '../../hooks/useWebBluetooth.js';
import { printReceipt } from '../../services/printer/PrinterService.js';

vi.mock('../../hooks/useWebBluetooth.js', () => ({
  useWebBluetooth: vi.fn(),
}));

// Without this the D30 driver would reach canvas.getContext, which happy-dom
// does not implement.
vi.mock('../../services/printer/PrinterService.js', () => ({
  printReceipt: vi.fn(),
}));

const renderWithChakra = (ui) =>
  render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);

const D30 = { id: 'd30', displayName: 'Phomemo D30' };
const PT210 = { id: 'pt210', displayName: 'GOOJPRT PT-210' };

const hookState = (overrides = {}) => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  probe: vi.fn(),
  isConnected: false,
  isConnecting: false,
  error: null,
  characteristic: null,
  deviceName: null,
  printer: null,
  probeReport: null,
  ...overrides,
});

const connectedTo = (printer, overrides = {}) =>
  hookState({
    isConnected: true,
    printer,
    characteristic: { id: 'fake-characteristic' },
    deviceName: printer === PT210 ? 'PT210_8CF0' : 'D30-1234',
    ...overrides,
  });

const receipt = {
  company: 'B&O',
  companyName: 'Baltimore & Ohio',
  trains: [{ route: '40+40', revenue: 80, stopCount: 2 }],
  totalRevenue: 80,
};

describe('ReceiptPrinter when nothing is paired', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers to pair', () => {
    useWebBluetooth.mockReturnValue(hookState());
    renderWithChakra(<ReceiptPrinter {...receipt} />);
    expect(screen.getByRole('button', { name: /Pair Printer/i })).toBeInTheDocument();
  });

  it('pairs without the component naming any Bluetooth ids', () => {
    const state = hookState();
    useWebBluetooth.mockReturnValue(state);
    renderWithChakra(<ReceiptPrinter {...receipt} />);

    fireEvent.click(screen.getByRole('button', { name: /Pair Printer/i }));

    expect(state.connect).toHaveBeenCalledTimes(1);
    expect(state.connect).toHaveBeenCalledWith();
  });

  it('does not offer to print', () => {
    useWebBluetooth.mockReturnValue(hookState());
    renderWithChakra(<ReceiptPrinter {...receipt} />);
    expect(screen.queryByRole('button', { name: /Print Receipt/i })).not.toBeInTheDocument();
  });

  it('shows a connection problem', () => {
    useWebBluetooth.mockReturnValue(hookState({ error: 'Web Bluetooth is not available' }));
    renderWithChakra(<ReceiptPrinter {...receipt} />);
    expect(screen.getByText(/Web Bluetooth is not available/)).toBeInTheDocument();
  });
});

describe('ReceiptPrinter when a printer is paired', () => {
  beforeEach(() => vi.clearAllMocks());

  it('names the PT-210 that is connected', () => {
    useWebBluetooth.mockReturnValue(connectedTo(PT210));
    renderWithChakra(<ReceiptPrinter {...receipt} />);
    expect(screen.getByText(/GOOJPRT PT-210/)).toBeInTheDocument();
    expect(screen.getByText(/PT210_8CF0/)).toBeInTheDocument();
  });

  it('names the D30 that is connected', () => {
    useWebBluetooth.mockReturnValue(connectedTo(D30));
    renderWithChakra(<ReceiptPrinter {...receipt} />);
    expect(screen.getByText(/Phomemo D30/)).toBeInTheDocument();
  });

  it('prints the receipt through the connected printer', async () => {
    const state = connectedTo(PT210);
    useWebBluetooth.mockReturnValue(state);
    renderWithChakra(<ReceiptPrinter {...receipt} />);

    fireEvent.click(screen.getByRole('button', { name: /Print Receipt/i }));

    await waitFor(() => expect(printReceipt).toHaveBeenCalledTimes(1));
    expect(printReceipt).toHaveBeenCalledWith(state.characteristic, PT210, {
      company: 'B&O',
      companyName: 'Baltimore & Ohio',
      trains: receipt.trains,
      totalRevenue: 80,
    });
  });

  it('shows on screen when a print fails, rather than only in the console', async () => {
    printReceipt.mockRejectedValueOnce(new Error('printer went away'));
    useWebBluetooth.mockReturnValue(connectedTo(PT210));
    renderWithChakra(<ReceiptPrinter {...receipt} />);

    fireEvent.click(screen.getByRole('button', { name: /Print Receipt/i }));

    expect(await screen.findByText(/printer went away/)).toBeInTheDocument();
  });

  it('lets you try printing again after a failure', async () => {
    printReceipt.mockRejectedValueOnce(new Error('printer went away'));
    useWebBluetooth.mockReturnValue(connectedTo(PT210));
    renderWithChakra(<ReceiptPrinter {...receipt} />);

    fireEvent.click(screen.getByRole('button', { name: /Print Receipt/i }));
    await screen.findByText(/printer went away/);

    expect(screen.getByRole('button', { name: /Print Receipt/i })).toBeEnabled();
  });

  it('clears an old failure when printing again', async () => {
    printReceipt.mockRejectedValueOnce(new Error('printer went away'));
    useWebBluetooth.mockReturnValue(connectedTo(PT210));
    renderWithChakra(<ReceiptPrinter {...receipt} />);

    fireEvent.click(screen.getByRole('button', { name: /Print Receipt/i }));
    await screen.findByText(/printer went away/);

    fireEvent.click(screen.getByRole('button', { name: /Print Receipt/i }));

    await waitFor(() =>
      expect(screen.queryByText(/printer went away/)).not.toBeInTheDocument()
    );
  });

  it('disconnects on request', () => {
    const state = connectedTo(PT210);
    useWebBluetooth.mockReturnValue(state);
    renderWithChakra(<ReceiptPrinter {...receipt} />);

    fireEvent.click(screen.getByRole('button', { name: /Disconnect/i }));

    expect(state.disconnect).toHaveBeenCalledTimes(1);
  });
});

describe('ReceiptPrinter probing', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stays out of the way by default, now that the printers are known to work', () => {
    useWebBluetooth.mockReturnValue(hookState());
    renderWithChakra(<ReceiptPrinter {...receipt} />);

    expect(screen.queryByRole('button', { name: /Probe/i })).not.toBeInTheDocument();
  });

  it('is available when asked for, even with nothing paired', () => {
    const state = hookState();
    useWebBluetooth.mockReturnValue(state);
    renderWithChakra(<ReceiptPrinter {...receipt} showProbe />);

    fireEvent.click(screen.getByRole('button', { name: /Probe/i }));

    expect(state.probe).toHaveBeenCalledTimes(1);
  });

  it('hides a report it already has when the probe is switched off', () => {
    useWebBluetooth.mockReturnValue(
      hookState({
        probeReport: { name: 'PT210_8CF0', id: 'device-1', connected: true, services: [], errors: [] },
      })
    );
    renderWithChakra(<ReceiptPrinter {...receipt} />);

    expect(screen.queryByText(/PT210_8CF0/)).not.toBeInTheDocument();
  });

  it('shows the report on screen, since there is no console at a game table', () => {
    useWebBluetooth.mockReturnValue(
      hookState({
        probeReport: {
          name: 'PT210_8CF0',
          id: 'device-1',
          connected: true,
          services: [
            {
              uuid: '000018f0-0000-1000-8000-00805f9b34fb',
              characteristics: [
                {
                  uuid: '00002af1-0000-1000-8000-00805f9b34fb',
                  properties: ['writeWithoutResponse'],
                },
              ],
            },
          ],
          errors: [],
        },
      })
    );
    renderWithChakra(<ReceiptPrinter {...receipt} showProbe />);

    expect(screen.getByText(/000018f0-0000-1000-8000-00805f9b34fb/)).toBeInTheDocument();
    expect(screen.getByText(/writeWithoutResponse/)).toBeInTheDocument();
  });

  it('shows nothing extra before a probe has run', () => {
    useWebBluetooth.mockReturnValue(hookState());
    renderWithChakra(<ReceiptPrinter {...receipt} />);
    expect(screen.queryByText(/Connected:/)).not.toBeInTheDocument();
  });
});
