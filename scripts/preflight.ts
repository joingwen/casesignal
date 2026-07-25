/**
 * Production preflight.
 *
 *   npm run preflight
 *
 * Run this before deploying. It reports what is configured, what is missing, and
 * what the consequence of each gap actually is — then exits non-zero if anything
 * would cause data loss or a broken core promise in production.
 *
 * The distinction that matters:
 *   BLOCKER  — do not deploy. Data loss, or the product's central claim fails.
 *   WARNING  — deployable, but a feature is degraded and users will see it.
 */
import './load-env'

interface Check {
  name: string
  ok: boolean
  level: 'blocker' | 'warning'
  detail: string
  fix: string
}

function has(...keys: string[]) {
  return keys.every((k) => Boolean(process.env[k]?.trim()))
}

const checks: Check[] = [
  {
    name: 'Hosted database',
    ok: has('DATABASE_URL'),
    level: 'blocker',
    detail:
      'Without DATABASE_URL the app falls back to an embedded database written to local disk. On a serverless host that disk is ephemeral: every case, source and citation is lost on the next cold start.',
    fix: 'Set DATABASE_URL (pooled) and DIRECT_URL (direct) from Supabase → Project Settings → Database.',
  },
  {
    name: 'Authentication',
    ok: has('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'),
    level: 'blocker',
    detail:
      'Without Clerk keys the app issues a local development session from an unsigned cookie. That is not an authentication system and must never face the internet.',
    fix: 'Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY from dashboard.clerk.com.',
  },
  {
    name: 'Clerk production instance',
    ok: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_')),
    level: 'warning',
    detail:
      'The configured Clerk key is a development key (pk_test_). Development instances are rate-limited, show a development banner, and share a shared OAuth app.',
    fix: 'Create a production instance in Clerk and use its pk_live_ / sk_live_ keys.',
  },
  {
    name: 'Private file storage',
    ok: has('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'),
    level: 'blocker',
    detail:
      'Without Supabase Storage, uploaded source files are written to the local filesystem. On a serverless host those files vanish, leaving sources that reference bytes that no longer exist.',
    fix: 'Create a PRIVATE bucket and set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET.',
  },
  {
    name: 'AI analysis',
    ok: has('ANTHROPIC_API_KEY'),
    level: 'blocker',
    detail:
      'Without ANTHROPIC_API_KEY, analysis runs on deterministic local heuristics. Claim extraction, discrepancy analysis, brief drafting and answers all still work and stay honestly labelled "Local analysis" — but the product is marketed as an AI investigation workspace, and scanned documents cannot be read at all without vision extraction.',
    fix: 'Set ANTHROPIC_API_KEY and ANTHROPIC_MODEL from console.anthropic.com.',
  },
  {
    name: 'Semantic retrieval',
    ok: has('VOYAGE_API_KEY'),
    level: 'warning',
    detail:
      'Retrieval falls back to Postgres full-text search plus BM25 reranking. That is a supported configuration and citations remain exact — recall on paraphrased questions is simply lower.',
    fix: 'Optional. Set VOYAGE_API_KEY to add embeddings on top of full-text search.',
  },
  {
    name: 'Billing',
    ok: has('STRIPE_SECRET_KEY', 'STRIPE_PRO_PRICE_ID', 'STRIPE_WEBHOOK_SECRET'),
    level: 'warning',
    detail:
      'Upgrade and portal buttons render disabled with a visible reason, and nobody can subscribe. Free-plan limits are still enforced.',
    fix: 'Set STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_PRO_PRICE_ID and STRIPE_WEBHOOK_SECRET.',
  },
  {
    name: 'Rate-limit secret',
    ok: has('RATE_LIMIT_SECRET'),
    level: 'warning',
    detail:
      'Rate-limit and audit identifiers fall back to a hardcoded development salt, so pseudonymous identifiers are predictable across deployments.',
    fix: 'Set RATE_LIMIT_SECRET to a long random string.',
  },
  {
    name: 'Public app URL',
    ok: Boolean(process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://')),
    level: 'blocker',
    detail:
      'NEXT_PUBLIC_APP_URL is not an https origin. Share links, OAuth redirects and Stripe return URLs are built from it and will point at the wrong host.',
    fix: 'Set NEXT_PUBLIC_APP_URL to the production origin, e.g. https://casesignal.ai.',
  },
  {
    name: 'Clerk user webhook',
    ok: has('CLERK_WEBHOOK_SECRET'),
    level: 'warning',
    detail:
      'Profile updates and account deletions in Clerk will not sync to CaseSignal, so a deleted user keeps their cases and stored files.',
    fix: 'Add a webhook at /api/webhooks/clerk for user.updated and user.deleted, then set CLERK_WEBHOOK_SECRET.',
  },
]

const dim = (s: string) => `[2m${s}[0m`
const red = (s: string) => `[31m${s}[0m`
const yellow = (s: string) => `[33m${s}[0m`
const green = (s: string) => `[32m${s}[0m`
const bold = (s: string) => `[1m${s}[0m`

const blockers = checks.filter((c) => !c.ok && c.level === 'blocker')
const warnings = checks.filter((c) => !c.ok && c.level === 'warning')
const passed = checks.filter((c) => c.ok)

console.log(`\n${bold('CaseSignal production preflight')}\n`)

for (const check of passed) console.log(`  ${green('✓')} ${check.name}`)

for (const check of warnings) {
  console.log(`\n  ${yellow('!')} ${bold(check.name)} ${yellow('— degraded')}`)
  console.log(dim(`    ${check.detail}`))
  console.log(dim(`    Fix: ${check.fix}`))
}

for (const check of blockers) {
  console.log(`\n  ${red('✗')} ${bold(check.name)} ${red('— blocker')}`)
  console.log(dim(`    ${check.detail}`))
  console.log(dim(`    Fix: ${check.fix}`))
}

console.log(
  `\n${bold('Summary')}  ${green(`${passed.length} ready`)} · ${yellow(`${warnings.length} degraded`)} · ${red(`${blockers.length} blocking`)}\n`,
)

if (blockers.length > 0) {
  console.log(red('Not ready to deploy. Resolve the blockers above.\n'))
  process.exit(1)
}

console.log(green('No blockers. Safe to deploy.\n'))
