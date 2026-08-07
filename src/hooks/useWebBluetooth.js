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
          
          const serviceUuid = "0000ff00-0000-1000-8000-00805f9b34fb";
          const charUuid = "0000ff02-0000-1000-8000-00805f9b34fb";
          
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

  const connect = useCallback(async (options, characteristicUuid) => {
    try {
      console.log(`[WebBLE] [${new Date().toISOString()}] Initiating manual pairing with options:`, JSON.stringify(options));
      setIsConnecting(true);
      setError(null);
      
      if (!navigator.bluetooth) {
        throw new Error("Web Bluetooth API is not available in this browser. Please use Chrome or Bluefy on iOS.");
      }

      console.log(`[WebBLE] [${new Date().toISOString()}] Requesting device picker...`);
      const device = await navigator.bluetooth.requestDevice(options);
      
      console.log(`[WebBLE] [${new Date().toISOString()}] User selected device: ${device.name || "Unknown Device"} (ID: ${device.id})`);
      setDeviceName(device.name || "Unknown Device");
      
      device.addEventListener('gattserverdisconnected', () => {
         console.log(`[WebBLE] [${new Date().toISOString()}] Device disconnected event fired.`);
         setIsConnected(false);
         setCharacteristic(null);
      });

      console.log(`[WebBLE] [${new Date().toISOString()}] Connecting to GATT server... (this step may take a few seconds)`);
      
      const connectWithTimeout = (gatt, ms) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("GATT connect timeout (15s). Please restart your printer and toggle Mac Bluetooth OFF/ON.")), ms);
          gatt.connect().then(
            res => { clearTimeout(timer); resolve(res); },
            err => { clearTimeout(timer); reject(err); }
          );
        });
      };

      const server = await connectWithTimeout(device.gatt, 15000);
      
      console.log(`[WebBLE] [${new Date().toISOString()}] GATT server connected! Fetching primary service ${options.optionalServices[0]}...`);
      const service = await server.getPrimaryService(options.optionalServices[0]);
      
      console.log(`[WebBLE] [${new Date().toISOString()}] Primary service retrieved! Fetching characteristic ${characteristicUuid}...`);
      const char = await service.getCharacteristic(characteristicUuid);
      
      console.log(`[WebBLE] [${new Date().toISOString()}] Characteristic retrieved! Manual pairing complete.`);
      setCharacteristic(char);
      setIsConnected(true);
    } catch (err) {
      console.error(`[WebBLE] [${new Date().toISOString()}] Bluetooth connection error:`, err);
      let errorMsg = err.message;
      if (errorMsg.includes("Unsupported device")) {
        errorMsg += " (Ensure you are not pairing through macOS settings, and OS Bluetooth is ON).";
      }
      setError(errorMsg);
    } finally {
      console.log(`[WebBLE] [${new Date().toISOString()}] Connect function finished. Removing spinner.`);
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
