import { Portal, Toast, Toaster as ChakraToaster } from '@chakra-ui/react';
import { toaster } from './toast.js';

export default function Toaster() {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: '4' }}>
        {(toast) => (
          <Toast.Root width={{ md: 'sm' }}>
            <Toast.Indicator />
            <Toast.Title>{toast.title}</Toast.Title>
            {toast.description && <Toast.Description>{toast.description}</Toast.Description>}
            <Toast.CloseTrigger />
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  );
}
