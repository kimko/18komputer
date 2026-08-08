const DEFAULT_CHUNK_SIZE = 128;

// An unconfirmed write must fit one packet (ATT MTU 23 minus 3 bytes of header)
// or the printer silently drops the tail, and it has no flow control of its own.
const UNCONFIRMED_CHUNK_SIZE = 20;
const UNCONFIRMED_GAP_MS = 20;

const WRONG_WRITE_MODE = ['NotSupportedError', 'NotAllowedError'];

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveMode = (characteristic, requested) => {
  if (requested !== 'auto') return requested;
  const properties = characteristic.properties;
  if (!properties) return 'with-response';
  if (properties.write) return 'with-response';
  return properties.writeWithoutResponse ? 'without-response' : 'with-response';
};

const chunkSizeFor = (mode, requested) => {
  const size = requested || DEFAULT_CHUNK_SIZE;
  return mode === 'without-response' ? Math.min(size, UNCONFIRMED_CHUNK_SIZE) : size;
};

const write = (characteristic, mode, chunk) => {
  if (mode === 'without-response') {
    return characteristic.writeValueWithoutResponse
      ? characteristic.writeValueWithoutResponse(chunk)
      : characteristic.writeValue(chunk);
  }
  return characteristic.writeValueWithResponse
    ? characteristic.writeValueWithResponse(chunk)
    : characteristic.writeValue(chunk);
};

/**
 * Streams a payload to a Bluetooth characteristic in chunks.
 * @param {BluetoothRemoteGATTCharacteristic} characteristic
 * @param {Uint8Array} payloadArray
 * @param {{chunkSize?: number, writeMode?: 'auto'|'with-response'|'without-response', sleep?: Function}} options
 */
export const streamToDevice = async (characteristic, payloadArray, options = {}) => {
  if (!characteristic) {
    throw new Error("Cannot print: No Bluetooth characteristic is connected.");
  }

  const sleep = options.sleep || defaultSleep;
  let mode = resolveMode(characteristic, options.writeMode || 'with-response');
  let hasSwitchedMode = false;
  let sent = 0;

  console.log(
    `[BLE Transport] Streaming ${payloadArray.length} bytes using ${mode} writes...`
  );

  while (sent < payloadArray.length) {
    const size = chunkSizeFor(mode, options.chunkSize);
    const chunk = payloadArray.slice(sent, Math.min(sent + size, payloadArray.length));

    try {
      await write(characteristic, mode, chunk);
    } catch (err) {
      if (mode === 'without-response' || hasSwitchedMode || !WRONG_WRITE_MODE.includes(err.name)) {
        throw err;
      }
      console.log(
        `[BLE Transport] Printer rejected a confirmed write (${err.name}). Resending this chunk unconfirmed.`
      );
      hasSwitchedMode = true;
      mode = 'without-response';
      continue;
    }

    sent += chunk.length;
    if (mode === 'without-response') await sleep(UNCONFIRMED_GAP_MS);
  }

  console.log(`[BLE Transport] Stream complete!`);
};
