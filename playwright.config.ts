import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end smoke coverage.
 *
 * Runs against a production build in local mode — embedded database, local
 * session, local analysis — so the suite needs no credentials. `npm run db:seed`
 * is executed by the web server command so the demo case is always present.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3411',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'rm -rf .casesignal/e2e && npm run db:seed && npx next start --port 3411',
        url: 'http://127.0.0.1:3411',
        // Never reuse: a stray server on this port would silently test the wrong app.
        reuseExistingServer: false,
        timeout: 180_000,
        env: {
          NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3411',
          // The embedded database is single-writer, so the suite gets its own
          // data directory and cannot collide with a running dev server.
          PGLITE_DATA_DIR: '.casesignal/e2e/pgdata',
          LOCAL_STORAGE_DIR: '.casesignal/e2e/storage',
          // The smoke suite deliberately runs in local mode so it stays
          // credential-free and deterministic: it must not depend on a Clerk
          // instance, a hosted sign-in page or a real test user. Clerk itself is
          // covered by `clerk doctor` and by signing in against the dev instance.
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: '',
          CLERK_SECRET_KEY: '',
        },
      },
})
