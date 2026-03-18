import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// NOTE: We use a manual sw.js (public/sw.js) instead of vite-plugin-pwa's workbox
// This gives us full control over caching strategies.
// VitePWA is kept only for dev tooling; actual SW is public/sw.js

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },

  build: {
    // Better chunk splitting for faster loads
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI Library
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-dropdown-menu',
          ],
          // Data & queries
          'vendor-query': ['@tanstack/react-query', '@supabase/supabase-js'],
          // Animation
          'vendor-gsap': ['gsap'],
          // Charts
          'vendor-charts': ['recharts'],
        },
      },
    },
    // Slightly larger warning threshold since we have rich features
    chunkSizeWarningLimit: 800,
    // Enable source maps for production debugging
    sourcemap: false,
    // Minification
    minify: 'esbuild',
    // Target modern browsers (good for PWA users)
    target: 'es2020',
  },

  // CSS optimization
  css: {
    devSourcemap: mode === 'development',
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Optimize deps for faster dev startup
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'gsap',
      'lucide-react',
    ],
  },
}));