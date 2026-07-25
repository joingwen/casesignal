import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Server modules carry the `server-only` guard, which throws outside a
      // React Server Component graph. Tests import them directly, so the
      // specifier is mapped to an inert module here.
      'server-only': path.resolve(__dirname, './scripts/shims/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: 'forks',
    // The embedded database is a process-level singleton; a single fork keeps
    // integration tests deterministic.
    fileParallelism: false,
    maxWorkers: 1,
  },
})
