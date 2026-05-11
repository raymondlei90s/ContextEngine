/**
 * Vitest Configuration
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        '**/__tests__/**',
        'test-integration.ts',
        'src/api/**', // Exclude NestJS API (would need separate test setup)
      ],
    },
    include: ['src/**/__tests__/**/*.test.ts'],
    testTimeout: 10000,
  },
});
