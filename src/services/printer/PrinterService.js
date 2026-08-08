import { streamToDevice } from './BleTransportService.js';

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Builds and sends a receipt using the settings of the connected printer.
 * @param {BluetoothRemoteGATTCharacteristic} characteristic
 * @param {Object} printer descriptor from printerRegistry.js
 * @param {Object} receiptData { company, companyName, trains, totalRevenue }
 */
export const printReceipt = async (
  characteristic,
  printer,
  receiptData,
  { sleep = defaultSleep } = {}
) => {
  if (!printer) {
    throw new Error('Cannot print: no printer is selected.');
  }

  const payloads = await printer.buildPayloads(receiptData);
  console.log(`[Printer] Sending ${payloads.length} payload(s) to the ${printer.displayName || printer.id}.`);

  for (let i = 0; i < payloads.length; i++) {
    await streamToDevice(characteristic, payloads[i], {
      chunkSize: printer.chunkSize,
      writeMode: printer.writeMode,
    });

    if (i < payloads.length - 1 && printer.interPayloadDelayMs) {
      await sleep(printer.interPayloadDelayMs);
    }
  }
};
