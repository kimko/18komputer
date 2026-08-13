import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initMonitoring } from './services/monitoring/monitoring.js'

initMonitoring()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ChakraProvider value={defaultSystem}>
      <ErrorBoundary><App /></ErrorBoundary>
    </ChakraProvider>
  </StrictMode>,
)
