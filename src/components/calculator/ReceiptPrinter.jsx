import { useState } from 'react';
import { Button, Flex, Text } from '@chakra-ui/react';
import { useWebBluetooth } from '../../hooks/useWebBluetooth.js';
import { streamToDevice } from '../../services/printer/BleTransportService.js';
import { generatePhomemoPayload } from '../../services/printer/PhomemoD30Driver.js';
export default function ReceiptPrinter({ company, trains, totalRevenue }) {
  const { connect, disconnect, isConnected, isConnecting, error, characteristic, deviceName } = useWebBluetooth();
  const [isPrinting, setIsPrinting] = useState(false);

  const handleConnect = () => {
    connect(
      { 
        filters: [{ namePrefix: "D30" }], 
        optionalServices: ["0000ff00-0000-1000-8000-00805f9b34fb"] 
      },
      "0000ff02-0000-1000-8000-00805f9b34fb"
    );
  };

  const handlePrint = async () => {
    if (!characteristic) return;
    
    setIsPrinting(true);
    try {
      const receiptData = {
        company,
        trains,
        totalRevenue
      };
      
      const payloads = await generatePhomemoPayload(receiptData);
      for (const payload of payloads) {
        await streamToDevice(characteristic, payload);
        // Wait 500ms between labels
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err) {
      console.error("Print failed:", err);
    } finally {
      setIsPrinting(false);
    }
  };


  return (
    <Flex direction="column" gap="2" mt="4" p="4" bg="gray.800" borderRadius="md" border="1px solid" borderColor="gray.700">
      <Text fontSize="sm" color="gray.400" fontWeight="bold">Receipt Printer (Phomemo D30)</Text>
      
      {error && <Text color="red.400" fontSize="xs">{error}</Text>}
      
      <Flex gap="3" align="center" wrap="wrap">
        {!isConnected ? (
          <Button 
            size="sm" 
            colorPalette="teal" 
            variant="outline" 
            onClick={handleConnect} 
            loading={isConnecting}
          >
            Pair Printer
          </Button>
        ) : (
          <>
            <Button 
              size="sm" 
              colorPalette="teal" 
              onClick={handlePrint}
              loading={isPrinting}
            >
              Print Receipt
            </Button>

            <Button size="sm" variant="ghost" colorPalette="red" onClick={disconnect}>
              Disconnect
            </Button>
            <Text fontSize="xs" color="teal.300">Connected: {deviceName}</Text>
          </>
        )}
      </Flex>
    </Flex>
  );
}
