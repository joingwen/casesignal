/**
 * Applies pending SQL migrations to whichever database is configured.
 *
 *   npm run db:migrate
 *
 * With DATABASE_URL set this targets hosted Postgres (Supabase). Without it the
 * embedded PGlite database under .casesignal/pgdata is used, which is what the
 * zero-credential local setup runs on.
 */
import './load-env'

/*
 * Migrations run through DIRECT_URL when it is set. On Supabase that is the
 * session-mode pooler, which holds one connection for the whole run — the
 * transaction-mode pooler hands out a different backend per statement, which is
 * wrong for multi-statement DDL.
 */
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL

import { closeDb, getDb, getDriver } from '../src/server/db'
import { sql } from 'drizzle-orm'

async function main() {
  const db = await getDb()
  const driver = await getDriver()
  const result = await db.execute<{ name: string }>(sql`select name from _casesignal_migrations order by name`)
  const rows = Array.isArray(result) ? result : ((result as { rows?: { name: string }[] }).rows ?? [])
  console.log(`Driver: ${driver}`)
  console.log(`Applied migrations (${rows.length}):`)
  for (const row of rows) console.log(`  · ${row.name}`)
  await closeDb()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
