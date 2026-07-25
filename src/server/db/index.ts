// NOTE: intentionally not marked `server-only` — the migration and seed scripts
// import this module directly from Node. Modules that must never reach the
// client (auth, storage, AI providers) carry the `server-only` guard instead.
import fs from 'node:fs'
import path from 'node:path'
import { sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { env } from '@/lib/env'
import * as schema from './schema'

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>

type Handle = {
  db: Database
  driver: 'postgres' | 'pglite'
  /** Raw SQL execution used by the migration runner. */
  exec: (statement: string) => Promise<void>
  close: () => Promise<void>
}

declare global {
  var __caseSignalDb: Promise<Handle> | undefined
}

const MIGRATIONS_DIR = path.join(process.cwd(), 'drizzle')

async function createHostedHandle(url: string): Promise<Handle> {
  const { drizzle } = await import('drizzle-orm/postgres-js')
  const postgres = (await import('postgres')).default
  const client = postgres(url, {
    max: 5,
    idle_timeout: 20,
    prepare: false,
  })
  const db = drizzle(client, { schema }) as unknown as Database
  return {
    db,
    driver: 'postgres',
    exec: async (statement) => {
      await client.unsafe(statement)
    },
    close: async () => {
      await client.end({ timeout: 5 })
    },
  }
}

async function createEmbeddedHandle(): Promise<Handle> {
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const dataDir = env.PGLITE_DATA_DIR ?? path.join(process.cwd(), '.casesignal', 'pgdata')
  fs.mkdirSync(path.dirname(dataDir), { recursive: true })
  const client = new PGlite(dataDir)
  await client.waitReady
  const db = drizzle(client, { schema }) as unknown as Database
  return {
    db,
    driver: 'pglite',
    exec: async (statement) => {
      await client.exec(statement)
    },
    close: async () => {
      await client.close()
    },
  }
}

function readMigrations(): { name: string; sql: string }[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return []
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8') }))
}

/**
 * Applies every SQL migration that has not been applied yet. Runs against both
 * drivers so local (embedded) and hosted databases share one migration history.
 */
async function migrate(handle: Handle) {
  await handle.exec(
    `create table if not exists _casesignal_migrations (
       name text primary key,
       applied_at timestamptz not null default now()
     );`,
  )
  const applied = await handle.db.execute<{ name: string }>(sql`select name from _casesignal_migrations`)
  const appliedRows = Array.isArray(applied) ? applied : ((applied as { rows?: { name: string }[] }).rows ?? [])
  const appliedNames = new Set(appliedRows.map((r) => r.name))

  for (const migration of readMigrations()) {
    if (appliedNames.has(migration.name)) continue
    const statements = migration.sql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean)
    for (const statement of statements) {
      await handle.exec(statement)
    }
    await handle.db.execute(
      sql`insert into _casesignal_migrations (name) values (${migration.name}) on conflict do nothing`,
    )
  }
}

async function boot(): Promise<Handle> {
  const handle = env.DATABASE_URL ? await createHostedHandle(env.DATABASE_URL) : await createEmbeddedHandle()
  await migrate(handle)
  return handle
}

function handlePromise(): Promise<Handle> {
  if (!globalThis.__caseSignalDb) {
    globalThis.__caseSignalDb = boot().catch((error) => {
      globalThis.__caseSignalDb = undefined
      throw error
    })
  }
  return globalThis.__caseSignalDb
}

/** The application's single database accessor. Migrations are guaranteed applied. */
export async function getDb(): Promise<Database> {
  return (await handlePromise()).db
}

export async function getDriver(): Promise<'postgres' | 'pglite'> {
  return (await handlePromise()).driver
}

export async function closeDb() {
  const existing = globalThis.__caseSignalDb
  if (!existing) return
  globalThis.__caseSignalDb = undefined
  const handle = await existing
  await handle.close()
}

export { schema }
