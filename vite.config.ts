import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — MUST be in one chunk to avoid createContext error
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI Library
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-dropdown-menu',
          ],
          // Data & queries — separated from React chunk
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-query': ['@tanstack/react-query'],
          // Animation
          'vendor-gsap': ['gsap'],
          // Charts
          'vendor-charts': ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
  },

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
      // Force single React instance — prevents createContext undefined error
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    // Deduplicate React
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'gsap',
      'lucide-react',
    ],
    // Force re-bundle on changes
    force: mode === 'development',
  },
}));