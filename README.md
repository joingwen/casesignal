<div align="center">

# CaseSignal

**Turn public records into source-backed case files.**

_Evidence has a paper trail. Find it faster._

</div>

---

CaseSignal is an AI investigation workspace that transforms PDFs, spreadsheets,
images, transcripts, emails, notes and public webpages into structured claims,
timelines, discrepancy reports, entity maps and source-backed investigation
dossiers.

It is built for investigative journalists, public-records investigators, election
researchers, legal and compliance teams, government watchdog organizations,
nonprofit researchers, corporate investigation teams and policy analysts.

The platform is evidence-neutral and nonpartisan. It never presents an AI
inference as an established fact: every finding is labelled **supported**,
**partially supported**, **contradicted**, **unresolved** or **context only**, and
every factual finding links to the precise source excerpt it came from.

---

## Table of contents

- [Quick start](#quick-start)
- [What you get with no credentials](#what-you-get-with-no-credentials)
- [Architecture](#architecture)
- [Required services](#required-services)
  - [Clerk](#clerk-authentication)
  - [Supabase](#supabase-database--storage)
  - [Anthropic](#anthropic-analysis)
  - [Voyage](#voyage-optional-semantic-retrieval)
  - [Stripe](#stripe-billing)
- [Database commands](#database-commands)
- [Development](#development)
- [Testing](#testing)
- [Production deployment](#production-deployment)
- [Capturing showcase frames](#capturing-showcase-frames)
- [Troubleshooting](#troubleshooting)

---

## Quick start

```bash
npm install
npm run db:seed
npm run dev
```

Open <http://localhost:3000>. Sign in at `/sign-in` with any name and email — with
no Clerk keys configured, CaseSignal issues a local development session — then open
the seeded **Northstar County Equipment Procurement Review** demo case.

No `.env` file is required. Copy `.env.example` to `.env.local` when you are ready
to connect real services.

---

## What you get with no credentials

CaseSignal is designed so that a clean checkout is fully functional. Each external
service upgrades one capability; none of them gate the product.

| Capability | Without credentials | With credentials |
| --- | --- | --- |
| Database | Embedded Postgres (PGlite) at `.casesignal/pgdata`, same schema and migrations | Supabase Postgres via `DATABASE_URL` |
| File storage | Private local directory, streamed through an authorized route | Supabase Storage private bucket with signed URLs |
| Authentication | Local cookie session, clearly labelled in the UI | Clerk sign-in, sessions, profiles, organizations |
| Analysis | Deterministic local analyzers over the real source text | Claude for extraction, discrepancies, answers, briefs, vision |
| Retrieval | Postgres full-text search + BM25 reranking | Adds Voyage embeddings for semantic retrieval |
| Billing | Read-only; upgrade buttons disabled with a visible reason | Stripe checkout, portal and webhooks |

Local analysis is not a stub. It reads the actual text: claims are sentences that
exist in a record, event dates are dates that literally appear beside them, and a
discrepancy requires two excerpts stating different values for the same subject.
It finds less than Claude does, but everything it finds is directly quotable.
Results are labelled **Local analysis** everywhere they appear.

Settings → Workspace lists exactly which services are configured.

---

## Architecture

```
src/
  app/
    (marketing)/        Public site — landing, product, use cases, security,
                        pricing, demo, about, legal
    (auth)/             Sign-in and sign-up (Clerk, or local dev session)
    app/                Authenticated application
      cases/[caseId]/   The three-region case workspace
      settings/         Profile, workspace, billing
    evidence/[slug]/    Public read-only evidence rooms
    api/                Upload, file streaming, billing, webhooks, export
    showcase/           Screenshot-ready frames (dev / SHOWCASE_ENABLED)
  components/
    ui/                 Primitive kit (Radix + CVA, CaseSignal tokens)
    marketing/          Landing composition and product panels
    app/                Application shell, dashboard, settings
    case/               Workspace: source rail, viewer, ledger, copilot, graph
    brand/              Logo system
  lib/
    domain.ts           The evidentiary vocabulary — statuses, plans, templates
    citations.ts        Locator formatting and citation verification
    env.ts              Environment contract and capability flags
  server/
    db/                 Drizzle schema + dual-driver client with migrations
    auth/               Session provisioning, the authorization guard, errors
    ai/                 Provider, prompts, schemas, ten services, local analyzers
    retrieval/          Hybrid retrieval and optional embeddings
    ingest/             Parsers, validation, SSRF-safe URL fetch, pipeline
    queries/            Read models for every UI surface
    actions/            Server actions (all mutations)
    billing/            Plan state, usage, limit enforcement
    security/           Rate limiting
    storage/            Private object storage
    demo/               The fictional demonstration case
drizzle/                SQL migrations (committed)
tests/                  unit · integration · e2e
```

### Principles worth knowing

**One authorization gate.** `requireCaseAccess(caseId)` loads the case, then
verifies the signed-in profile belongs to the organization that owns it. Every
read and write funnels through it, so cross-organization access is prevented at
the data layer rather than at routing.

**One vocabulary.** `src/lib/domain.ts` defines every status, review state,
discrepancy type, plan limit and template. The database enforces the same values
with `CHECK` constraints, the AI schemas validate against them, and the UI renders
their labels. A status cannot mean two things.

**One migration history.** The same SQL in `drizzle/` runs against the embedded
and hosted databases, applied automatically at first connection and tracked in
`_casesignal_migrations`.

**Citations are verified, not trusted.** `verifyCitations()` checks every marker a
model produced against the excerpts actually retrieved for that answer. Anything
that does not resolve is stripped; if nothing survives, the answer becomes an
explicit statement of insufficient evidence. The displayed excerpt always comes
from the stored chunk.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`SECURITY.md`](./SECURITY.md) and
[`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) for detail.

---

## Required services

None are required to run the app. Configure them to move from local mode to
production.

### Clerk (authentication)

1. Create an application at <https://dashboard.clerk.com>.
2. Copy the publishable and secret keys into `.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```
3. Optional: add a webhook endpoint at `https://your-domain/api/webhooks/clerk`
   subscribed to `user.updated` and `user.deleted`, and copy the signing secret to
   `CLERK_WEBHOOK_SECRET`. This keeps profiles in sync and cleans up deleted users.
4. Restart. `/sign-in` now renders Clerk, styled to match the product.

### Supabase (database & storage)

1. Create a project at <https://supabase.com>.
2. **Database** → Connection string → URI. Put the pooled URI in `DATABASE_URL`
   and the direct URI in `DIRECT_URL` (migrations use the direct connection).
3. **Storage** → create a bucket named `case-sources` and keep it **private**.
4. Copy the project URL and the service-role key:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   SUPABASE_STORAGE_BUCKET=case-sources
   ```
   The service-role key is server-only and is never exposed to the browser.
5. Run `npm run db:migrate`.

`pgvector` is optional. Embeddings are stored as JSONB and compared in the
application, so semantic retrieval works on any Postgres. If you enable the
`vector` extension you can add an indexed vector column in a follow-up migration
without changing application code.

### Anthropic (analysis)

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-5
```

The model is read from the environment at call time and is not hardcoded anywhere.
Change `ANTHROPIC_MODEL` to switch models without touching code.

This enables Claude for source summaries, entity/claim/timeline/relationship
extraction, discrepancy analysis, retrieval planning, source-backed answers, brief
drafting, missing-evidence suggestions, and vision extraction from images.

### Voyage (optional semantic retrieval)

```
VOYAGE_API_KEY=pa-...
VOYAGE_MODEL=voyage-3
```

Strictly additive. Postgres full-text search always runs; embeddings are blended in
when configured. A Voyage outage degrades to lexical retrieval rather than failing
ingestion.

### Stripe (billing)

1. Create a recurring **$24 / month** price for the Pro plan.
2. Configure:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_PRO_PRICE_ID=price_...
   ```
3. Forward webhooks in development:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   and copy the printed signing secret to `STRIPE_WEBHOOK_SECRET`.
4. In production, add an endpoint at `https://your-domain/api/webhooks/stripe`
   subscribed to `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted` and
   `invoice.payment_failed`.

Subscription state is only ever written by the verified webhook. Nothing about a
plan is trusted from the client.

---

## Database commands

```bash
npm run db:generate     # generate a migration from schema changes
npm run db:migrate      # apply pending migrations, print applied history
npm run db:seed         # create a local analyst, workspace and the demo case
npm run db:seed -- --force   # rebuild the demo case even if one exists
npm run db:push         # push schema directly (development convenience)
```

Migrations also apply automatically on first database connection, so `npm run dev`
works on a clean checkout without a manual migration step.

To reset local data completely:

```bash
rm -rf .casesignal && npm run db:seed
```

---

## Development

```bash
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm run build        # production build
npm start            # serve the production build
npm run verify       # typecheck + lint + unit/integration tests + build
```

### Keyboard shortcuts in the workspace

| Shortcut | Action |
| --- | --- |
| `⌘K` / `Ctrl K` | Command palette |
| `⌘U` / `Ctrl U` | Add source |
| `⌘J` / `Ctrl J` | Open the case copilot |
| `g` then `c` | Claims |
| `g` then `t` | Timeline |
| `g` then `g` | Graph |
| `Escape` | Close overlays |

---

## Testing

```bash
npm test             # unit + integration (Vitest)
npm run test:watch
npm run test:e2e     # Playwright smoke tests against a production build
```

**Unit** — citation formatting and verification, claim status derivation, upload
and filename validation, pasted-text limits, SSRF URL safety, structured
AI-output schemas, JSON extraction, plan definitions.

**Integration** — runs against a real embedded Postgres with the real migrations,
covering organization ownership, `CHECK` constraints, cascade behaviour, the
seeded demo case's citation locators, hybrid retrieval scoping and source
diversity, share password hashing and defaults, and plan-limit enforcement.

**End-to-end** — the eleven critical flows: landing page, authentication
boundary, opening the demo case, creating a case, adding a text source, processing
completion, claims appearing, a citation opening its source, a cited copilot
answer, brief export, and public-share permissions.

Before the first Playwright run:

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

---

## Production deployment

**Vercel + Supabase** is the intended target.

1. Push the repository to GitHub and import it into Vercel.
2. Add every configured variable from `.env.example` to the Vercel project.
   Set `NEXT_PUBLIC_APP_URL` to the production origin.
3. Set `DATABASE_URL` to the Supabase **pooled** connection string and `DIRECT_URL`
   to the direct one.
4. Deploy. Migrations apply automatically at first connection; you can also run
   `npm run db:migrate` locally against production credentials.
5. Add the Stripe and Clerk webhook endpoints and copy their signing secrets in.
6. Set `RATE_LIMIT_SECRET` to a long random string.

Notes:

- The rate limiter is in-process. It bounds abuse per instance; for multi-instance
  deployments point `src/server/security/rate-limit.ts` at a shared store — the
  interface is one function.
- Source processing runs inline in the request. For large PDF batches, raise the
  function timeout or move `processSource` behind a queue.
- `@electric-sql/pglite`, `pdfjs-dist`, `mammoth`, `jsdom` and `postgres` are
  declared in `serverExternalPackages` and must stay there.

---

## Capturing showcase frames

`/showcase` renders four screenshot-ready frames from the seeded demo data. It is
available in development, or in production when `SHOWCASE_ENABLED=1`.

```bash
npm run db:seed
npm run dev
open http://localhost:3000/showcase
```

Each frame has a size toggle for **1200 × 675** (cover / social) and
**1200 × 1200** (square). To capture:

1. Choose the target size in the frame's toolbar.
2. Use the browser's device toolbar at a 2× device pixel ratio for a retina
   capture, or run:
   ```bash
   npx playwright screenshot --viewport-size=1200,675 --wait-for-timeout=2500 \
     "http://localhost:3000/showcase?frame=hero&size=1200x675" hero.png
   ```
3. Frames available: `hero`, `workspace`, `graph`, `timeline`.

---

## Troubleshooting

**`npm run dev` fails with a database error.** Delete the embedded data directory
and reseed: `rm -rf .casesignal && npm run db:seed`.

**A migration fails against Supabase.** Use `DIRECT_URL` rather than the pooled
connection — some DDL cannot run through a transaction pooler.

**Clerk throws on boot.** `ClerkProvider` is only rendered when both Clerk keys are
present. If you set one but not the other, remove both or add the missing one.

**A PDF imports with no text.** It is probably a scan. CaseSignal detects this,
scores extraction confidence low and marks the source **needs review** rather than
indexing it as empty. Add the page as an image to run vision extraction, which
requires `ANTHROPIC_API_KEY`.

**A URL import is rejected.** URL ingestion blocks private and link-local
addresses, non-standard ports, embedded credentials and non-HTML responses, and
re-checks every redirect hop. This is deliberate SSRF protection — see
[`SECURITY.md`](./SECURITY.md).

**The copilot answers "The available case sources do not establish this."** That is
the intended behaviour when retrieval returns nothing relevant, or when every
citation in the generated answer failed verification. Add a record covering the
point, or rephrase toward language that appears in the sources.

**Billing buttons are disabled.** Stripe is not configured. The button states the
reason rather than failing on click.

**Scripts fail with "This module cannot be imported from a Client Component".**
Run them through the scripts tsconfig, which maps the `server-only` guard to an
inert module: `npx tsx --tsconfig tsconfig.scripts.json <script>`. The npm scripts
already do this.

---

## License and use

All demonstration content shipped with CaseSignal is fictional. The Northstar
County Equipment Procurement Review refers to no real jurisdiction, person,
company, election or allegation.

CaseSignal organises and cites records. Its outputs are research assistance, not
findings of fact, legal conclusions or determinations about any person or
organization. Verify every citation against the underlying record before
publication.
