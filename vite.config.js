import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import { execSync } from 'child_process'

const packageJson = JSON.parse(fs.readFileSync('./package.json'));
let gitHash = '';
try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  // Fallback if git is not available (e.g. shallow clone without history)
}
const appVersion = gitHash ? `${packageJson.version}-${gitHash}` : packageJson.version;

const versionInfo = {
  version: packageJson.version,
  commit: gitHash,
  appVersion: appVersion,
  buildTime: new Date().toISOString()
};

// Generate the static endpoint file
if (!fs.existsSync('./public')) fs.mkdirSync('./public');
fs.writeFileSync('./public/version.json', JSON.stringify(versionInfo, null, 2));

// https://vite.dev/config/
export default defineConfig({
  base: '/18komputer/',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion)
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: '18komputer',
        short_name: '18komputer',
        description: '18XX Board Game Assistant',
        theme_color: '#1a202c', // chakra gray.900
        background_color: '#1a202c',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1000
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/setupTests.js'],
    exclude: ['tests/**', 'node_modules/**'],
  }
})
