import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { and, eq, isNull, sql } from 'drizzle-orm'

import { getDb } from '@/server/db'
import { cases, publicShares } from '@/server/db/schema'
import { getBrief, getClaims, getDiscrepancies, getSources, getTimeline } from '@/server/queries/case-detail'
import { check, clientIdentifier } from '@/server/security/rate-limit'
import { RateLimitError } from '@/server/auth/errors'
import {
  DEMO_BANNER,
  DISCREPANCY_TYPE_LABELS,
  NEUTRALITY_DISCLAIMER,
  SOURCE_FORMAT_LABELS,
  type DiscrepancyType,
  type SourceFormat,
} from '@/lib/domain'
import { formatDate } from '@/lib/utils'
import { ClaimStatusChip, PrecisionChip } from '@/components/ui'
import { Logomark } from '@/components/brand/logo'
import { hasShareAccess, isShareSlug } from './share-session'
import { PasswordGate } from './password-gate'

/**
 * The public evidence room.
 *
 * This is the only page in CaseSignal that renders case content without a
 * session, so every decision here is a visibility decision:
 *
 *  · the share row must be enabled, un-revoked and unexpired, or the room 404s;
 *  · a password, if set, is checked before a single field of the case is read;
 *  · each section renders only when its flag is on, and inside a section only
 *    items the analyst explicitly marked `includedInShare` appear;
 *  · analyst notes stay private unless `showAnalystNotes` is on;
 *  · no link leads back into the workspace, and no original file is served.
 *
 * Citations are shown as markers — source label and locator — so a reader can
 * ask the publisher for the exact page without the room exposing the record.
 */

export const dynamic = 'force-dynamic'

/* ------------------------------------------------------------------- data */

async function loadRoom(slug: string) {
  if (!isShareSlug(slug)) return null

  const db = await getDb()
  const rows = await db
    .select({ share: publicShares, caseRow: cases })
    .from(publicShares)
    .innerJoin(cases, eq(cases.id, publicShares.caseId))
    .where(
      and(
        eq(publicShares.slug, slug),
        eq(publicShares.enabled, true),
        isNull(publicShares.revokedAt),
        isNull(cases.deletedAt),
      ),
    )
    .limit(1)

  const row = rows[0]
  if (!row) return null
  if (row.share.expiresAt && row.share.expiresAt.getTime() <= Date.now()) return null
  return row
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const room = await loadRoom(slug)

  return {
    title: room?.caseRow.title ?? 'Evidence room',
    description: room?.caseRow.description || 'A published, source-backed evidence room.',
    // Published rooms are shared deliberately, not indexed.
    robots: { index: false, follow: false },
    openGraph: undefined,
    twitter: undefined,
  }
}

/* --------------------------------------------------------------- fragments */

function Citation({ label, locator }: { label: string; locator: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap rounded border border-line bg-page px-1.5 py-[3px] align-middle font-mono text-[10.5px] leading-none">
      <span className="font-medium text-ink">{label}</span>
      {locator ? <span className="text-ink-muted">{locator}</span> : null}
    </span>
  )
}

function CitationRow({ items }: { items: { key: string; label: string; locator: string }[] }) {
  if (items.length === 0) return null
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {items.map((item) => (
        <Citation key={item.key} label={item.label} locator={item.locator} />
      ))}
    </div>
  )
}

function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
}: {
  id: string
  eyebrow: string
  title: string
  lede?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mt-14 border-t border-line pt-10 first:mt-0 first:border-0 first:pt-0">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">{eyebrow}</p>
      <h2 className="mt-2.5 text-[23px] font-medium leading-tight tracking-[-0.02em] text-ink">{title}</h2>
      {lede ? <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-ink-secondary">{lede}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  )
}

function AnalystNote({ note }: { note: string }) {
  if (!note.trim()) return null
  return (
    <p className="mt-3 border-l-2 border-signal-border pl-3 text-[13px] leading-relaxed text-ink-secondary">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">Analyst note </span>
      {note.trim()}
    </p>
  )
}

/** Renders `**bold**` spans without ever handing markup to the DOM. */
function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const pattern = /\*\*([^*]+)\*\*/g
  let cursor = 0
  let index = 0
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0
    if (start > cursor) nodes.push(text.slice(cursor, start))
    nodes.push(
      <strong key={`${keyPrefix}-b${index}`} className="font-medium text-ink">
        {match[1]}
      </strong>,
    )
    index += 1
    cursor = start + match[0].length
  }
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

/** Paragraphs and bullet lists from a stored brief section body. */
function Prose({ body }: { body: string }) {
  const blocks = body
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  return (
    <div className="space-y-4">
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n')
        if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
          return (
            <ul key={blockIndex} className="space-y-2">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="relative pl-5 text-[15px] leading-[1.72] text-ink">
                  <span className="absolute left-0 top-[0.62em] size-[3px] rounded-full bg-ink-muted" />
                  {inline(line.replace(/^\s*[-*]\s+/, ''), `${blockIndex}-${lineIndex}`)}
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={blockIndex} className="max-w-[68ch] text-[15px] leading-[1.72] text-ink">
            {inline(block.replace(/\n/g, ' '), String(blockIndex))}
          </p>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------- page */

export default async function EvidenceRoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  try {
    check('publicShare', clientIdentifier(await headers(), slug))
  } catch (error) {
    if (!(error instanceof RateLimitError)) throw error
    return (
      <main className="flex min-h-dvh items-center justify-center bg-page px-5 py-16">
        <div className="w-full max-w-[440px] rounded-panel border border-line bg-canvas px-7 py-8 shadow-panel">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">Evidence room</p>
          <h1 className="mt-3 text-[21px] font-medium leading-tight tracking-tight text-ink">
            Too many requests from this connection.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{error.message}</p>
        </div>
      </main>
    )
  }

  const room = await loadRoom(slug)
  if (!room) notFound()

  const { share, caseRow } = room

  // Nothing about the case is read until the password has been accepted.
  if (!(await hasShareAccess(slug, share.passwordHash))) {
    return <PasswordGate slug={slug} />
  }

  const db = await getDb()
  await db
    .update(publicShares)
    .set({ viewCount: sql`${publicShares.viewCount} + 1` })
    .where(eq(publicShares.id, share.id))

  const [brief, allSources, allClaims, allEvents, allDiscrepancies] = await Promise.all([
    getBrief(caseRow.id, caseRow.title),
    getSources(caseRow.id),
    share.showClaims ? getClaims(caseRow.id) : Promise.resolve([]),
    share.showTimeline ? getTimeline(caseRow.id) : Promise.resolve([]),
    share.showDiscrepancies ? getDiscrepancies(caseRow.id) : Promise.resolve([]),
  ])

  const sharedSources = allSources.filter((source) => source.includedInShare)
  const claims = allClaims.filter((claim) => claim.includedInShare)
  const events = allEvents.filter((event) => event.includedInShare)
  const discrepancies = allDiscrepancies.filter((discrepancy) => discrepancy.includedInShare)

  const sectionBody = (key: string) => {
    const section = brief.sections.find((s) => s.key === key && s.included)
    return section?.body.trim() ?? ''
  }
  const methodology = sectionBody('methodology')
  const limitations = sectionBody('limitations')

  const lastUpdated =
    share.updatedAt.getTime() > caseRow.updatedAt.getTime() ? share.updatedAt : caseRow.updatedAt

  const hasContent =
    Boolean(methodology) ||
    Boolean(limitations) ||
    events.length > 0 ||
    claims.length > 0 ||
    discrepancies.length > 0 ||
    (share.showSources && sharedSources.length > 0)

  return (
    <div className="min-h-dvh bg-page px-4 py-8 sm:px-6 sm:py-14">
      <article className="mx-auto w-full max-w-[860px] rounded-panel border border-line bg-canvas px-6 py-11 shadow-preview sm:px-14 sm:py-16">
        {/* ---------------------------------------------------------- header */}
        <header>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-muted">
              Public evidence room
            </p>
            {caseRow.isDemo ? (
              <span className="inline-flex items-center rounded-full border border-signal-border bg-signal-soft px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-signal">
                {DEMO_BANNER}
              </span>
            ) : null}
          </div>

          <h1 className="mt-5 text-[34px] font-medium leading-[1.1] tracking-[-0.028em] text-ink sm:text-[42px]">
            {caseRow.title}
          </h1>

          {caseRow.description ? (
            <p className="mt-5 max-w-[62ch] text-[17px] leading-[1.62] text-ink-secondary">
              {caseRow.description}
            </p>
          ) : null}

          <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-5 text-[12.5px]">
            <div>
              <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">Last updated</dt>
              <dd className="mt-1 text-ink tabular">{formatDate(lastUpdated)}</dd>
            </div>
            {share.showSources ? (
              <div>
                <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">Records</dt>
                <dd className="mt-1 text-ink tabular">{sharedSources.length}</dd>
              </div>
            ) : null}
            {share.showClaims ? (
              <div>
                <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">Claims</dt>
                <dd className="mt-1 text-ink tabular">{claims.length}</dd>
              </div>
            ) : null}
            {share.showDiscrepancies ? (
              <div>
                <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">
                  Discrepancies
                </dt>
                <dd className="mt-1 text-ink tabular">{discrepancies.length}</dd>
              </div>
            ) : null}
          </dl>

          <p className="mt-6 rounded-control border border-line bg-page px-4 py-3.5 text-[12.5px] leading-relaxed text-ink-secondary">
            {NEUTRALITY_DISCLAIMER}
          </p>
        </header>

        <div className="mt-14">
          {/* ------------------------------------------------- methodology */}
          {methodology ? (
            <Section id="methodology" eyebrow="How this was assembled" title="Methodology">
              <Prose body={methodology} />
            </Section>
          ) : null}

          {/* ---------------------------------------------------- timeline */}
          {share.showTimeline && events.length > 0 ? (
            <Section
              id="timeline"
              eyebrow="Dated record"
              title="Timeline"
              lede="Events as dated by the cited records. Where a date is inferred or disputed, it is marked."
            >
              <ol className="space-y-0">
                {events.map((event) => (
                  <li key={event.id} className="border-t border-line py-5 first:border-0 first:pt-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                      <time
                        className="font-mono text-[12px] tabular text-ink-secondary"
                        dateTime={event.occurredOn}
                      >
                        {formatDate(event.occurredOn)}
                        {event.occurredEndOn ? ` – ${formatDate(event.occurredEndOn)}` : ''}
                      </time>
                      {event.precision !== 'exact' ? (
                        <PrecisionChip precision={event.precision} size="sm" />
                      ) : null}
                    </div>
                    <h3 className="mt-1.5 text-[16px] font-medium leading-snug text-ink">{event.title}</h3>
                    {event.description ? (
                      <p className="mt-1.5 max-w-[68ch] text-[14px] leading-[1.7] text-ink-secondary">
                        {event.description}
                      </p>
                    ) : null}
                    <CitationRow
                      items={event.citations.map((citation) => ({
                        key: citation.chunkId,
                        label: citation.sourceLabel,
                        locator: citation.locator,
                      }))}
                    />
                    {share.showAnalystNotes ? <AnalystNote note={event.analystNotes} /> : null}
                  </li>
                ))}
              </ol>
            </Section>
          ) : null}

          {/* ------------------------------------------------ claim ledger */}
          {share.showClaims && claims.length > 0 ? (
            <Section
              id="claims"
              eyebrow="What the records support"
              title="Claim ledger"
              lede="Each claim carries the status the cited records give it. A status describes the record, not a conclusion about any person or organization."
            >
              <ul className="space-y-0">
                {claims.map((claim) => (
                  <li key={claim.id} className="border-t border-line py-5 first:border-0 first:pt-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      <p className="max-w-[62ch] text-[15.5px] leading-[1.66] text-ink">{claim.statement}</p>
                      <div className="shrink-0">
                        <ClaimStatusChip status={claim.status} size="sm" />
                      </div>
                    </div>
                    <CitationRow
                      items={claim.evidence.map((evidence) => ({
                        key: evidence.id,
                        label: evidence.sourceLabel,
                        // A conflicting citation says so on the chip, so the
                        // reader is never left to infer it from colour.
                        locator:
                          evidence.role === 'contradicting'
                            ? `conflicting${evidence.locator ? ` · ${evidence.locator}` : ''}`
                            : evidence.locator,
                      }))}
                    />
                    {share.showAnalystNotes ? <AnalystNote note={claim.analystNotes} /> : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {/* ----------------------------------------------- discrepancies */}
          {share.showDiscrepancies && discrepancies.length > 0 ? (
            <Section
              id="discrepancies"
              eyebrow="Where the records differ"
              title="Discrepancies"
              lede="Points where two records state different values for the same subject. Both readings are preserved rather than resolved."
            >
              <ul className="space-y-0">
                {discrepancies.map((discrepancy) => (
                  <li key={discrepancy.id} className="border-t border-line py-6 first:border-0 first:pt-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">
                        {DISCREPANCY_TYPE_LABELS[discrepancy.type as DiscrepancyType] ?? 'Difference'}
                      </span>
                      {discrepancy.resolvedAt ? (
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-status-supported">
                          Resolved
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-1.5 text-[16.5px] font-medium leading-snug text-ink">
                      {discrepancy.title}
                    </h3>
                    <p className="mt-2 max-w-[68ch] text-[14px] leading-[1.7] text-ink-secondary">
                      {discrepancy.description}
                    </p>

                    {discrepancy.sides.length > 0 ? (
                      <div className="mt-4 grid gap-px overflow-hidden rounded-control border border-line bg-line sm:grid-cols-2">
                        {discrepancy.sides.map((side) => (
                          <div key={`${side.chunkId}-${side.side}`} className="bg-canvas px-4 py-3.5">
                            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">
                              {side.side === 'a' ? 'One record states' : 'Another record states'}
                            </p>
                            <p className="mt-1.5 text-[15px] font-medium leading-snug text-ink tabular">
                              {side.statedValue || 'Value not stated'}
                            </p>
                            <div className="mt-2.5">
                              <Citation label={side.sourceLabel} locator={side.locator} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {share.showAnalystNotes ? <AnalystNote note={discrepancy.analystNotes} /> : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {/* -------------------------------------------- source inventory */}
          {share.showSources && sharedSources.length > 0 ? (
            <Section
              id="records"
              eyebrow="What was read"
              title="Record inventory"
              lede="Every record published with this room, with the label its citations use."
            >
              <ul className="space-y-0">
                {sharedSources.map((source) => (
                  <li
                    key={source.id}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-line py-3.5 first:border-0 first:pt-0"
                  >
                    <span className="w-8 shrink-0 font-mono text-[12px] font-medium text-ink">{source.label}</span>
                    <span className="min-w-0 flex-1 text-[14.5px] leading-snug text-ink">{source.title}</span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                      {SOURCE_FORMAT_LABELS[source.format as SourceFormat] ?? source.format}
                      {source.pageCount > 0 ? ` · ${source.pageCount} p.` : ''}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[12.5px] leading-relaxed text-ink-muted">
                {share.allowDownloads
                  ? 'Original files are not served from this room. Ask the publisher for a copy of any record listed above.'
                  : 'Downloads are disabled for this evidence room. The original files stay in the private workspace.'}
              </p>
            </Section>
          ) : null}

          {/* ------------------------------------------------- limitations */}
          {limitations ? (
            <Section id="limitations" eyebrow="What this does not establish" title="Limitations">
              <Prose body={limitations} />
            </Section>
          ) : null}

          {!hasContent ? (
            <p className="text-[15px] leading-relaxed text-ink-secondary">
              Nothing has been published to this evidence room yet. The link is live, but the analyst has not
              marked any record, claim or finding for inclusion.
            </p>
          ) : null}
        </div>

        {/* ---------------------------------------------------------- footer */}
        <footer className="mt-16 border-t border-line pt-7">
          <p className="max-w-[70ch] text-[12px] leading-relaxed text-ink-muted">{NEUTRALITY_DISCLAIMER}</p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[11px] tabular text-ink-muted">
              Last updated {formatDate(lastUpdated)}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-muted transition-colors hover:text-ink"
            >
              <Logomark className="h-3.5 w-3.5" />
              Published with CaseSignal
            </Link>
          </div>
        </footer>
      </article>
    </div>
  )
}
