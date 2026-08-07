import { useState, useCallback } from 'react';

export function useWebBluetooth() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [characteristic, setCharacteristic] = useState(null);
  const [deviceName, setDeviceName] = useState(null);

  const connect = useCallback(async (serviceUuid, characteristicUuid) => {
    try {
      setIsConnecting(true);
      setError(null);
      
      if (!navigator.bluetooth) {
        throw new Error("Web Bluetooth API is not available in this browser. Please use Chrome or Bluefy on iOS.");
      }

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [serviceUuid],
      });
      
      setDeviceName(device.name || "Unknown Device");

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(serviceUuid);
      const char = await service.getCharacteristic(characteristicUuid);
      
      setCharacteristic(char);
      setIsConnected(true);
    } catch (err) {
      console.error("Bluetooth connection error:", err);
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (characteristic && characteristic.service && characteristic.service.device) {
      if (characteristic.service.device.gatt.connected) {
        characteristic.service.device.gatt.disconnect();
      }
    }
    setCharacteristic(null);
    setIsConnected(false);
    setDeviceName(null);
  }, [characteristic]);

  return { connect, disconnect, isConnected, isConnecting, error, characteristic, deviceName };
}
