import { Box } from '@chakra-ui/react';

export default function ModalBackdrop({ onClose, children, maxW = "sm", ...props }) {
  return (
    <Box 
      position="fixed" 
      top="0" 
      left="0" 
      w="100vw" 
      h="100vh" 
      bg="blackAlpha.700" 
      zIndex="1000" 
      display="flex" 
      alignItems="center" 
      justifyContent="center" 
      onClick={onClose}
      {...props}
    >
      <Box 
        bg="gray.900" 
        p="4" 
        borderRadius="lg" 
        border="1px solid" 
        borderColor="whiteAlpha.300" 
        onClick={e => e.stopPropagation()} 
        maxW={maxW} 
        w="100%"
      >
        {children}
      </Box>
    </Box>
  );
}
