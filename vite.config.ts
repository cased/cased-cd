import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import clickToComponent from 'vite-plugin-react-click-to-component'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    clickToComponent({
      editor: process.env.EDITOR || 'code' // defaults to VS Code if not set
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
