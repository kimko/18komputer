import { useState } from 'react';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { useWebBluetooth } from '../../hooks/useWebBluetooth.js';
import { printReceipt } from '../../services/printer/PrinterService.js';
import { formatProbeReport } from '../../services/printer/connectPrinter.js';

export default function ReceiptPrinter({ company, companyName, trains, totalRevenue }) {
  const {
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
  } = useWebBluetooth();
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState(null);

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintError(null);
    try {
      await printReceipt(characteristic, printer, { company, companyName, trains, totalRevenue });
    } catch (err) {
      console.error('Print failed:', err);
      setPrintError(`Print failed: ${err.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Flex direction="column" gap="2" mt="4" p="4" bg="gray.800" borderRadius="md" border="1px solid" borderColor="gray.700">
      <Text fontSize="sm" color="gray.400" fontWeight="bold">
        Receipt Printer{printer ? ` (${printer.displayName})` : ''}
      </Text>

      {error && <Text color="red.400" fontSize="xs">{error}</Text>}
      {printError && <Text color="red.400" fontSize="xs">{printError}</Text>}

      <Flex gap="3" align="center" wrap="wrap">
        {!isConnected ? (
          <Button
            size="sm"
            colorPalette="teal"
            variant="outline"
            onClick={() => connect()}
            loading={isConnecting}
          >
            Pair Printer
          </Button>
        ) : (
          <>
            <Button size="sm" colorPalette="teal" onClick={handlePrint} loading={isPrinting}>
              Print Receipt
            </Button>

            <Button size="sm" variant="ghost" colorPalette="red" onClick={disconnect}>
              Disconnect
            </Button>
            <Text fontSize="xs" color="teal.300">Connected: {deviceName}</Text>
          </>
        )}

        <Button
          size="sm"
          variant="outline"
          color="gray.300"
          borderColor="gray.600"
          onClick={() => probe()}
        >
          Probe BLE
        </Button>
      </Flex>

      {probeReport && (
        <Box
          as="pre"
          mt="2"
          p="2"
          maxH="48"
          overflow="auto"
          bg="gray.900"
          borderRadius="sm"
          color="gray.300"
          fontSize="2xs"
          whiteSpace="pre"
        >
          {formatProbeReport(probeReport)}
        </Box>
      )}
    </Flex>
  );
}
