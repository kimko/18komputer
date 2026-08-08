import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  connectWithTimeout,
  resolveWriteCharacteristic,
  openPrinterConnection,
  probeDevice,
  formatProbeReport,
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

const makeProbeDevice = (services, { errorOn, connect } = {}) => ({
  name: 'PT210_8CF0',
  id: 'device-1',
  addEventListener: vi.fn(),
  gatt: {
    connected: true,
    disconnect: vi.fn(),
    connect:
      connect ||
      vi.fn(async () => ({
        getPrimaryServices: vi.fn(async () =>
          services.map((service) => ({
            uuid: service.uuid,
            getCharacteristics: vi.fn(async () => {
              if (errorOn === service.uuid) throw new Error('GATT read not permitted');
              return service.characteristics;
            }),
          }))
        ),
      })),
  },
});

describe('probeDevice', () => {
  const services = [
    {
      uuid: '000018f0-0000-1000-8000-00805f9b34fb',
      characteristics: [
        { uuid: '00002af1-0000-1000-8000-00805f9b34fb', properties: { writeWithoutResponse: true } },
      ],
    },
    {
      uuid: '0000ff00-0000-1000-8000-00805f9b34fb',
      characteristics: [
        { uuid: '0000ff02-0000-1000-8000-00805f9b34fb', properties: { write: true, read: true } },
      ],
    },
  ];

  it('reports which services and characteristics the device offers', async () => {
    const report = await probeDevice(makeProbeDevice(services));

    expect(report.name).toBe('PT210_8CF0');
    expect(report.id).toBe('device-1');
    expect(report.connected).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.services.map((s) => s.uuid)).toEqual([
      '000018f0-0000-1000-8000-00805f9b34fb',
      '0000ff00-0000-1000-8000-00805f9b34fb',
    ]);
  });

  it('reports which write modes each characteristic supports', async () => {
    const report = await probeDevice(makeProbeDevice(services));

    expect(report.services[0].characteristics).toEqual([
      {
        uuid: '00002af1-0000-1000-8000-00805f9b34fb',
        properties: ['writeWithoutResponse'],
      },
    ]);
    expect(report.services[1].characteristics[0].properties).toEqual(['read', 'write']);
  });

  it('keeps going when one service cannot be read', async () => {
    const report = await probeDevice(
      makeProbeDevice(services, { errorOn: '000018f0-0000-1000-8000-00805f9b34fb' })
    );

    expect(report.services).toHaveLength(2);
    expect(report.services[0].characteristics).toEqual([]);
    expect(report.services[1].characteristics).toHaveLength(1);
    expect(report.errors.join(' ')).toMatch(/000018f0/);
  });

  it('lets go of the connection, so it does not block the next pairing attempt', async () => {
    const device = makeProbeDevice(services);

    await probeDevice(device);

    expect(device.gatt.disconnect).toHaveBeenCalled();
  });

  it('records a failure to connect rather than throwing', async () => {
    const device = makeProbeDevice([], {
      connect: vi.fn(async () => { throw new Error('GATT operation failed'); }),
    });

    const report = await probeDevice(device);

    expect(report.connected).toBe(false);
    expect(report.errors).toEqual(['GATT operation failed']);
  });
});

describe('formatProbeReport', () => {
  it('lists every service, characteristic and write mode', async () => {
    const report = await probeDevice(
      makeProbeDevice([
        {
          uuid: '000018f0-0000-1000-8000-00805f9b34fb',
          characteristics: [
            { uuid: '00002af1-0000-1000-8000-00805f9b34fb', properties: { writeWithoutResponse: true } },
          ],
        },
      ])
    );

    const text = formatProbeReport(report);

    expect(text).toContain('PT210_8CF0');
    expect(text).toContain('000018f0-0000-1000-8000-00805f9b34fb');
    expect(text).toContain('00002af1-0000-1000-8000-00805f9b34fb');
    expect(text).toContain('writeWithoutResponse');
  });

  it('explains an empty result rather than looking like a broken printer', async () => {
    const report = await probeDevice(makeProbeDevice([]));

    expect(formatProbeReport(report)).toMatch(/no services/i);
  });

  it('shows the errors it collected', async () => {
    const report = await probeDevice(
      makeProbeDevice([], { connect: vi.fn(async () => { throw new Error('GATT operation failed'); }) })
    );

    expect(formatProbeReport(report)).toContain('GATT operation failed');
  });

  it('says nothing was probed when there is no report yet', () => {
    expect(formatProbeReport(null)).toBe('');
  });
});
