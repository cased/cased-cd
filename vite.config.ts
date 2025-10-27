import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import { codeInspectorPlugin } from 'code-inspector-plugin'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
    codeInspectorPlugin({
      bundler: 'vite',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Only proxy enterprise features to backend if VITE_ENTERPRISE_BACKEND is set
      ...(process.env.VITE_ENTERPRISE_BACKEND ? {
        // Proxy RBAC settings requests to local RBAC proxy (high-fidelity testing)
        '/api/v1/settings/rbac': {
          target: 'http://localhost:8081',
          changeOrigin: true,
        },
        // Proxy account list to local RBAC proxy (reads from k8s)
        '/api/v1/account': {
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
        // Proxy audit requests to local RBAC proxy (provides audit logging)
        '/api/v1/settings/audit': {
          target: 'http://localhost:8081',
          changeOrigin: true,
        },
        // Proxy notification requests to local RBAC proxy (returns empty config)
        '/api/v1/notifications': {
          target: 'http://localhost:8081',
          changeOrigin: true,
        },
        // Proxy session (login) requests to local RBAC proxy (for audit logging)
        '/api/v1/session': {
          target: 'http://localhost:8081',
          changeOrigin: true,
        },
      } : {}),
      // All other API requests go to real ArgoCD (or mock if VITE_USE_REAL_API not set)
      '/api/v1': {
        target: process.env.VITE_USE_REAL_API ? 'http://localhost:8090' : 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
