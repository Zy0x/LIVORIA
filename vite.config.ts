import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // PENTING: Service Worker harus bisa diakses dari root domain
  // File sw.js dan manifest.json di folder /public sudah otomatis
  // di-serve dari / oleh Vite — tidak perlu konfigurasi tambahan
  
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Code splitting untuk performa lebih baik
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-tooltip'],
          charts: ['recharts'],
          animation: ['gsap'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },

  server: {
    port: 8080,
    headers: {
      // Header yang diperlukan untuk PWA
      'Service-Worker-Allowed': '/',
    },
  },

  // Preview server juga perlu header yang sama
  preview: {
    port: 4173,
    headers: {
      'Service-Worker-Allowed': '/',
    },
  },
}));