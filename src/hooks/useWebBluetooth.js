import { useState, useCallback, useEffect, useRef } from 'react';
import {
  buildRequestOptions,
  buildProbeRequestOptions,
  findPrinterByDeviceName,
} from '../services/printer/printerRegistry.js';
import {
  openPrinterConnection,
  probeDevice,
  formatProbeReport,
} from '../services/printer/connectPrinter.js';

const LAST_DEVICE_KEY = 'printer.lastDeviceId';
const LAST_PRINTER_KEY = 'printer.lastPrinterId';

// Nobody is waiting on the background attempt, so it gets a shorter budget.
const BACKGROUND_TIMEOUT_MS = 5000;

const NO_BLUETOOTH =
  'Web Bluetooth is not available in this browser. Please use Chrome, or Bluefy on iOS.';

const isCancellation = (err) => err.name === 'NotFoundError' && /cancel/i.test(err.message);

export function useWebBluetooth() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [characteristic, setCharacteristic] = useState(null);
  const [deviceName, setDeviceName] = useState(null);
  const [printer, setPrinter] = useState(null);
  const [probeReport, setProbeReport] = useState(null);

  const isMounted = useRef(true);
  useEffect(() => () => {
    isMounted.current = false;
  }, []);

  const handleDisconnected = useCallback(() => {
    console.log('[WebBLE] Printer disconnected.');
    setIsConnected(false);
    setCharacteristic(null);
    setPrinter(null);
  }, []);

  const applyConnection = useCallback((connection) => {
    localStorage.setItem(LAST_DEVICE_KEY, connection.device.id || '');
    localStorage.setItem(LAST_PRINTER_KEY, connection.printer.id);
    setCharacteristic(connection.characteristic);
    setPrinter(connection.printer);
    setDeviceName(connection.device.name || connection.printer.displayName);
    setIsConnected(true);
  }, []);

  useEffect(() => {
    const autoConnect = async () => {
      if (!navigator.bluetooth || !navigator.bluetooth.getDevices) {
        console.log('[WebBLE] This browser cannot list paired devices. Auto-connect skipped.');
        return;
      }

      const paired = await navigator.bluetooth.getDevices();
      const candidates = paired
        .map((device) => ({ device, printer: findPrinterByDeviceName(device.name) }))
        .filter((candidate) => candidate.printer);

      if (candidates.length === 0) {
        console.log('[WebBLE] No paired printers found. Manual pairing required.');
        return;
      }

      const lastDeviceId = localStorage.getItem(LAST_DEVICE_KEY);
      const lastPrinterId = localStorage.getItem(LAST_PRINTER_KEY);
      const rank = (candidate) => {
        if (lastDeviceId && candidate.device.id === lastDeviceId) return 0;
        if (lastPrinterId && candidate.printer.id === lastPrinterId) return 1;
        return 2;
      };
      candidates.sort((a, b) => rank(a) - rank(b));

      setIsConnecting(true);
      try {
        for (const candidate of candidates) {
          try {
            const connection = await openPrinterConnection(candidate.device, candidate.printer, {
              timeoutMs: BACKGROUND_TIMEOUT_MS,
              onDisconnect: handleDisconnected,
            });
            if (isMounted.current) applyConnection(connection);
            return;
          } catch (err) {
            console.log(
              `[WebBLE] Could not reconnect to ${candidate.device.name || 'a paired printer'}: ${err.message}`
            );
          }
        }
      } finally {
        if (isMounted.current) setIsConnecting(false);
      }
    };

    autoConnect().catch((err) => console.error('[WebBLE] Auto-connect failed:', err));
  }, [applyConnection, handleDisconnected]);

  const connect = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      if (!navigator.bluetooth) throw new Error(NO_BLUETOOTH);

      const device = await navigator.bluetooth.requestDevice(buildRequestOptions());
      const matched = findPrinterByDeviceName(device.name);
      if (!matched) {
        throw new Error(
          `"${device.name || 'That device'}" is not a printer this app knows. Use Probe to see what it offers.`
        );
      }

      setDeviceName(device.name || matched.displayName);
      applyConnection(
        await openPrinterConnection(device, matched, { onDisconnect: handleDisconnected })
      );
    } catch (err) {
      if (isCancellation(err)) {
        console.log('[WebBLE] Pairing cancelled.');
      } else {
        console.error('[WebBLE] Bluetooth connection error:', err);
        setError(err.message);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [applyConnection, handleDisconnected]);

  const probe = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      if (!navigator.bluetooth) throw new Error(NO_BLUETOOTH);

      const device = await navigator.bluetooth.requestDevice(buildProbeRequestOptions());
      const report = await probeDevice(device);
      console.log(formatProbeReport(report));
      setProbeReport(report);
    } catch (err) {
      if (isCancellation(err)) {
        console.log('[WebBLE] Probe cancelled.');
      } else {
        console.error('[WebBLE] Probe failed:', err);
        setError(err.message);
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    const gatt = characteristic?.service?.device?.gatt;
    if (gatt?.connected) gatt.disconnect();

    localStorage.removeItem(LAST_DEVICE_KEY);
    setCharacteristic(null);
    setPrinter(null);
    setIsConnected(false);
    setDeviceName(null);
  }, [characteristic]);

  return {
    connect,
    disconnect,
    probe,
    isConnected,
    isConnecting,
    error,
    characteristic,
    deviceName,
    printer,
    probeReport,
  };
}
