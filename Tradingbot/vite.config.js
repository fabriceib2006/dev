import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In dev mode, proxy /api calls to Netlify Functions via netlify dev
      '/.netlify': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      }
    }
  }
})