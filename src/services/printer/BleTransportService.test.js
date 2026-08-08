import { describe, it, expect, vi } from 'vitest';
import { streamToDevice } from './BleTransportService.js';

const bluetoothError = (name) => {
  const error = new Error(`${name}: the characteristic does not support this write`);
  error.name = name;
  return error;
};

const makeCharacteristic = ({ properties, failWithResponse = 0, omitTypedWrites = false } = {}) => {
  const received = [];
  const sizes = [];
  let withResponseFailures = failWithResponse;

  const record = (chunk) => {
    received.push(...Array.from(chunk));
    sizes.push(chunk.length);
  };

  const characteristic = { properties, received, sizes };

  if (omitTypedWrites) {
    characteristic.writeValue = vi.fn(async (chunk) => record(chunk));
    return characteristic;
  }

  characteristic.writeValueWithResponse = vi.fn(async (chunk) => {
    if (withResponseFailures > 0) {
      withResponseFailures -= 1;
      throw bluetoothError('NotSupportedError');
    }
    record(chunk);
  });
  characteristic.writeValueWithoutResponse = vi.fn(async (chunk) => record(chunk));

  return characteristic;
};

const payloadOf = (length) => new Uint8Array(Array.from({ length }, (_, i) => i % 256));

describe('streamToDevice', () => {
  it('refuses to print when nothing is connected', async () => {
    await expect(streamToDevice(null, payloadOf(10))).rejects.toThrow(
      'Cannot print: No Bluetooth characteristic is connected.'
    );
  });

  it('writes nothing for an empty payload', async () => {
    const characteristic = makeCharacteristic();
    await streamToDevice(characteristic, new Uint8Array(0));
    expect(characteristic.writeValueWithResponse).not.toHaveBeenCalled();
  });

  it('splits the payload into chunks and delivers every byte in order', async () => {
    const characteristic = makeCharacteristic();
    const payload = payloadOf(300);

    await streamToDevice(characteristic, payload, { chunkSize: 128 });

    expect(characteristic.sizes).toEqual([128, 128, 44]);
    expect(characteristic.received).toEqual(Array.from(payload));
  });

  it('waits for confirmation of each chunk by default', async () => {
    const characteristic = makeCharacteristic();
    await streamToDevice(characteristic, payloadOf(50));
    expect(characteristic.writeValueWithResponse).toHaveBeenCalledTimes(1);
    expect(characteristic.writeValueWithoutResponse).not.toHaveBeenCalled();
  });

  it('clamps unconfirmed writes to what fits in one Bluetooth packet', async () => {
    const characteristic = makeCharacteristic();
    const payload = payloadOf(50);

    await streamToDevice(characteristic, payload, {
      writeMode: 'without-response',
      chunkSize: 128,
      sleep: vi.fn(),
    });

    expect(characteristic.sizes).toEqual([20, 20, 10]);
    expect(characteristic.received).toEqual(Array.from(payload));
    expect(characteristic.writeValueWithResponse).not.toHaveBeenCalled();
  });

  it('pauses between unconfirmed writes, which have no flow control', async () => {
    const sleep = vi.fn();
    await streamToDevice(makeCharacteristic(), payloadOf(50), {
      writeMode: 'without-response',
      sleep,
    });
    expect(sleep).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledWith(expect.any(Number));
  });

  it('does not pause between confirmed writes', async () => {
    const sleep = vi.fn();
    await streamToDevice(makeCharacteristic(), payloadOf(300), { chunkSize: 128, sleep });
    expect(sleep).not.toHaveBeenCalled();
  });

  it('picks unconfirmed writes when that is all the printer offers', async () => {
    const characteristic = makeCharacteristic({
      properties: { write: false, writeWithoutResponse: true },
    });

    await streamToDevice(characteristic, payloadOf(30), { writeMode: 'auto', sleep: vi.fn() });

    expect(characteristic.writeValueWithoutResponse).toHaveBeenCalled();
    expect(characteristic.writeValueWithResponse).not.toHaveBeenCalled();
    expect(characteristic.sizes).toEqual([20, 10]);
  });

  it('prefers confirmed writes when the printer supports them', async () => {
    const characteristic = makeCharacteristic({
      properties: { write: true, writeWithoutResponse: true },
    });

    await streamToDevice(characteristic, payloadOf(30), { writeMode: 'auto' });

    expect(characteristic.writeValueWithResponse).toHaveBeenCalled();
    expect(characteristic.writeValueWithoutResponse).not.toHaveBeenCalled();
  });

  it('retries the rejected chunk unconfirmed, losing no bytes and repeating none', async () => {
    const characteristic = makeCharacteristic({ failWithResponse: 1 });
    const payload = payloadOf(50);

    await streamToDevice(characteristic, payload, { chunkSize: 128, sleep: vi.fn() });

    expect(characteristic.received).toEqual(Array.from(payload));
    expect(characteristic.sizes).toEqual([20, 20, 10]);
  });

  it('stays on unconfirmed writes for the rest of the payload after switching', async () => {
    const characteristic = makeCharacteristic({ failWithResponse: 1 });

    await streamToDevice(characteristic, payloadOf(50), { chunkSize: 128, sleep: vi.fn() });

    expect(characteristic.writeValueWithResponse).toHaveBeenCalledTimes(1);
    expect(characteristic.writeValueWithoutResponse).toHaveBeenCalledTimes(3);
  });

  it('reports a failure that is not about the write mode', async () => {
    const characteristic = makeCharacteristic();
    characteristic.writeValueWithResponse = vi.fn(async () => {
      throw bluetoothError('NetworkError');
    });

    await expect(streamToDevice(characteristic, payloadOf(30))).rejects.toThrow('NetworkError');
  });

  it('reports a second failure rather than switching again', async () => {
    const characteristic = makeCharacteristic({ failWithResponse: 1 });
    characteristic.writeValueWithoutResponse = vi.fn(async () => {
      throw bluetoothError('NotSupportedError');
    });

    await expect(
      streamToDevice(characteristic, payloadOf(30), { sleep: vi.fn() })
    ).rejects.toThrow('NotSupportedError');
  });

  it('uses the untyped write on browsers that only offer that one', async () => {
    const characteristic = makeCharacteristic({ omitTypedWrites: true });
    const payload = payloadOf(30);

    await streamToDevice(characteristic, payload, { chunkSize: 128 });

    expect(characteristic.writeValue).toHaveBeenCalledTimes(1);
    expect(characteristic.received).toEqual(Array.from(payload));
  });
});
