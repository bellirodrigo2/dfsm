import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    name: 'contract',
    include: ['tests/contract/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],

    // Longer timeout for contract tests (real API calls)
    testTimeout: 30000,
    hookTimeout: 30000,

    // Run tests sequentially to avoid overwhelming the API
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },

    // Setup file that starts proxy and configures environment
    setupFiles: ['tests/contract/setup.ts'],

    // Use Node environment (not jsdom)
    environment: 'node',

    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,

    // Coverage configuration (optional)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/piwebapi/**/*.ts'],
      exclude: [
        '**/types.ts',
        '**/index.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
