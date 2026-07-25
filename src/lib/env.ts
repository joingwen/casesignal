import { z } from 'zod'

/**
 * Environment contract.
 *
 * CaseSignal is designed to run in three modes without code changes:
 *
 *  1. Zero-credential local mode — embedded Postgres (PGlite), local file
 *     storage, dev auth and deterministic local analysis. Everything works.
 *  2. Partial mode — e.g. Anthropic configured but Stripe absent. Features
 *     degrade with an explicit, visible reason rather than failing.
 *  3. Full production — Clerk + Supabase + Anthropic + Stripe.
 *
 * Every optional variable therefore has an explicit capability flag below so
 * the UI can explain precisely what is and is not configured.
 */

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Auth
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: optionalString,
  CLERK_SECRET_KEY: optionalString,
  CLERK_WEBHOOK_SECRET: optionalString,

  // Data
  DATABASE_URL: optionalString,
  DIRECT_URL: optionalString,
  PGLITE_DATA_DIR: optionalString,

  // Storage
  NEXT_PUBLIC_SUPABASE_URL: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  SUPABASE_STORAGE_BUCKET: optionalString,
  LOCAL_STORAGE_DIR: optionalString,

  // AI
  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_MODEL: optionalString,
  VOYAGE_API_KEY: optionalString,
  VOYAGE_MODEL: optionalString,

  // Billing
  STRIPE_SECRET_KEY: optionalString,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  STRIPE_PRO_PRICE_ID: optionalString,

  // Ops
  RATE_LIMIT_SECRET: optionalString,
  CRON_SECRET: optionalString,
  NEXT_PUBLIC_CONTACT_EMAIL: optionalString,
  NEXT_PUBLIC_SOCIAL_X: optionalString,
})

type Env = z.infer<typeof schema>

function read(): Env {
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  · ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\nCopy .env.example to .env.local and review the values.`,
    )
  }
  return parsed.data
}

export const env = read()

/** Runtime capability flags derived from the environment. */
export const capabilities = {
  /** Hosted Postgres configured; otherwise an embedded PGlite database is used. */
  hostedDatabase: Boolean(env.DATABASE_URL),
  /** Clerk configured; otherwise a local development session is used. */
  clerkAuth: Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY),
  /** Supabase Storage configured; otherwise files are written to a local private directory. */
  supabaseStorage: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
  /** Anthropic configured; otherwise deterministic local analysis is used. */
  anthropic: Boolean(env.ANTHROPIC_API_KEY),
  /** Voyage embeddings configured; otherwise lexical retrieval only. */
  embeddings: Boolean(env.VOYAGE_API_KEY),
  /** Stripe configured; otherwise billing is read-only. */
  stripe: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRO_PRICE_ID),
} as const

export type Capabilities = typeof capabilities

export const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
export const isProduction = env.NODE_ENV === 'production'

/** Human-readable setup guidance surfaced in the app's settings screens. */
export function missingSetupNotes(): { key: string; label: string; detail: string }[] {
  const notes: { key: string; label: string; detail: string }[] = []
  if (!capabilities.clerkAuth) {
    notes.push({
      key: 'clerk',
      label: 'Authentication running in local mode',
      detail:
        'Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to enable Clerk sign-in, organizations and profile management.',
    })
  }
  if (!capabilities.hostedDatabase) {
    notes.push({
      key: 'database',
      label: 'Using the embedded database',
      detail:
        'Set DATABASE_URL to a Supabase Postgres connection string to persist cases outside this machine.',
    })
  }
  if (!capabilities.anthropic) {
    notes.push({
      key: 'anthropic',
      label: 'Local analysis mode',
      detail:
        'Set ANTHROPIC_API_KEY and ANTHROPIC_MODEL to use Claude for extraction, discrepancy analysis and the case copilot.',
    })
  }
  if (!capabilities.embeddings) {
    notes.push({
      key: 'voyage',
      label: 'Lexical retrieval only',
      detail: 'Set VOYAGE_API_KEY to add semantic retrieval on top of full-text search.',
    })
  }
  if (!capabilities.stripe) {
    notes.push({
      key: 'stripe',
      label: 'Billing is read-only',
      detail: 'Set STRIPE_SECRET_KEY, STRIPE_PRO_PRICE_ID and STRIPE_WEBHOOK_SECRET to enable checkout.',
    })
  }
  return notes
}
