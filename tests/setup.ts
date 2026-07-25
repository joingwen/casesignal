import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

/**
 * Tests run against a throwaway embedded Postgres instance so integration
 * coverage exercises the real schema, real constraints and real SQL rather
 * than mocks — without requiring any credentials.
 */
const dataDir = path.join(os.tmpdir(), `casesignal-test-${process.pid}`)
fs.rmSync(dataDir, { recursive: true, force: true })

process.env.PGLITE_DATA_DIR = dataDir
Object.assign(process.env, { NODE_ENV: 'test' })
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.LOCAL_STORAGE_DIR = path.join(dataDir, 'storage')

// Ensure no ambient credentials leak into the test run: every capability flag
// must be off so tests cover the zero-credential path deterministically.
delete process.env.DATABASE_URL
delete process.env.ANTHROPIC_API_KEY
delete process.env.VOYAGE_API_KEY
delete process.env.STRIPE_SECRET_KEY
delete process.env.CLERK_SECRET_KEY
delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
delete process.env.NEXT_PUBLIC_SUPABASE_URL
delete process.env.SUPABASE_SERVICE_ROLE_KEY

process.on('exit', () => {
  fs.rmSync(dataDir, { recursive: true, force: true })
})
