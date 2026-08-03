import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    passWithNoTests: true,
    clearMocks: true,
    restoreMocks: true,

    include: [
      'tests/**/*.{test,spec}.js',
      'src/**/*.{test,spec}.js'
    ],

    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'tests/e2e/**'
    ],

    coverage: {
      provider: 'v8',
      include: [
        'src/business/**/*.js',
        'src/services/**/*.js'
      ],
      exclude: [
        '**/*.{test,spec}.js',
        'node_modules/**'
      ],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      clean: true
    }
  }
});
