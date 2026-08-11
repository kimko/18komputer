import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrinterConnectionProvider } from './PrinterConnectionProvider.jsx';
import { usePrinterConnection } from './printerConnection.js';

vi.mock('./useWebBluetooth.js', () => ({ useWebBluetooth: vi.fn() }));
import { useWebBluetooth } from './useWebBluetooth.js';

function Panel({ label }) {
  const { isConnected, deviceName, connect } = usePrinterConnection();
  return (
    <div>
      <span>{label}: {isConnected ? deviceName : 'not paired'}</span>
      <button onClick={connect}>pair from {label}</button>
    </div>
  );
}

describe('the shared printer connection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows every panel the same printer, so pairing once is enough', () => {
    useWebBluetooth.mockReturnValue({
      isConnected: true, deviceName: 'PT-210', connect: vi.fn()
    });

    render(
      <PrinterConnectionProvider>
        <Panel label="calculator" />
        <Panel label="results" />
      </PrinterConnectionProvider>
    );

    expect(screen.getByText(/calculator: PT-210/)).toBeInTheDocument();
    expect(screen.getByText(/results: PT-210/)).toBeInTheDocument();
    expect(useWebBluetooth).toHaveBeenCalledTimes(1);
  });

  it('pairs through the one connection whichever panel asks', () => {
    const connect = vi.fn();
    useWebBluetooth.mockReturnValue({ isConnected: false, deviceName: null, connect });

    render(
      <PrinterConnectionProvider>
        <Panel label="calculator" />
        <Panel label="results" />
      </PrinterConnectionProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'pair from results' }));
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('refuses to guess when nothing set the connection up', () => {
    const shout = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Panel label="orphan" />)).toThrow(/PrinterConnectionProvider/);
    shout.mockRestore();
  });
});
