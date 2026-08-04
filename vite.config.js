import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/18komputer/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/setupTests.js'],
  }
})
