import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',   // change to "0.0.0.0" if you need LAN access
    port: 5173,
    strictPort: true     // ensures Vite won’t auto-pick another port
    // 🔥 no need for hmr config unless using Docker/VM
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['framer-motion']
        }
      }
    }
  },
  publicDir: 'public'
})
