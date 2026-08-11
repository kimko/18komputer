import { useWebBluetooth } from './useWebBluetooth.js';
import { PrinterConnectionContext } from './printerConnection.js';

export function PrinterConnectionProvider({ children }) {
  const connection = useWebBluetooth();
  return (
    <PrinterConnectionContext.Provider value={connection}>
      {children}
    </PrinterConnectionContext.Provider>
  );
}
