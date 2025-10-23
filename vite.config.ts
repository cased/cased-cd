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
      // Proxy account creation to local RBAC proxy (creates users in k8s)
      '/api/v1/settings/accounts': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      // Proxy license requests to local RBAC proxy (provides enterprise license)
      '/api/v1/license': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      // Proxy notifications requests to local RBAC proxy (reads argocd-notifications-cm)
      '/api/v1/notifications/config': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      // All other API requests go to real ArgoCD (or mock if VITE_USE_REAL_API not set)
      '/api/v1': {
        target: process.env.VITE_USE_REAL_API ? 'http://localhost:8090' : 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
