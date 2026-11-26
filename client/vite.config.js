import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Any request starting with /api is forwarded to the Express server,
    // so the React code can just call fetch('/api/...').
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
