import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useWebBluetooth } from './useWebBluetooth.js';

const D30_SERVICE = '0000ff00-0000-1000-8000-00805f9b34fb';
const D30_CHAR = '0000ff02-0000-1000-8000-00805f9b34fb';
const PT210_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb';
const PT210_CHAR = '00002af1-0000-1000-8000-00805f9b34fb';

const notFound = () => {
  const error = new Error('No Services matching UUID found in Device.');
  error.name = 'NotFoundError';
  return error;
};

const makeDevice = (name, { id = name, offers = {}, connect } = {}) => {
  const device = {
    name,
    id,
    addEventListener: vi.fn(),
    gatt: {
      connected: false,
      disconnect: vi.fn(),
      connect:
        connect ||
        vi.fn(async () => ({
          getPrimaryService: vi.fn(async (uuid) => {
            if (!offers[uuid]) throw notFound();
            return {
              uuid,
              device,
              getCharacteristic: vi.fn(async (charUuid) => {
                if (!offers[uuid].includes(charUuid)) throw notFound();
                return { uuid: charUuid, service: { device } };
              }),
            };
          }),
          getPrimaryServices: vi.fn(async () =>
            Object.keys(offers).map((uuid) => ({
              uuid,
              getCharacteristics: vi.fn(async () =>
                offers[uuid].map((charUuid) => ({
                  uuid: charUuid,
                  properties: { write: true },
                }))
              ),
            }))
          ),
        })),
    },
  };
  return device;
};

const workingD30 = (name = 'D30-1234') =>
  makeDevice(name, { offers: { [D30_SERVICE]: [D30_CHAR] } });

const workingPt210 = (name = 'PT210_8CF0') =>
  makeDevice(name, { offers: { [PT210_SERVICE]: [PT210_CHAR] } });

const stubBluetooth = (bluetooth) => {
  Object.defineProperty(globalThis.navigator, 'bluetooth', {
    value: bluetooth,
    configurable: true,
    writable: true,
  });
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  stubBluetooth(undefined);
  vi.useRealTimers();
});

describe('useWebBluetooth without Bluetooth support', () => {
  it('starts idle and does not throw', async () => {
    stubBluetooth(undefined);

    const { result } = renderHook(() => useWebBluetooth());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('explains that the browser cannot do this when pairing is attempted', async () => {
    stubBluetooth(undefined);
    const { result } = renderHook(() => useWebBluetooth());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.error).toMatch(/not available in this browser/i);
    expect(result.current.isConnecting).toBe(false);
  });
});

describe('useWebBluetooth reconnecting to an already paired printer', () => {
  it('picks the printer out of a list of unrelated paired devices', async () => {
    const pt210 = workingPt210();
    stubBluetooth({
      getDevices: vi.fn(async () => [makeDevice('Galaxy Watch'), pt210]),
      requestDevice: vi.fn(),
    });

    const { result } = renderHook(() => useWebBluetooth());

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(result.current.printer.id).toBe('pt210');
    expect(result.current.deviceName).toBe('PT210_8CF0');
  });

  it('prefers the printer that was last used when two are paired', async () => {
    localStorage.setItem('printer.lastDeviceId', 'D30-1234');
    const d30 = workingD30();
    const pt210 = workingPt210();
    stubBluetooth({
      getDevices: vi.fn(async () => [pt210, d30]),
      requestDevice: vi.fn(),
    });

    const { result } = renderHook(() => useWebBluetooth());

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(result.current.printer.id).toBe('d30');
    expect(pt210.gatt.connect).not.toHaveBeenCalled();
  });

  it('tries the next printer when the first one will not connect', async () => {
    const unreachable = makeDevice('D30-dead', {
      connect: vi.fn(async () => { throw new Error('GATT operation failed'); }),
    });
    const pt210 = workingPt210();
    stubBluetooth({
      getDevices: vi.fn(async () => [unreachable, pt210]),
      requestDevice: vi.fn(),
    });

    const { result } = renderHook(() => useWebBluetooth());

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(result.current.printer.id).toBe('pt210');
  });

  it('stops waiting on a printer that never answers, leaving the Pair button usable', async () => {
    vi.useFakeTimers();
    const hanging = makeDevice('PT210_hang', { connect: () => new Promise(() => {}) });
    stubBluetooth({
      getDevices: vi.fn(async () => [hanging]),
      requestDevice: vi.fn(),
    });

    const { result } = renderHook(() => useWebBluetooth());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(result.current.isConnecting).toBe(false);
    expect(result.current.isConnected).toBe(false);
  });

  it('ignores paired devices that are not printers', async () => {
    stubBluetooth({
      getDevices: vi.fn(async () => [makeDevice('Galaxy Watch'), makeDevice('AirPods')]),
      requestDevice: vi.fn(),
    });

    const { result } = renderHook(() => useWebBluetooth());

    await waitFor(() => expect(result.current.isConnecting).toBe(false));
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('does nothing when the browser cannot list paired devices', async () => {
    stubBluetooth({ requestDevice: vi.fn() });

    const { result } = renderHook(() => useWebBluetooth());

    await waitFor(() => expect(result.current.isConnecting).toBe(false));
    expect(result.current.isConnected).toBe(false);
  });
});

describe('useWebBluetooth pairing', () => {
  it('offers both printers in the chooser without the caller naming any ids', async () => {
    const requestDevice = vi.fn(async () => workingPt210());
    stubBluetooth({ requestDevice });

    const { result } = renderHook(() => useWebBluetooth());
    await act(async () => {
      await result.current.connect();
    });

    const options = requestDevice.mock.calls[0][0];
    expect(options.filters).toEqual([
      { namePrefix: 'D30' },
      { namePrefix: 'PT210' },
      { namePrefix: 'PT-210' },
    ]);
    expect(options.optionalServices).toContain(PT210_SERVICE);
  });

  it('works out which printer was chosen from its name', async () => {
    stubBluetooth({ requestDevice: vi.fn(async () => workingD30()) });

    const { result } = renderHook(() => useWebBluetooth());
    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.printer.id).toBe('d30');
    expect(result.current.characteristic.uuid).toBe(D30_CHAR);
  });

  it('remembers the printer so the next visit reconnects to the same one', async () => {
    stubBluetooth({ requestDevice: vi.fn(async () => workingPt210()) });

    const { result } = renderHook(() => useWebBluetooth());
    await act(async () => {
      await result.current.connect();
    });

    expect(localStorage.getItem('printer.lastDeviceId')).toBe('PT210_8CF0');
    expect(localStorage.getItem('printer.lastPrinterId')).toBe('pt210');
  });

  it('says so plainly when the chosen device is not a printer it knows', async () => {
    stubBluetooth({ requestDevice: vi.fn(async () => makeDevice('Galaxy Buds')) });

    const { result } = renderHook(() => useWebBluetooth());
    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.error).toMatch(/Galaxy Buds/);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
  });

  it('reports which ids it tried when the printer offers none of them', async () => {
    stubBluetooth({
      requestDevice: vi.fn(async () => makeDevice('PT210_8CF0', { offers: {} })),
    });

    const { result } = renderHook(() => useWebBluetooth());
    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.error).toContain(PT210_SERVICE);
    expect(result.current.isConnected).toBe(false);
  });

  it('stays quiet when the user closes the chooser without picking anything', async () => {
    const cancelled = new Error('User cancelled the requestDevice() chooser.');
    cancelled.name = 'NotFoundError';
    stubBluetooth({ requestDevice: vi.fn(async () => { throw cancelled; }) });

    const { result } = renderHook(() => useWebBluetooth());
    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isConnecting).toBe(false);
  });
});

describe('useWebBluetooth disconnecting', () => {
  it('drops the connection and forgets which device it was', async () => {
    const device = workingPt210();
    stubBluetooth({ requestDevice: vi.fn(async () => device) });

    const { result } = renderHook(() => useWebBluetooth());
    await act(async () => {
      await result.current.connect();
    });
    device.gatt.connected = true;

    act(() => {
      result.current.disconnect();
    });

    expect(device.gatt.disconnect).toHaveBeenCalled();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.characteristic).toBeNull();
    expect(result.current.printer).toBeNull();
    expect(localStorage.getItem('printer.lastDeviceId')).toBeNull();
  });

  it('keeps the printer preference, so the next pairing still starts there', async () => {
    const device = workingPt210();
    stubBluetooth({ requestDevice: vi.fn(async () => device) });

    const { result } = renderHook(() => useWebBluetooth());
    await act(async () => {
      await result.current.connect();
    });
    act(() => {
      result.current.disconnect();
    });

    expect(localStorage.getItem('printer.lastPrinterId')).toBe('pt210');
  });
});

describe('useWebBluetooth probing', () => {
  it('accepts any device and reports what it offers', async () => {
    const requestDevice = vi.fn(async () => workingPt210());
    stubBluetooth({ requestDevice });

    const { result } = renderHook(() => useWebBluetooth());
    await act(async () => {
      await result.current.probe();
    });

    expect(requestDevice.mock.calls[0][0].acceptAllDevices).toBe(true);
    expect(result.current.probeReport.name).toBe('PT210_8CF0');
    expect(result.current.probeReport.services[0].uuid).toBe(PT210_SERVICE);
  });

  it('does not leave the app looking connected after a probe', async () => {
    stubBluetooth({ requestDevice: vi.fn(async () => workingPt210()) });

    const { result } = renderHook(() => useWebBluetooth());
    await act(async () => {
      await result.current.probe();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
  });
});
