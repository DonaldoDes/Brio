import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Exclude PGlite from dependency optimization to avoid bundling issues
  optimizeDeps: {
    exclude: ['@electric-sql/pglite'],
  },

  // Build configuration for web mode
  build: {
    outDir: 'dist-web',
    sourcemap: true,
    rollupOptions: {
      // Ensure electron is not bundled in web mode
      external: ['electron'],
    },
  },

  // Server configuration
  server: {
    port: 5173,
    strictPort: false,
  },

  clearScreen: false,
})
