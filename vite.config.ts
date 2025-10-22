import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Proxy RBAC settings requests to local RBAC proxy (high-fidelity testing)
      '/api/v1/settings/rbac': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      // All other API requests go to mock server
      '/api/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
