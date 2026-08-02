import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,

    include: [
      'tests/unit/**/*.test.js',
      'tests/business/**/*.test.js'
    ],

    coverage: {
      reporter: ['text', 'html'],
      reportsDirectory: './coverage'
    }
  }
});