# CaseSignal Security

CaseSignal holds material that is often sensitive before it is public: responsive
records, unpublished document sets, interview transcripts, internal correspondence.
The product is built on the assumption that a leak of any single artefact — a URL,
a case id, a storage key — must not be enough to read someone's case.

This document describes what is implemented today. It does **not** claim any
third-party certification: CaseSignal holds none.

---

## 1. Authorization

**Every case-scoped operation passes through one gate.**

`src/server/auth/guard.ts` → `requireCaseAccess(caseId, { write })`:

1. Requires an authenticated session.
2. Rejects a malformed case id before touching the database.
3. Loads the case and reads its `organization_id` **from the row**, never from the
   request.
4. Verifies the signed-in profile has a membership row for that organization, or
   an explicit per-case grant.
5. For writes, rejects `viewer` roles.

`requireSourceAccess(sourceId)` resolves the source's own `case_id` and delegates
to the same gate.

Consequences:

- **IDOR is prevented at the data layer.** Substituting another organization's case
  id fails the membership check regardless of how the request was routed.
- **The client never supplies an organization id.** It is always derived from the
  session or the row being accessed.
- **Route-level protection is defence in depth, not the control.** Clerk middleware
  guards `/app/*`, but every server action and route handler re-checks
  independently.

Server actions return a typed result envelope rather than throwing across the
boundary, and `toClientError()` strips anything internal before a message reaches
the browser.

---

## 2. File storage

Uploaded files are never publicly addressable.

- **Storage keys are server-generated**: `cases/<caseUuid>/<randomUuid><ext>`. User
  input never reaches a filesystem path, and `assertSafeKey()` re-validates the
  shape on every read, write and delete.
- **Supabase mode**: a private bucket; reads go through short-lived (5 minute)
  signed URLs created server-side with the service-role key. That key is
  server-only and never sent to the browser.
- **Local mode**: files live in a directory outside the web root and are served by
  `/api/sources/[sourceId]/file`, which re-runs `requireSourceAccess` on **every**
  request. Responses carry `cache-control: private, no-store` and
  `x-content-type-options: nosniff`.

The authorization model is therefore identical in both modes: possession of a path
grants nothing.

---

## 3. Upload validation

`src/server/ingest/validate.ts`:

- **Extension and declared MIME must both be recognised** against
  `ACCEPTED_UPLOADS`. A generic type (`application/octet-stream`, or `text/plain`
  for `.csv`/`.md`) falls back to the extension and substitutes the canonical MIME;
  a genuine mismatch — `payload.exe` declared as `application/pdf` — is rejected.
- **Size** is capped at `MAX_UPLOAD_BYTES` (25 MB) and zero-byte files are rejected.
- **Filenames are sanitized**: directory components, null bytes, control characters
  and leading dots are stripped, the character set is restricted, length is capped
  at 120 characters preserving the extension, and `.`, `..` and traversal sequences
  resolve to `untitled`.
- **Pasted text** is capped at `MAX_PASTE_CHARS` and stripped of control characters
  other than newline and tab.

Accepted formats: PDF, DOCX, TXT, Markdown, CSV, XLSX, PNG, JPG, WEBP, plus public
HTML pages, pasted text and typed notes.

---

## 4. URL ingestion (SSRF)

`src/server/ingest/url.ts` treats every user-supplied URL as hostile.

`assertSafeUrl()` rejects:

- any protocol other than `http:`/`https:`
- embedded credentials (`user:pass@`)
- any port other than 80, 443 or the default
- `localhost`, `*.localhost`, `*.local`, `*.internal`
- IPv6 literals
- IPv4 in `10/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254/16` (including the
  cloud metadata address `169.254.169.254`), `0/8`, `100.64/10`, `192.0.0/24`,
  `198.18/15`, `224/4` and `240/4`
- encoded IPv4 forms — decimal (`2130706433`), octal (`0177.0.0.1`) and hex
  (`0x7f.0.0.1`) are normalised before the range check

`fetchPublicPage()` additionally:

- uses `redirect: 'manual'` and **re-runs `assertSafeUrl` on every hop**, at most 3
  — this is what stops a public host redirecting into the metadata service
- times out after 15 seconds
- accepts only HTML content types
- caps the response body at 5 MB, checking `content-length` and enforcing the cap
  while streaming

HTML is parsed with jsdom with scripts disabled and no resource loading; `script`,
`style`, `noscript`, `iframe` and `svg` elements are removed before text
extraction.

---

## 5. Rate limiting

`src/server/security/rate-limit.ts` applies sliding-window limits per minute to
the endpoints that cost money or reach the network:

| Bucket | Limit |
| --- | --- |
| AI operations | 30 |
| Uploads | 40 |
| URL imports | 10 |
| Exports | 12 |
| Share updates | 20 |
| Public evidence-room requests | 60 |

Identifiers are HMAC-SHA256 hashes salted with `RATE_LIMIT_SECRET`. **Raw IP
addresses are never stored** — not in the limiter, not in the audit log.

The limiter is in-process, which bounds abuse per instance. A multi-instance
deployment should back it with a shared store; the interface is a single `check()`
function so the swap is one file.

---

## 6. Plan enforcement

Entitlements are read from the `subscriptions` row, which is written **only** by
the verified Stripe webhook or an explicit server-side override. Nothing about a
plan is ever trusted from the client.

Limits live in `src/lib/domain.ts`, so the published pricing table and the
enforcement path cannot disagree. When a limit is reached, `PlanLimitError` names
the exact metric, the limit, current usage and the reset date — and no work in
progress is discarded.

---

## 7. Webhooks

**Stripe** — the raw request body is read before any parsing and verified with
`constructEventAsync` against `STRIPE_WEBHOOK_SECRET`. A missing or invalid
signature is rejected with 400. The organization is resolved from event metadata or
the stored customer id; unhandled event types return 200 without side effects.

**Clerk** — Svix signatures are verified manually with `node:crypto`: the signed
payload is `${svix-id}.${svix-timestamp}.${body}`, HMAC-SHA256 with the
base64-decoded secret, compared in constant time against each `v1,` signature.
Timestamps older than five minutes are rejected (replay protection). Handles
`user.updated` (profile sync) and `user.deleted` (soft-delete plus removal of the
user's personal-workspace cases and their stored files).

---

## 8. Public evidence rooms

Nothing is public by default, at three independent levels:

1. A share record does not exist until an analyst creates one.
2. A created share is **disabled** until explicitly enabled.
3. Each source, claim, timeline event and discrepancy carries its own
   `included_in_share` flag; only opted-in items are rendered.

Additional controls: custom slug, expiry date, password protection, hiding analyst
notes, disabling downloads, and immediate revocation.

Passwords are hashed with **scrypt** and a per-share 16-byte random salt, stored as
`scrypt$<salt>$<hash>`, and compared with `crypto.timingSafeEqual`. A malformed
stored value returns `false` rather than throwing.

The public route is rate-limited, is `noindex`, and never links into the private
workspace. File downloads are not exposed through a public route at all.

---

## 9. AI safety and evidentiary integrity

**Citations are verified before display.** `verifyCitations()` checks every marker
against the excerpts actually retrieved for that answer. A marker naming a source
that was not retrieved, or one that cannot be resolved to a stored chunk, is
stripped from the text. If nothing survives, the answer is replaced with an
explicit statement that the case sources do not establish the point.

**Displayed excerpts come from the database, never the model.** The excerpt shown
beside a citation is the stored chunk text, so a paraphrase can never be presented
as a quotation.

**Structured output is schema-validated.** Every extraction is parsed against a Zod
schema. On failure the model gets exactly one repair attempt with the validation
errors quoted back; if it fails again, an analysis error is recorded and **nothing
is written**. Partial or invented data is never inserted.

**Chunk ids are pruned to the supplied set.** Any chunk id in a structured result
that was not in the prompt is discarded before persistence.

**Cross-case citation is impossible.** `attachEvidenceRows()` verifies that every
chunk id belongs to the case before an evidence row is created.

**Prompts constrain the output.** The shared principles instruct the model to work
only from supplied excerpts, separate observation from inference, use neutral
non-accusatory language, never infer intent or criminality, preserve contradictory
evidence, and never suppress evidence that conflicts with an apparent pattern.

**No hidden reasoning is stored.** The usage ledger records operation, provider,
model, token counts, estimated cost, duration and status — not prompts, not
responses, not chain-of-thought.

---

## 10. Transport and headers

Set globally in `next.config.ts`:

- `Content-Security-Policy` with `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `frame-ancestors 'none'` and an explicit allowlist for
  Clerk and Stripe. `unsafe-eval` is emitted **only** in development for React
  Refresh.
- `Strict-Transport-Security` (2 years, `includeSubDomains`, `preload`)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` denying camera, microphone, geolocation and interest cohorts
- `X-Powered-By` removed

---

## 11. Audit logging

Actions with evidentiary or privacy weight are recorded to `audit_logs` **before**
the rows they describe are removed: case creation and deletion, case-map builds,
source addition and deletion, claim status changes, discrepancy review, export,
share enable/update/revoke, per-source share inclusion, and bulk workspace
deletion.

Each entry stores the organization, case, actor profile, action, target and a
short human-readable summary. IP addresses are stored only as salted hashes, if at
all.

---

## 12. Secrets

Never exposed to the client: `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`,
`VOYAGE_API_KEY`, `STRIPE_SECRET_KEY`, `CLERK_SECRET_KEY`, webhook signing
secrets, `DATABASE_URL`, `RATE_LIMIT_SECRET`.

Only `NEXT_PUBLIC_`-prefixed values reach the browser, and every one of them is
intended to be public. `src/lib/env.ts` validates the environment at startup with
Zod and fails with actionable guidance rather than a stack trace.

Internal errors are logged server-side and returned to clients as a generic
message. Stack traces, provider errors and database messages are never surfaced.

---

## 13. Data deletion

- **Source** — removes the source, its pages, sheets, excerpts and every citation
  that referenced it, and deletes the stored file.
- **Case** — deletes all sources, excerpts, claims, evidence, events,
  discrepancies, entities, relationships, conversations, briefs, shares and stored
  files via `ON DELETE CASCADE`, after writing the audit entry.
- **Workspace** — Settings → Workspace → Danger zone deletes every case, requiring
  the word `DELETE` to be typed.
- **User** — the Clerk `user.deleted` webhook soft-deletes the profile and removes
  cases owned solely by that user's personal organization, including their files.

---

## 14. Known limitations

Stated plainly, because a security document that only lists strengths is not
useful:

- **No third-party certification.** CaseSignal has not undergone SOC 2, ISO 27001
  or any equivalent audit.
- **Rate limiting is per-instance.** See §5.
- **Source processing is synchronous.** A very large batch can exhaust a serverless
  function's time budget; move `processSource` behind a queue for heavy workloads.
- **Local mode is for development.** The local cookie session is not a hardened
  authentication system; production deployments should configure Clerk.
- **Extraction quality varies by document.** Scanned PDFs are detected and marked
  `needs_review` rather than silently indexed, but low-confidence extractions
  should always be read against the original.
- **Encryption at rest is the storage provider's.** CaseSignal does not add an
  application-level encryption layer over Supabase or the local filesystem.

---

## Reporting a vulnerability

Please report security issues privately rather than opening a public issue. Use the
contact address published on the site's Security page (`NEXT_PUBLIC_CONTACT_EMAIL`).
Include reproduction steps and the affected route or module. We will acknowledge
and work with you on a disclosure timeline.
