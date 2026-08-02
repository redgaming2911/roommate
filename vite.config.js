import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // phù hợp GitHub Pages

  server: {
    port: 5173,
    open: true
  },

  build: {
    outDir: 'dist',
    sourcemap: true
  },

  resolve: {
    alias: {
      '@': '/src'
    }
  }
});