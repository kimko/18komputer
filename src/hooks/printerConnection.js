import { createContext, useContext } from 'react';

// One connection for the whole app, so pairing on the calculator also covers the results screen.
export const PrinterConnectionContext = createContext(null);

export function usePrinterConnection() {
  const connection = useContext(PrinterConnectionContext);
  if (!connection) throw new Error('usePrinterConnection needs a PrinterConnectionProvider above it');
  return connection;
}
