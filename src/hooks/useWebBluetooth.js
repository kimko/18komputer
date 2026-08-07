import { useState, useCallback, useEffect } from 'react';

export function useWebBluetooth() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [characteristic, setCharacteristic] = useState(null);
  const [deviceName, setDeviceName] = useState(null);

  // Auto-connect logic for previously paired devices
  useEffect(() => {
    const autoConnect = async () => {
      if (!navigator.bluetooth || !navigator.bluetooth.getDevices) {
        console.log("[WebBLE] navigator.bluetooth.getDevices() not supported by this browser. Auto-connect skipped.");
        return;
      }
      
      try {
        console.log("[WebBLE] Checking for previously paired devices...");
        const devices = await navigator.bluetooth.getDevices();
        
        if (devices.length > 0) {
          const device = devices[0]; // Assume the first paired device is our printer for this PoC
          console.log(`[WebBLE] Found previously paired device: ${device.name || "Unknown"}. Attempting background connection...`);
          
          setIsConnecting(true);
          
          device.addEventListener('gattserverdisconnected', () => {
             console.log("[WebBLE] Device disconnected.");
             setIsConnected(false);
             setCharacteristic(null);
          });

          console.log("[WebBLE] Connecting to GATT server...");
          const server = await device.gatt.connect();
          console.log("[WebBLE] GATT Server connected. Fetching primary service...");
          
          const serviceUuid = 0xff00;
          const charUuid = 0xff02;
          
          const service = await server.getPrimaryService(serviceUuid);
          console.log("[WebBLE] Primary service found. Fetching characteristic...");
          
          const char = await service.getCharacteristic(charUuid);
          console.log("[WebBLE] Characteristic found. Ready to print!");
          
          setCharacteristic(char);
          setDeviceName(device.name || "D30");
          setIsConnected(true);
        } else {
          console.log("[WebBLE] No previously paired devices found. Manual pairing required via user gesture.");
        }
      } catch (err) {
        console.error("[WebBLE] Auto-connect failed:", err);
      } finally {
        setIsConnecting(false);
      }
    };

    autoConnect();
  }, []);

  const connect = useCallback(async (filters, optionalServices, characteristicUuid) => {
    try {
      console.log(`[WebBLE] Initiating manual pairing for service ${optionalServices[0]}...`);
      setIsConnecting(true);
      setError(null);
      
      if (!navigator.bluetooth) {
        throw new Error("Web Bluetooth API is not available in this browser. Please use Chrome or Bluefy on iOS.");
      }

      console.log("[WebBLE] Requesting device picker...");
      const device = await navigator.bluetooth.requestDevice({
        filters,
        optionalServices,
      });
      
      console.log(`[WebBLE] User selected device: ${device.name || "Unknown Device"}`);
      setDeviceName(device.name || "Unknown Device");
      
      device.addEventListener('gattserverdisconnected', () => {
         console.log("[WebBLE] Device disconnected.");
         setIsConnected(false);
         setCharacteristic(null);
      });

      console.log("[WebBLE] Connecting to GATT server...");
      const server = await device.gatt.connect();
      
      console.log("[WebBLE] Fetching primary service...");
      const service = await server.getPrimaryService(optionalServices[0]);
      
      console.log("[WebBLE] Fetching characteristic...");
      const char = await service.getCharacteristic(characteristicUuid);
      
      console.log("[WebBLE] Manual pairing complete. Ready to print!");
      setCharacteristic(char);
      setIsConnected(true);
    } catch (err) {
      console.error("[WebBLE] Bluetooth connection error:", err);
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log("[WebBLE] Initiating manual disconnect...");
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
