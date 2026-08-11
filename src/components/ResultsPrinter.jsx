import { useState } from 'react';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { usePrinterConnection } from '../hooks/printerConnection.js';
import { printResults } from '../services/printer/PrinterService.js';
import { saveGameToSheet } from '../services/remote/gamesSheet.js';
import { buildRemoteLink } from '../services/printer/shareLink.js';

export default function ResultsPrinter({ gameInstance, dashboardState, maxOr }) {
  const { connect, disconnect, isConnected, isConnecting, error, characteristic, deviceName, printer } = usePrinterConnection();
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState(null);
  const [saveWarning, setSaveWarning] = useState(null);

  const canPrintResults = Boolean(printer?.buildResultsPayloads);

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintError(null);
    setSaveWarning(null);

    // The standings still print without a link, because a code that goes somewhere
    // wrong is worse than no code, and a paper record is worth having either way.
    let shareUrl = null;
    try {
      await saveGameToSheet(gameInstance, dashboardState);
      shareUrl = buildRemoteLink(window.location.origin, window.location.pathname, gameInstance.id);
    } catch (err) {
      console.error('Failed to save the game to the sheet', err);
      setSaveWarning(`${err.message} The receipt prints without a code to scan.`);
    }

    try {
      await printResults(characteristic, printer, {
        gameName: gameInstance.gameName,
        players: gameInstance.players,
        activeCompanies: gameInstance.state?.activeCompanies || [],
        dashboardState,
        maxOr,
        printedAt: new Date(),
        shareUrl
      });
    } catch (err) {
      console.error('Print failed:', err);
      setPrintError(`Print failed: ${err.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Flex direction="column" gap="2" mt="4" p="4" bg="gray.800" borderRadius="md" border="1px solid" borderColor="gray.700">
      <Text fontSize="sm" color="gray.400" fontWeight="bold">Results Receipt</Text>

      {!isConnected && (
        <Flex gap="2">
          <Button size="sm" colorPalette="teal" onClick={connect} loading={isConnecting}>
            Pair Printer
          </Button>
        </Flex>
      )}

      {isConnected && !canPrintResults && (
        <Text fontSize="sm" color="orange.300">
          {deviceName || 'This printer'} prints labels. Results need the receipt printer.
        </Text>
      )}

      {isConnected && canPrintResults && (
        <Flex gap="2">
          <Button size="sm" colorPalette="teal" onClick={handlePrint} loading={isPrinting}>
            Print Results
          </Button>
          <Button size="sm" variant="outline" color="white" onClick={disconnect}>Disconnect</Button>
        </Flex>
      )}

      {saveWarning && <Text fontSize="sm" color="orange.300" role="status">{saveWarning}</Text>}
      {error && <Text fontSize="sm" color="red.300">{error}</Text>}
      {printError && <Box><Text fontSize="sm" color="red.300">{printError}</Text></Box>}
    </Flex>
  );
}
