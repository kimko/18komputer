import { streamToDevice } from './BleTransportService.js';

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendPayloads = async (characteristic, printer, payloads, sleep) => {
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

  await sendPayloads(characteristic, printer, await printer.buildPayloads(receiptData), sleep);
};

/**
 * Builds and sends the end-of-game results slip.
 * @param {Object} printer descriptor from printerRegistry.js
 * @param {Object} resultsData the slip fields plus shareUrl
 */
export const printResults = async (
  characteristic,
  printer,
  resultsData,
  { sleep = defaultSleep } = {}
) => {
  if (!printer) {
    throw new Error('Cannot print: no printer is selected.');
  }
  if (!printer.buildResultsPayloads) {
    throw new Error(`The ${printer.displayName || printer.id} cannot print results. Connect the receipt printer.`);
  }

  await sendPayloads(characteristic, printer, await printer.buildResultsPayloads(resultsData), sleep);
};
