import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview
    ? '/roommate/'
    : '/',

  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    open: false
  },

  build: {
    outDir: 'dist',
    sourcemap: true
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
}));
