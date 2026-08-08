const DEFAULT_TIMEOUT_MS = 15000;

export function connectWithTimeout(gatt, ms = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            `GATT connect timeout (${ms / 1000}s). Please restart your printer and toggle Bluetooth OFF/ON.`
          )
        ),
      ms
    );
    gatt.connect().then(
      (server) => {
        clearTimeout(timer);
        resolve(server);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function resolveWriteCharacteristic(server, printer) {
  const tried = [];

  for (const endpoint of printer.endpoints) {
    try {
      const service = await server.getPrimaryService(endpoint.service);
      const characteristic = await service.getCharacteristic(endpoint.characteristic);
      console.log(`[WebBLE] Printing on service ${endpoint.service}, characteristic ${endpoint.characteristic}.`);
      return { characteristic, endpoint };
    } catch {
      tried.push(`${endpoint.service} / ${endpoint.characteristic}`);
    }
  }

  throw new Error(
    `Connected to the ${printer.displayName} but found no way to send it data. Tried:\n${tried.join('\n')}\nUse Probe to see what this device actually offers.`
  );
}

// BluetoothCharacteristicProperties exposes getters, not own keys, so
// Object.keys() on it returns nothing and the names have to be listed.
const PROPERTY_NAMES = [
  'broadcast',
  'read',
  'writeWithoutResponse',
  'write',
  'notify',
  'indicate',
  'authenticatedSignedWrites',
  'reliableWrite',
  'writableAuxiliaries',
];

const propertyNames = (properties) =>
  properties ? PROPERTY_NAMES.filter((name) => properties[name]) : [];

export async function probeDevice(device, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const report = {
    name: device.name || null,
    id: device.id || null,
    connected: false,
    services: [],
    errors: [],
  };

  try {
    const server = await connectWithTimeout(device.gatt, timeoutMs);
    report.connected = true;

    for (const service of await server.getPrimaryServices()) {
      const entry = { uuid: service.uuid, characteristics: [] };
      try {
        const characteristics = await service.getCharacteristics();
        entry.characteristics = characteristics.map((characteristic) => ({
          uuid: characteristic.uuid,
          properties: propertyNames(characteristic.properties),
        }));
      } catch (err) {
        report.errors.push(`Could not read characteristics of ${service.uuid}: ${err.message}`);
      }
      report.services.push(entry);
    }
  } catch (err) {
    report.errors.push(err.message);
  } finally {
    // Holding the probed connection open would block the next pairing attempt.
    if (device.gatt && device.gatt.connected) device.gatt.disconnect();
  }

  return report;
}

export function formatProbeReport(report) {
  if (!report) return '';

  const lines = [
    `Device: ${report.name || 'unnamed'} (${report.id || 'no id'})`,
    `Connected: ${report.connected ? 'yes' : 'no'}`,
  ];

  if (report.services.length === 0) {
    lines.push(
      '',
      'No services were readable. Either this device does not speak Bluetooth',
      'Low Energy, or its service ids are outside the range we ask for.'
    );
  }

  report.services.forEach((service) => {
    lines.push('', `service ${service.uuid}`);
    if (service.characteristics.length === 0) {
      lines.push('  (no characteristics readable)');
    }
    service.characteristics.forEach((characteristic) => {
      lines.push(`  char ${characteristic.uuid}  [${characteristic.properties.join(', ')}]`);
    });
  });

  if (report.errors.length > 0) {
    lines.push('', 'Errors:');
    report.errors.forEach((error) => lines.push(`  ${error}`));
  }

  return lines.join('\n');
}

export async function openPrinterConnection(
  device,
  printer,
  { timeoutMs = DEFAULT_TIMEOUT_MS, onDisconnect } = {}
) {
  if (onDisconnect) {
    device.addEventListener('gattserverdisconnected', onDisconnect, { once: true });
  }

  console.log(`[WebBLE] Connecting to ${device.name || 'unnamed device'} as a ${printer.displayName}...`);
  const server = await connectWithTimeout(device.gatt, timeoutMs);
  const { characteristic, endpoint } = await resolveWriteCharacteristic(server, printer);

  return { device, printer, characteristic, endpoint };
}
