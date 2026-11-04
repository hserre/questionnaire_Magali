import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/

export default defineConfig({
  build: { target: "safari13" },
  plugins: [react()],
  server: {
    allowedHosts: [
      'several-personalized-adjusted-temp.trycloudflare.com',
      'reforest-thinning-spoiled.ngrok-free.dev'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/Entry_data': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
