import { describe, it, expect } from 'vitest';
import {
  PRINTERS,
  BLOCKED_SERVICES,
  findPrinterById,
  findPrinterByDeviceName,
  buildRequestOptions,
  buildProbeRequestOptions,
} from './printerRegistry.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('PRINTERS', () => {
  it('lists both supported printers', () => {
    expect(PRINTERS.map((p) => p.id)).toEqual(['d30', 'pt210']);
  });

  it('gives every printer a unique id', () => {
    const ids = PRINTERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every printer the fields the connection and print code relies on', () => {
    PRINTERS.forEach((printer) => {
      expect(printer.displayName).toBeTruthy();
      expect(printer.namePrefixes.length).toBeGreaterThan(0);
      expect(printer.endpoints.length).toBeGreaterThan(0);
      expect(typeof printer.buildPayloads).toBe('function');
      expect(printer.chunkSize).toBeGreaterThan(0);
      expect(['auto', 'with-response', 'without-response']).toContain(printer.writeMode);
      expect(typeof printer.interPayloadDelayMs).toBe('number');
    });
  });

  it('writes every Bluetooth id in the lowercase full form the browser expects', () => {
    PRINTERS.flatMap((p) => p.endpoints).forEach((endpoint) => {
      expect(endpoint.service).toMatch(UUID);
      expect(endpoint.characteristic).toMatch(UUID);
    });
  });

  it('keeps the D30 on the settings it is already proven to work with', () => {
    const d30 = findPrinterById('d30');
    expect(d30.endpoints).toEqual([
      {
        service: '0000ff00-0000-1000-8000-00805f9b34fb',
        characteristic: '0000ff02-0000-1000-8000-00805f9b34fb',
      },
    ]);
    expect(d30.writeMode).toBe('with-response');
    expect(d30.chunkSize).toBe(128);
    expect(d30.interPayloadDelayMs).toBe(500);
  });

  it('lets the receipt printer print results, and not the label printer', () => {
    expect(typeof findPrinterById('pt210').buildResultsPayloads).toBe('function');
    expect(findPrinterById('d30').buildResultsPayloads).toBeUndefined();
  });

  it('gives the PT-210 several ids to try, since its real ones are unknown', () => {
    const pt210 = findPrinterById('pt210');
    expect(pt210.endpoints.length).toBeGreaterThan(1);
    expect(pt210.interPayloadDelayMs).toBe(0);
  });
});

describe('findPrinterById', () => {
  it('finds a printer by id', () => {
    expect(findPrinterById('pt210').displayName).toBe('GOOJPRT PT-210');
  });

  it('returns null for an unknown id', () => {
    expect(findPrinterById('nope')).toBeNull();
    expect(findPrinterById(undefined)).toBeNull();
  });
});

describe('findPrinterByDeviceName', () => {
  it('matches the name the PT-210 advertises', () => {
    expect(findPrinterByDeviceName('PT210_8CF0').id).toBe('pt210');
  });

  it('ignores letter case', () => {
    expect(findPrinterByDeviceName('pt210_8cf0').id).toBe('pt210');
  });

  it('matches the hyphenated firmware variant', () => {
    expect(findPrinterByDeviceName('PT-210').id).toBe('pt210');
  });

  it('matches the D30', () => {
    expect(findPrinterByDeviceName('D30-1234').id).toBe('d30');
  });

  it('returns null for anything else', () => {
    expect(findPrinterByDeviceName('Galaxy Buds')).toBeNull();
    expect(findPrinterByDeviceName('')).toBeNull();
    expect(findPrinterByDeviceName(null)).toBeNull();
    expect(findPrinterByDeviceName(undefined)).toBeNull();
  });
});

describe('buildRequestOptions', () => {
  const options = buildRequestOptions();

  it('offers a name filter for every printer and every naming variant', () => {
    expect(options.filters).toEqual([
      { namePrefix: 'D30' },
      { namePrefix: 'PT210' },
      { namePrefix: 'PT-210' },
    ]);
  });

  it('asks for every service any printer might use, with no duplicates', () => {
    const all = PRINTERS.flatMap((p) => p.endpoints).map((e) => e.service);
    expect(new Set(options.optionalServices)).toEqual(new Set(all));
    expect(options.optionalServices).toHaveLength(new Set(all).size);
  });

  it('does not accept all devices, so the chooser stays short', () => {
    expect(options.acceptAllDevices).toBeUndefined();
  });
});

describe('buildProbeRequestOptions', () => {
  const options = buildProbeRequestOptions();

  it('accepts any device, because an unknown printer may not match a name filter', () => {
    expect(options.acceptAllDevices).toBe(true);
    expect(options.filters).toBeUndefined();
  });

  it('asks for every service a printer is known to use', () => {
    PRINTERS.flatMap((p) => p.endpoints).forEach((endpoint) => {
      expect(options.optionalServices).toContain(endpoint.service);
    });
  });

  it('sweeps the vendor-specific id range, where cheap printers usually sit', () => {
    expect(options.optionalServices).toContain('0000ff00-0000-1000-8000-00805f9b34fb');
    expect(options.optionalServices).toContain('0000ffff-0000-1000-8000-00805f9b34fb');
    expect(options.optionalServices).toContain('0000ff7a-0000-1000-8000-00805f9b34fb');
  });

  it('leaves out the ids the browser blocks, which would fail the whole request', () => {
    expect(BLOCKED_SERVICES.length).toBeGreaterThan(0);
    BLOCKED_SERVICES.forEach((blocked) => {
      expect(options.optionalServices).not.toContain(blocked);
    });
  });

  it('contains no duplicates', () => {
    expect(new Set(options.optionalServices).size).toBe(options.optionalServices.length);
  });
});
