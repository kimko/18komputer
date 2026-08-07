// The Phomemo D30 requires chunks to be relatively small. 
// 128 bytes is recommended by the reference repository.
const PACKET_SIZE_BYTES = 128;

/**
 * Streams a Uint8Array payload to a Bluetooth GATT Characteristic in chunks.
 * Uses writeValueWithResponse to ensure reliable delivery over BLE.
 * 
 * @param {BluetoothRemoteGATTCharacteristic} characteristic 
 * @param {Uint8Array} payloadArray 
 */
export const streamToDevice = async (characteristic, payloadArray) => {
  if (!characteristic) {
    throw new Error("Cannot print: No Bluetooth characteristic is connected.");
  }

  console.log(`[BLE Transport] Starting stream of ${payloadArray.length} bytes in chunks of ${PACKET_SIZE_BYTES}...`);

  for (let i = 0; i < payloadArray.length; i += PACKET_SIZE_BYTES) {
    let chunk;
    if (i + PACKET_SIZE_BYTES < payloadArray.length) {
      chunk = payloadArray.slice(i, i + PACKET_SIZE_BYTES);
    } else {
      chunk = payloadArray.slice(i, payloadArray.length);
    }
    
    console.log(`[BLE Transport] Sending chunk ${i} to ${i + chunk.length - 1}...`);
    // Using writeValueWithResponse guarantees the hardware acknowledged the packet before sending the next one
    await characteristic.writeValueWithResponse(chunk);
  }

  console.log(`[BLE Transport] Stream complete!`);
};
