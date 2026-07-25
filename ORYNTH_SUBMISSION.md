# CaseSignal — Orynth Submission

## Project

**CaseSignal**

## Tagline

Turn public records into source-backed case files.

## Description

CaseSignal is an AI investigation workspace for complex public records. Upload PDFs,
spreadsheets, images, transcripts, emails and URLs. CaseSignal identifies claims,
builds timelines, maps contradictions, and connects every finding to the exact
source passage behind it.

## Suggested categories

- Artificial Intelligence
- Productivity
- SaaS

## Suggested founder description

Kevin Moncla is an election investigator and consultant focused on public records,
evidence organization, and accountable research workflows.

X / Twitter: <https://x.com/KevinMoncla>

## Suggested demo sequence

1. **Create case** — pick the Public Procurement Review template; the objective is
   pre-filled and the case map is scoped to it.
2. **Upload records** — drag in the procurement request, vendor proposal, meeting
   minutes, invoice register and delivery report. Watch each move through
   extracting → indexing → analyzing → complete, with page and row locations
   preserved.
3. **Build Case Map** — entities, claims, dated events, relationships and the
   points where records disagree are assembled across the whole record set.
4. **Inspect discrepancy** — open "Delivery date differs between records." Both
   excerpts sit side by side with their citations: the proposal commits to
   September 10, the minutes record September 18, the receiving report records
   September 21.
5. **Ask a source-backed question** — "Which records disagree about the delivery
   date?" Every factual sentence in the answer carries a citation; clicking one
   opens that record at that page.
6. **Export dossier** — generate the brief, review the sections, export Markdown
   or PDF, or publish a read-only evidence room containing only the items you
   explicitly included.

## What makes it different

**Citations are verified, not generated.** Before any answer is shown, every
citation the model produced is checked against the excerpts that were actually
retrieved for that answer. A marker that does not resolve to a real stored chunk
is stripped; if nothing survives, the answer is replaced with an explicit
statement that the case sources do not establish the point. The excerpt an
analyst reads is the stored text, never a model paraphrase.

**Status is derived from evidence, and an analyst can always override it.** A
claim is supported, partially supported, contradicted, unresolved or context only
strictly on the basis of the citations for and against it. When an analyst sets a
status themselves, that decision is recorded and later analysis never silently
replaces it.

**It is deliberately non-accusatory.** The system reports that records differ. It
does not infer intent, characterise anyone as dishonest, or make legal
determinations — a constraint enforced in the analysis prompts, the local
analyzers and the copy throughout the product.

**It runs with zero credentials.** The whole product — database, storage,
authentication, analysis, retrieval — works on a clean checkout with no API keys,
using an embedded Postgres database and deterministic local analysis over the
real source text. Adding Clerk, Supabase, Anthropic, Voyage and Stripe upgrades
each capability independently, and the app states plainly which are configured.

## Screenshot frames

The `/showcase` route composes four screenshot-ready frames from the seeded demo
data, each sized for **1200 × 675** and **1200 × 1200**:

1. Landing-page hero
2. Case workspace with a selected source-backed claim
3. Evidence graph with the source detail panel
4. Timeline and discrepancy matrix

See the "Capturing showcase frames" section of `README.md` for the capture steps.

## Links

- X / Twitter: <https://x.com/KevinMoncla>

## Assets

- `public/og-image.svg` — social preview card
- `public/orynth-cover.svg` — cover art (1200 × 675)
- `public/orynth-logo.svg` — logo for directory listings
- `public/logo.svg`, `public/icon.svg`, `public/icon-mono.svg` — brand marks

## Honest limitations

CaseSignal is a new product built for this launch. It has **no customers, no
revenue, no partnerships and no published accuracy benchmarks**, and it holds no
third-party compliance certifications. Its outputs are research assistance, not
findings of fact.

All example content shipped with the product — the Northstar County Equipment
Procurement Review — is fictional and refers to no real jurisdiction, person,
company, election or allegation.
