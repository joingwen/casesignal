import path from 'node:path'
import fs from 'node:fs'
import dotenv from 'dotenv'

/**
 * Loads environment files the way Next.js does.
 *
 * `import 'dotenv/config'` only reads `.env`, so a CLI script would miss
 * `.env.local` entirely — which is where the real credentials live. That gap is
 * dangerous rather than merely inconvenient: `db:migrate` would appear to
 * succeed while silently targeting the embedded development database instead of
 * production Postgres.
 *
 * Precedence matches Next: the first file to define a variable wins, because
 * dotenv never overwrites an already-set value.
 */
const NODE_ENV = process.env.NODE_ENV ?? 'development'

const files = [
  `.env.${NODE_ENV}.local`,
  // `.env.local` is intentionally not loaded for `test`, matching Next.js.
  NODE_ENV === 'test' ? null : '.env.local',
  `.env.${NODE_ENV}`,
  '.env',
].filter((f): f is string => Boolean(f))

export function loadEnv(cwd = process.cwd()) {
  const loaded: string[] = []
  for (const file of files) {
    const full = path.join(cwd, file)
    if (!fs.existsSync(full)) continue
    dotenv.config({ path: full, quiet: true })
    loaded.push(file)
  }
  return loaded
}

loadEnv()
