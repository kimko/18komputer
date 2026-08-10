import { describe, it, expect, vi, beforeEach } from 'vitest';
import { printReceipt, printResults } from './PrinterService.js';
import { streamToDevice } from './BleTransportService.js';

vi.mock('./BleTransportService.js', () => ({
  streamToDevice: vi.fn(),
}));

const characteristic = { id: 'fake-characteristic' };

const labelPrinter = (payloads) => ({
  id: 'd30',
  chunkSize: 128,
  writeMode: 'with-response',
  interPayloadDelayMs: 500,
  buildPayloads: vi.fn(async () => payloads),
});

const receiptPrinter = (payloads) => ({
  id: 'pt210',
  chunkSize: 128,
  writeMode: 'auto',
  interPayloadDelayMs: 0,
  buildPayloads: vi.fn(async () => payloads),
});

describe('printReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks the printer to build the payloads from the receipt data', async () => {
    const receiptData = { company: 'B&O', trains: [], totalRevenue: 0 };
    const printer = receiptPrinter([new Uint8Array([1])]);

    await printReceipt(characteristic, printer, receiptData);

    expect(printer.buildPayloads).toHaveBeenCalledTimes(1);
    expect(printer.buildPayloads).toHaveBeenCalledWith(receiptData);
  });

  it('sends every payload in order', async () => {
    const payloads = [new Uint8Array([1, 2]), new Uint8Array([3, 4]), new Uint8Array([5])];

    await printReceipt(characteristic, labelPrinter(payloads), {}, { sleep: vi.fn() });

    expect(streamToDevice).toHaveBeenCalledTimes(3);
    payloads.forEach((payload, index) => {
      expect(streamToDevice.mock.calls[index][0]).toBe(characteristic);
      expect(streamToDevice.mock.calls[index][1]).toBe(payload);
    });
  });

  it('passes the printer chunk size and write mode through to the transport', async () => {
    const printer = receiptPrinter([new Uint8Array([1])]);

    await printReceipt(characteristic, printer, {});

    expect(streamToDevice).toHaveBeenCalledWith(characteristic, expect.any(Uint8Array), {
      chunkSize: 128,
      writeMode: 'auto',
    });
  });

  it('waits between labels so the D30 can settle', async () => {
    const sleep = vi.fn();
    const payloads = [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])];

    await printReceipt(characteristic, labelPrinter(payloads), {}, { sleep });

    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(500);
  });

  it('does not wait after the last label', async () => {
    const sleep = vi.fn();

    await printReceipt(characteristic, labelPrinter([new Uint8Array([1])]), {}, { sleep });

    expect(sleep).not.toHaveBeenCalled();
  });

  it('never waits for a receipt printer, which prints one continuous strip', async () => {
    const sleep = vi.fn();
    const payloads = [new Uint8Array([1]), new Uint8Array([2])];

    await printReceipt(characteristic, receiptPrinter(payloads), {}, { sleep });

    expect(sleep).not.toHaveBeenCalled();
  });

  it('reports a failure to build the payloads', async () => {
    const printer = receiptPrinter([]);
    printer.buildPayloads = vi.fn(async () => {
      throw new Error('bad receipt data');
    });

    await expect(printReceipt(characteristic, printer, {})).rejects.toThrow('bad receipt data');
    expect(streamToDevice).not.toHaveBeenCalled();
  });

  it('reports a failure to send, and stops rather than trying later payloads', async () => {
    streamToDevice.mockRejectedValueOnce(new Error('printer went away'));
    const payloads = [new Uint8Array([1]), new Uint8Array([2])];

    await expect(
      printReceipt(characteristic, labelPrinter(payloads), {}, { sleep: vi.fn() })
    ).rejects.toThrow('printer went away');
    expect(streamToDevice).toHaveBeenCalledTimes(1);
  });

  it('refuses to print when no printer is selected', async () => {
    await expect(printReceipt(characteristic, null, {})).rejects.toThrow(
      'Cannot print: no printer is selected.'
    );
  });
});

describe('printResults', () => {
  const payload = new Uint8Array([1, 2, 3]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refuses when no printer is selected', async () => {
    await expect(printResults(characteristic, null, {})).rejects.toThrow('no printer is selected');
  });

  it('explains itself when the printer cannot do results', async () => {
    const labelOnlyPrinter = { id: 'd30', displayName: 'Phomemo D30', buildPayloads: vi.fn() };
    await expect(printResults(characteristic, labelOnlyPrinter, {}))
      .rejects.toThrow('Phomemo D30 cannot print results');
  });

  it('builds from the results builder, not the receipt one', async () => {
    const buildResultsPayloads = vi.fn().mockResolvedValue([payload]);
    const buildPayloads = vi.fn();
    const printer = { id: 'pt210', buildResultsPayloads, buildPayloads, chunkSize: 128, writeMode: 'auto' };

    await printResults(characteristic, printer, { gameName: 'x' });

    expect(buildResultsPayloads).toHaveBeenCalledWith({ gameName: 'x' });
    expect(buildPayloads).not.toHaveBeenCalled();
  });

  it('sends every payload in order', async () => {
    const second = new Uint8Array([4]);
    const printer = {
      id: 'pt210',
      buildResultsPayloads: vi.fn().mockResolvedValue([payload, second]),
      chunkSize: 128, writeMode: 'auto'
    };

    await printResults(characteristic, printer, {});

    expect(streamToDevice).toHaveBeenNthCalledWith(1, characteristic, payload, expect.any(Object));
    expect(streamToDevice).toHaveBeenNthCalledWith(2, characteristic, second, expect.any(Object));
  });
});
