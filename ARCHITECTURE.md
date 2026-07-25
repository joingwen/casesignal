# CaseSignal Architecture

CaseSignal turns a pile of records into a case file where every statement can be
opened at the passage it came from. This document explains how that guarantee is
implemented, and why the system is shaped the way it is.

---

## 1. The central idea

Everything in the product hangs off one unit: the **chunk**.

A chunk is a passage of a record plus the exact place it sits inside that record —
a page number, a sheet name and row range, a heading path, a transcript timecode,
or an extracted image region. Chunks are what retrieval returns, what claims cite,
what timeline events reference, what discrepancies compare, and what a citation
resolves to when an analyst clicks it.

Because the locator is stored with the text, a citation is not a label someone
wrote down — it is a pointer that can be followed. That is the difference between
a product that cites and a product that appears to cite.

---

## 2. Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 App Router, React 19 | Server components keep case data on the server; server actions give typed mutations without a hand-written API |
| Language | TypeScript, `strict` | The domain has many enumerations; the compiler enforces them |
| Styling | Tailwind v3 + custom tokens | The design system is unusual enough to warrant its own scale, not a default palette |
| Components | Radix primitives + CVA | Accessible behaviour without inheriting a visual identity |
| Database | Postgres via Drizzle | Full-text search, `CHECK` constraints, JSONB and cascades are all load-bearing |
| Local database | PGlite (embedded Postgres) | Same SQL, same migrations, zero credentials |
| AI | OpenAI or Anthropic SDK, model from the environment | Provider and model are configuration, not code |
| Retrieval | Postgres FTS + BM25, optional Voyage | Lexical retrieval always works; semantic is additive |
| Auth | Clerk, with a local development session | Production-grade auth without blocking a clean checkout |
| Payments | Stripe | Webhook-driven; the client never asserts a plan |
| Graph | React Flow (`@xyflow/react`) | Performance and control over node rendering |
| Tests | Vitest + Playwright | Integration tests run against a real database |

---

## 3. Dual-mode by design

The most consequential architectural decision: **the product must be fully usable
with no credentials.**

This is not a demo mode. It is the same code paths with different adapters:

```
DATABASE_URL set?        → postgres-js          : PGlite (.casesignal/pgdata)
Supabase keys set?       → private bucket       : local dir + authorized route
Clerk keys set?          → Clerk session        : signed local cookie session
OPENAI/ANTHROPIC key?    → model-backed services : deterministic local analyzers
VOYAGE_API_KEY set?      → hybrid retrieval     : lexical retrieval only
Stripe keys set?         → checkout + portal    : read-only billing, stated reason
```

`src/lib/env.ts` validates the environment with Zod at startup and exposes a
`capabilities` object plus `missingSetupNotes()`, which the workspace settings page
renders verbatim. The product always tells you what is and is not configured.

**Why PGlite rather than an in-memory mock.** A mock data layer would double every
query and drift from production. PGlite is real Postgres compiled to WebAssembly:
the same migrations, the same `CHECK` constraints, the same `tsvector` full-text
search, the same cascade semantics. Integration tests therefore exercise the real
schema, and the local experience is a faithful preview of the hosted one.

**Why local analysis is real.** A stub that returns fake claims would make the
product look like it works while teaching a user nothing. The local analyzers in
`src/server/ai/local/` read the actual text: they find dates with real date
grammars, amounts and quantities with unit patterns, proper-noun entities with
organizational and title cues, and claims as sentences that carry a checkable
assertion. A discrepancy requires two excerpts from **different sources** stating
different values for the same subject. Every result is labelled `Local analysis`.

---

## 4. Data model

28 tables. The ownership chain is the security model:

```
organizations ──< organization_members >── user_profiles
      │
      └──< cases
             ├──< sources ──< source_pages
             │              ├─< source_sheets
             │              └─< source_chunks ◄──────────┐
             ├──< claims ──< claim_evidence ─────────────┤
             ├──< timeline_events ──< timeline_event_sources
             ├──< discrepancies ──< discrepancy_evidence ─┤
             ├──< entities ──< entity_relationships       │
             ├──< case_conversations ──< case_messages ───┘
             ├──< briefs ──< brief_sections
             ├──< public_shares
             ├──< analysis_runs
             └──< exports
```

Every evidence table points at a chunk. That is what makes a citation resolvable
and what makes deleting a source correctly remove every claim citation to it.

Notable decisions:

- **UUID primary keys** everywhere; ids appear in URLs and must not be guessable.
- **`CHECK` constraints on every status column**, generated from the same
  vocabulary the TypeScript uses. The database refuses an invalid claim status even
  if a code path forgets to validate — covered by an integration test.
- **A generated `tsvector` column** on `source_chunks` with a GIN index. Full-text
  search is a schema feature, not an application concern, and it is the mandatory
  retrieval fallback.
- **Embeddings stored as JSONB**, compared in the application. This keeps semantic
  retrieval working on any Postgres including PGlite; a deployment with `pgvector`
  can add an indexed vector column in a follow-up migration with no code change.
- **Soft deletion where recovery matters** (`cases`, `sources`, `user_profiles`,
  `organizations`), hard cascades where it does not (evidence rows).
- **Per-case source labels** (`S1`, `S2`, …) with a unique constraint on
  `(case_id, label)`, so a citation marker is unambiguous within a case.

Migrations live in `drizzle/` and are applied automatically on first connection,
tracked in `_casesignal_migrations`. The same files run against both drivers.

---

## 5. Authorization

One function, `requireCaseAccess`, is the gate for all case content. It is
described in detail in [`SECURITY.md`](./SECURITY.md) §1. The architectural point
is that it reads the owning organization **from the row**, never from the request —
so authorization does not depend on routing being correct.

Server actions return `{ ok: true, data } | { ok: false, error, code }` rather than
throwing across the boundary. Every caller must branch, which makes it structurally
difficult to render a success state for a failed mutation.

---

## 6. Ingestion pipeline

```
createSourceRecord            assign S-label, status: queued
        │
        ├─ extracting         format-specific parser → segments with locators
        │                     (pdfjs · mammoth · SheetJS · Papa Parse ·
        │                      jsdom + Readability · Claude vision for images)
        │
        ├─ indexing           segments → chunks (~900 chars, never merged across
        │                     a locator boundary) → optional embeddings
        │
        ├─ analyzing          summary · entities · claims · timeline events
        │
        └─ complete | needs_review | failed
```

**Chunking never merges across a locator boundary.** Two paragraphs on different
pages never become one chunk, because a chunk must be citable to exactly one place.
Within a page, segments merge up to ~900 characters for retrieval quality.

**Re-processing is idempotent.** Retrying a source clears its derived rows first,
so "Retry" is always a clean re-run rather than a duplicate.

**Failure is inspectable.** A parse error sets `failed` with a message an analyst
can act on; a scanned PDF with no machine-readable text sets `needs_review` with a
low confidence score rather than being indexed as empty. Nothing is silently
discarded.

Cross-source analysis — relationships and discrepancies — is deliberately **not**
part of ingestion. It runs in **Build Case Map**, because a contradiction only
exists once there are at least two records. That action also preserves analyst
review state: it adds newly-found differences and never resets ones already
reviewed.

---

## 7. Retrieval

`src/server/retrieval/index.ts`, in order:

1. **Full-text** — `websearch_to_tsquery` + `ts_rank_cd` against the generated
   `tsvector`. Always runs.
2. **Exact terms** — dates, currency amounts, long digit strings and identifiers
   are matched literally rather than stemmed. Stemming loses `INV-4471` and
   `2024-09-21`, which are exactly the tokens investigations turn on.
3. **Semantic** — Voyage embeddings with cosine similarity, when configured.
4. **BM25 fallback** — if nothing matched, an in-application BM25 pass so a query
   never returns empty when relevant text exists.
5. **Blend and rerank** — weighted sum plus query-token overlap, with a boost for
   chunks the analyst currently has open.
6. **Source diversity** — at most 4 excerpts per source by default, so an answer is
   never built from one record while others are relevant. This directly serves the
   product's purpose: contradictions live *between* sources.

---

## 8. AI services

Ten focused services rather than one large prompt, in `src/server/ai/services.ts`:

source summarizer · entity extractor · claim extractor · timeline extractor ·
relationship extractor · discrepancy analyzer · retrieval query planner ·
source-backed answer generator · brief section writer · missing-evidence suggester

Each is a dispatcher: with an AI provider configured it runs a narrow,
schema-validated prompt; without one, the deterministic local analyzer runs over
the same excerpts.
Both return the identical validated shape, so **no downstream code branches on
which provider ran**.

Shared prompt principles (`src/server/ai/prompts.ts`) are prepended to every call:
work only from supplied excerpts, separate observation from inference, use neutral
non-accusatory language, never invent a chunk id, preserve contradictory evidence,
never infer intent or criminality, never expose reasoning.

**Structured output.** Zod schema → one repair attempt with the validation errors
quoted back → hard failure that writes an analysis error and inserts nothing.
Chunk ids not present in the prompt are pruned before persistence.

**The usage ledger** (`analysis_runs`) records operation, provider, model, token
counts, estimated cost, duration and status. It never stores prompts, responses or
hidden reasoning.

---

## 9. The answer path

This is the product's most important sequence:

```
question
   │
   ├─ plan          1–5 search queries + intent (falls back to the raw question)
   ├─ retrieve      run every planned query, merge by best score, cap at 14
   ├─ generate      answer constrained to those excerpts
   └─ VERIFY        ← the step that makes the guarantee real
         │
         ├─ marker names a source that was retrieved?       else strip
         ├─ resolves to a chunk of that source?             else strip
         ├─ locator inside the marker picks the right chunk  (page / row / timecode)
         ├─ excerpt taken from the STORED chunk, not the model
         └─ nothing survived? → "The available case sources do not establish this."
```

`verifyCitations()` is a pure function in `src/lib/citations.ts` with direct unit
coverage, including the fabricated-marker and unretrieved-source cases. It also
returns `uncitedSentences` so assertions without support can be surfaced as
inference rather than silently presented as sourced.

---

## 10. Claim status

Status is **derived from evidence**, not asserted:

```
supporting > 0, contradicting = 0        → supported
supporting > 0, contradicting > 0        → partially_supported
supporting = 0, contradicting > 0        → contradicted
no supporting or contradicting, context  → context_only
nothing at all                           → unresolved
```

Recomputed whenever evidence changes. When an analyst sets a status themselves,
`status_overridden` is set and derivation never runs again for that claim — the
system defers to the human and records that it did.

---

## 11. Rendering strategy

Server components by default. Client components only where interaction genuinely
requires them: the hero preview, the citation stage, the use-case gallery, the
command palette, the graph canvas, table filtering, and forms.

Case data is loaded in server components through `src/server/queries/`, which
returns plain serializable view models — never Drizzle rows or `Date` objects — so
the client boundary stays cheap and typed.

Mutations are server actions that `revalidatePath` the case layout, so any surface
showing derived counts stays consistent without client-side cache plumbing.

---

## 12. Testing strategy

- **Unit** — the pure logic that carries the guarantees: citation formatting and
  verification, status derivation, upload and filename validation, SSRF URL rules,
  Zod schemas, JSON extraction, plan definitions.
- **Integration** — a real embedded Postgres with real migrations: ownership
  scoping, `CHECK` constraint rejection, cascade behaviour, the seeded demo case's
  citation locators (`p. 14`, `Sheet "Invoices," row 221`), retrieval scoping and
  source diversity, share password hashing and defaults, plan-limit enforcement.
  Discrepancy copy is asserted to contain no accusatory language.
- **End-to-end** — the eleven critical flows, against a production build in local
  mode so the suite needs no credentials.

---

## 13. Deliberate trade-offs

**Synchronous source processing.** Ingestion runs inline rather than through a
queue. This keeps the local experience immediate and the deployment simple; the
cost is that a very large batch can exhaust a serverless time budget. `processSource`
is a single call and is queue-ready when that becomes the constraint.

**In-process rate limiting.** No Redis dependency, correct per instance. The
interface is one function so a shared store is a one-file change.

**JSONB embeddings.** Slower than a `pgvector` index at large scale, but portable
to every deployment target including the embedded database, and semantic retrieval
is an enhancement rather than the primary path.

**Authored demo data, provisioned on request.** The demonstration case is
hand-written rather than generated, so it is byte-identical for every viewer and
its citations resolve to precisely the locators the marketing site references. It
flows through the same tables and the same citation code as a real case — nothing
about it is special-cased, including plan limits.

It is never seeded automatically. A new workspace is empty, and the demo appears
only when a user clicks **Open the demo case**, so a production deployment never
contains fictional records that nobody asked for.

**Tailwind v3 over v4.** v4's CSS-first configuration is attractive, but v3 has the
broadest compatibility with the Radix/CVA/React Flow/Recharts ecosystem this
product depends on. Stability was worth more than novelty here.
