import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  connectWithTimeout,
  resolveWriteCharacteristic,
  openPrinterConnection,
} from './connectPrinter.js';

const printer = {
  id: 'pt210',
  displayName: 'GOOJPRT PT-210',
  endpoints: [
    { service: 'service-a', characteristic: 'char-a' },
    { service: 'service-b', characteristic: 'char-b' },
    { service: 'service-c', characteristic: 'char-c' },
  ],
};

const notFound = () => {
  const error = new Error('No Services matching UUID found in Device.');
  error.name = 'NotFoundError';
  return error;
};

// `available` maps a service id to the characteristic ids it exposes.
const makeServer = (available) => ({
  getPrimaryService: vi.fn(async (uuid) => {
    if (!available[uuid]) throw notFound();
    return {
      uuid,
      getCharacteristic: vi.fn(async (charUuid) => {
        if (!available[uuid].includes(charUuid)) throw notFound();
        return { uuid: charUuid };
      }),
    };
  }),
});

const makeDevice = (server, { connect } = {}) => ({
  name: 'PT210_8CF0',
  id: 'device-1',
  addEventListener: vi.fn(),
  gatt: { connect: connect || vi.fn(async () => server) },
});

afterEach(() => {
  vi.useRealTimers();
});

describe('connectWithTimeout', () => {
  it('resolves with the connected server', async () => {
    const server = { id: 'server' };
    await expect(connectWithTimeout({ connect: async () => server }, 100)).resolves.toBe(server);
  });

  it('gives up when the printer never answers, instead of hanging forever', async () => {
    vi.useFakeTimers();
    const promise = connectWithTimeout({ connect: () => new Promise(() => {}) }, 15000);
    const assertion = expect(promise).rejects.toThrow(/timeout/i);

    vi.advanceTimersByTime(15000);

    await assertion;
  });

  it('names the timeout length in the message so the user knows how long it waited', async () => {
    vi.useFakeTimers();
    const promise = connectWithTimeout({ connect: () => new Promise(() => {}) }, 5000);
    const assertion = expect(promise).rejects.toThrow(/5s/);

    vi.advanceTimersByTime(5000);

    await assertion;
  });

  it('reports a connection error from the browser', async () => {
    const failing = { connect: async () => { throw new Error('GATT operation failed'); } };
    await expect(connectWithTimeout(failing, 100)).rejects.toThrow('GATT operation failed');
  });
});

describe('resolveWriteCharacteristic', () => {
  it('uses the first pair of ids that the printer actually has', async () => {
    const server = makeServer({ 'service-a': ['char-a'] });

    const { characteristic, endpoint } = await resolveWriteCharacteristic(server, printer);

    expect(characteristic.uuid).toBe('char-a');
    expect(endpoint).toEqual(printer.endpoints[0]);
  });

  it('moves on when the service is not there', async () => {
    const server = makeServer({ 'service-b': ['char-b'] });

    const { endpoint } = await resolveWriteCharacteristic(server, printer);

    expect(endpoint).toEqual(printer.endpoints[1]);
    expect(server.getPrimaryService).toHaveBeenCalledTimes(2);
  });

  it('moves on when the service is there but the characteristic is not', async () => {
    const server = makeServer({ 'service-a': ['something-else'], 'service-c': ['char-c'] });

    const { endpoint } = await resolveWriteCharacteristic(server, printer);

    expect(endpoint).toEqual(printer.endpoints[2]);
  });

  it('names the printer and every id it tried when none of them work', async () => {
    const server = makeServer({});

    await expect(resolveWriteCharacteristic(server, printer)).rejects.toThrow(
      /GOOJPRT PT-210[\s\S]*service-a[\s\S]*service-b[\s\S]*service-c/
    );
  });
});

describe('openPrinterConnection', () => {
  it('returns the device, printer, characteristic and the ids that worked', async () => {
    const device = makeDevice(makeServer({ 'service-b': ['char-b'] }));

    const connection = await openPrinterConnection(device, printer);

    expect(connection.device).toBe(device);
    expect(connection.printer).toBe(printer);
    expect(connection.characteristic.uuid).toBe('char-b');
    expect(connection.endpoint).toEqual(printer.endpoints[1]);
  });

  it('listens for the printer dropping the connection, once', async () => {
    const device = makeDevice(makeServer({ 'service-a': ['char-a'] }));
    const onDisconnect = vi.fn();

    await openPrinterConnection(device, printer, { onDisconnect });

    expect(device.addEventListener).toHaveBeenCalledWith(
      'gattserverdisconnected',
      onDisconnect,
      { once: true }
    );
  });

  it('does not register a listener when none is given', async () => {
    const device = makeDevice(makeServer({ 'service-a': ['char-a'] }));

    await openPrinterConnection(device, printer);

    expect(device.addEventListener).not.toHaveBeenCalled();
  });

  it('applies the timeout it was given', async () => {
    vi.useFakeTimers();
    const device = makeDevice(null, { connect: () => new Promise(() => {}) });
    const promise = openPrinterConnection(device, printer, { timeoutMs: 5000 });
    const assertion = expect(promise).rejects.toThrow(/timeout/i);

    vi.advanceTimersByTime(5000);

    await assertion;
  });

  it('reports that no ids matched, so an unknown printer is debuggable', async () => {
    const device = makeDevice(makeServer({}));

    await expect(openPrinterConnection(device, printer)).rejects.toThrow(/service-a/);
  });
});
