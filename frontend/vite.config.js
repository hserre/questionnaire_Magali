import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/

// Préfixe de l'expérience sur le serveur : http://adresse/questionnaire/
// (à changer ici si le chemin change, puis relancer npm run build)
const BASE = "/questionnaire/";

export default defineConfig({
  base: BASE,
  build: { target: "safari13" },
  plugins: [react()],
  server: {
    proxy: {
      [`${BASE}api`]: {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      [`${BASE}Entry_data`]: {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
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
