import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { terminalBadgesPlugin } from './config/terminalBadges.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), terminalBadgesPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  }
})
