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
