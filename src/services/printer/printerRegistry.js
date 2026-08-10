import { generatePhomemoPayload } from './PhomemoD30Driver.js';
import { generatePt210Payload, generateResultsPayload } from './Pt210Driver.js';

const shortUuid = (short) => `0000${short}-0000-1000-8000-00805f9b34fb`;

const D30 = {
  id: 'd30',
  displayName: 'Phomemo D30',
  namePrefixes: ['D30'],
  transport: 'ble',
  endpoints: [{ service: shortUuid('ff00'), characteristic: shortUuid('ff02') }],
  writeMode: 'with-response',
  chunkSize: 128,
  interPayloadDelayMs: 500,
  buildPayloads: generatePhomemoPayload,
};

// The PT-210's real ids are unknown, so these are the pairs cheap ESC/POS
// printers are commonly built on, most likely first.
const PT210 = {
  id: 'pt210',
  displayName: 'GOOJPRT PT-210',
  namePrefixes: ['PT210', 'PT-210'],
  transport: 'ble',
  endpoints: [
    { service: shortUuid('18f0'), characteristic: shortUuid('2af1') },
    { service: shortUuid('ff00'), characteristic: shortUuid('ff02') },
    {
      service: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      characteristic: '49535343-8841-43f4-a8d4-ecbe34729bb3',
    },
    {
      service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
      characteristic: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    },
    { service: shortUuid('ae30'), characteristic: shortUuid('ae01') },
    { service: shortUuid('fee7'), characteristic: shortUuid('fec7') },
  ],
  writeMode: 'auto',
  chunkSize: 128,
  interPayloadDelayMs: 0,
  buildPayloads: generatePt210Payload,
  buildResultsPayloads: generateResultsPayload,
};

export const PRINTERS = [D30, PT210];

// Requesting a blocked id makes the browser reject the whole pairing request.
// This list grows over time, so add to it when a SecurityError names a new one.
export const BLOCKED_SERVICES = [shortUuid('fff9'), shortUuid('fffd'), shortUuid('fe2c')];

const allEndpoints = () => PRINTERS.flatMap((printer) => printer.endpoints);

export function findPrinterById(id) {
  return PRINTERS.find((printer) => printer.id === id) || null;
}

export function findPrinterByDeviceName(name) {
  if (!name) return null;
  const upper = String(name).toUpperCase();
  return (
    PRINTERS.find((printer) =>
      printer.namePrefixes.some((prefix) => upper.startsWith(prefix.toUpperCase()))
    ) || null
  );
}

export function buildRequestOptions() {
  return {
    filters: PRINTERS.flatMap((printer) =>
      printer.namePrefixes.map((namePrefix) => ({ namePrefix }))
    ),
    optionalServices: [...new Set(allEndpoints().map((endpoint) => endpoint.service))],
  };
}

export function buildProbeRequestOptions() {
  const sweep = [];
  for (let short = 0xff00; short <= 0xffff; short++) {
    sweep.push(shortUuid(short.toString(16)));
  }

  const candidates = new Set([...allEndpoints().map((endpoint) => endpoint.service), ...sweep]);
  BLOCKED_SERVICES.forEach((blocked) => candidates.delete(blocked));

  return { acceptAllDevices: true, optionalServices: [...candidates] };
}
