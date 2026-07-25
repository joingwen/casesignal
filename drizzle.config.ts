import type { Config } from 'drizzle-kit'

export default {
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? 'postgres://localhost:5432/casesignal',
  },
  strict: true,
  verbose: true,
} satisfies Config
