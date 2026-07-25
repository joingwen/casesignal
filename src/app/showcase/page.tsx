import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'

import { getDb } from '@/server/db'
import { cases, entities, sourceChunks } from '@/server/db/schema'
import {
  getCaseOverview,
  getClaims,
  getDiscrepancies,
  getGraph,
  getSourceDetail,
  getSources,
  getTimeline,
  type ClaimView,
  type DiscrepancyView,
  type SourceDetail,
  type SourceListItem,
  type TimelineEventView,
} from '@/server/queries/case-detail'
import {
  CLAIM_CATEGORY_LABELS,
  DEMO_BANNER,
  DISCREPANCY_TYPE_LABELS,
  SOURCE_FORMAT_LABELS,
  type ClaimCategory,
  type DiscrepancyType,
  type SourceFormat,
} from '@/lib/domain'
import { appUrl } from '@/lib/env'
import { cn, formatDate } from '@/lib/utils'
import {
  ClaimStatusChip,
  EvidenceRoleChip,
  PrecisionChip,
  ProcessingStatusChip,
  ReviewStateChip,
} from '@/components/ui'
import { Logomark } from '@/components/brand/logo'
import { FRAME_SIZES, parseFrameSize } from './frame-size'
import { ShowcaseShell, type ShowcaseFrame } from './showcase-shell'
import { Hero } from '@/components/marketing/hero'

/**
 * Screenshot frames.
 *
 * Every frame below is composed from the seeded demonstration case read out of
 * the database at render time — the same queries the workspace uses. Nothing is
 * mocked, so a capture cannot show a layout the product cannot actually produce.
 *
 * The page is development and preview only. In production it 404s unless
 * SHOWCASE_ENABLED is set, so a marketing harness never ships as a public
 * surface.
 */

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Capture frames',
  robots: { index: false, follow: false },
}

/* -------------------------------------------------------------------- data */

interface ShowcaseData {
  caseRow: typeof cases.$inferSelect
  overview: Awaited<ReturnType<typeof getCaseOverview>>
  sources: SourceListItem[]
  claims: ClaimView[]
  timeline: TimelineEventView[]
  discrepancies: DiscrepancyView[]
  graph: Awaited<ReturnType<typeof getGraph>>
  /** entity node id → source node id, resolved through each entity's first mention. */
  entitySource: Map<string, string>
  detail: SourceDetail | null
}

async function loadShowcase(): Promise<ShowcaseData | null> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(cases)
    .where(and(eq(cases.isDemo, true), isNull(cases.deletedAt)))
    .orderBy(desc(cases.updatedAt))
    .limit(1)

  const caseRow = rows[0]
  if (!caseRow) return null

  const [overview, sources, claims, timeline, discrepancies, graph] = await Promise.all([
    getCaseOverview(caseRow.id, caseRow),
    getSources(caseRow.id),
    getClaims(caseRow.id),
    getTimeline(caseRow.id),
    getDiscrepancies(caseRow.id),
    getGraph(caseRow.id),
  ])

  // The detail panel shows the record with the most citations against it.
  const busiest = [...sources].sort((a, b) => b.evidenceCount - a.evidenceCount)[0]
  const detail = busiest ? await getSourceDetail(caseRow.id, busiest.id) : null

  const entityIds = graph.nodes.filter((n) => n.kind === 'entity').map((n) => n.id.replace('entity:', ''))
  const entitySource = new Map<string, string>()
  if (entityIds.length > 0) {
    const firstSeen = await db
      .select({ id: sourceChunks.id, sourceId: sourceChunks.sourceId })
      .from(sourceChunks)
      .where(eq(sourceChunks.caseId, caseRow.id))
    const chunkToSource = new Map(firstSeen.map((c) => [c.id, c.sourceId]))
    // Each entity records the chunk it was first seen in; that chunk names the
    // record, which is the real "mentions" edge drawn on the graph.
    const withChunks = await db
      .select({ id: entities.id, chunkId: entities.firstSeenChunkId })
      .from(entities)
      .where(inArray(entities.id, entityIds))
    for (const row of withChunks) {
      const sourceId = row.chunkId ? chunkToSource.get(row.chunkId) : undefined
      if (sourceId) entitySource.set(`entity:${row.id}`, `source:${sourceId}`)
    }
  }

  return { caseRow, overview, sources, claims, timeline, discrepancies, graph, entitySource, detail }
}

/* --------------------------------------------------------------- fragments */

function Chrome({
  title,
  tab,
  meta,
  children,
}: {
  title: string
  tab: string
  meta: string
  children: React.ReactNode
}) {
  const tabs = ['Overview', 'Records', 'Claims', 'Timeline', 'Graph', 'Brief']
  return (
    <div className="flex h-full w-full flex-col bg-page">
      <div className="flex h-11 shrink-0 items-center gap-2.5 border-b border-line bg-canvas px-4">
        <Logomark className="h-[17px] w-[17px] text-ink" />
        <span className="text-[13px] font-semibold tracking-[-0.02em] text-ink">CaseSignal</span>
        <span className="text-ink-muted">/</span>
        <span className="max-w-[430px] truncate text-[13px] text-ink">{title}</span>
        <span className="inline-flex items-center rounded-full border border-signal-border bg-signal-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-signal">
          {DEMO_BANNER}
        </span>
        <span className="ml-auto font-mono text-[11px] tabular text-ink-muted">{meta}</span>
        <span className="size-6 rounded-full border border-line bg-surface" />
      </div>
      <div className="flex h-9 shrink-0 items-center gap-0.5 border-b border-line bg-canvas px-3">
        {tabs.map((item) => (
          <span
            key={item}
            className={cn(
              'rounded-control px-2.5 py-1 text-[12.5px]',
              item === tab ? 'bg-surface font-medium text-ink' : 'text-ink-secondary',
            )}
          >
            {item}
          </span>
        ))}
      </div>
      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  )
}

function PanelHeading({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line px-3.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">{children}</span>
      {right ? <span className="ml-auto">{right}</span> : null}
    </div>
  )
}

/** Wraps the figures a discrepancy turns on, using the product's excerpt mark. */
function Excerpt({ text, terms }: { text: string; terms: string[] }) {
  const clean = text.replace(/\s*\n\s*/g, ' ').trim()
  if (terms.length === 0) return <>{clean}</>

  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
  const parts = clean.split(pattern)
  return (
    <>
      {parts.map((part, index) =>
        terms.includes(part) ? (
          <mark key={index} className="excerpt-mark">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  )
}

function CiteChip({ label, locator }: { label: string; locator: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap rounded border border-evidence-border bg-evidence-soft px-1.5 py-[2px] font-mono text-[10px] leading-none text-evidence-deep">
      <span className="font-medium">{label}</span>
      {locator ? <span className="opacity-70">{locator}</span> : null}
    </span>
  )
}

/* ------------------------------------------------------------ frame: hero */

/**
 * Frame 1 renders the real landing hero, so a capture taken here is byte-for-byte
 * the component visitors see at `/` rather than a stand-in that can drift.
 */
function HeroFrame() {
  return (
    <div className="h-full w-full overflow-hidden bg-canvas">
      <Hero className="pb-10 pt-10 lg:pb-12 lg:pt-12" />
    </div>
  )
}

/* ------------------------------------------------------- frame: workspace */

function WorkspaceFrame({ data, terms }: { data: ShowcaseData; terms: string[] }) {
  const selected =
    data.claims.find((claim) => claim.status === 'contradicted' && claim.evidence.length >= 2) ??
    data.claims.find((claim) => claim.evidence.length > 0) ??
    data.claims[0]

  const citedSourceIds = new Set(selected?.evidence.map((e) => e.sourceId) ?? [])

  return (
    <Chrome
      title={data.caseRow.title}
      tab="Claims"
      meta={`${data.overview.counts.sources} records · ${data.overview.counts.claims} claims · ${data.overview.counts.discrepancies} differences`}
    >
      {/* ------------------------------------------------------- left rail */}
      <aside className="flex w-[252px] shrink-0 flex-col border-r border-line bg-canvas">
        <PanelHeading
          right={<span className="font-mono text-[10px] tabular text-ink-muted">{data.sources.length}</span>}
        >
          Records
        </PanelHeading>
        <div className="min-h-0 flex-1 overflow-hidden">
          {data.sources.map((source) => (
            <div
              key={source.id}
              className={cn(
                'flex items-start gap-2.5 border-b border-line px-3.5 py-2.5',
                citedSourceIds.has(source.id) && 'bg-evidence-soft/50',
              )}
            >
              <span className="mt-[1px] w-[18px] shrink-0 font-mono text-[11px] font-medium text-ink">
                {source.label}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] leading-snug text-ink">{source.title}</span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                  {SOURCE_FORMAT_LABELS[source.format as SourceFormat]}
                  {source.pageCount > 0 ? ` · ${source.pageCount} p.` : ''}
                  {source.evidenceCount > 0 ? ` · ${source.evidenceCount} cited` : ''}
                </span>
              </span>
              {citedSourceIds.has(source.id) ? (
                <span className="mt-[5px] size-1.5 shrink-0 rounded-full bg-evidence" />
              ) : null}
            </div>
          ))}
        </div>
      </aside>

      {/* --------------------------------------------------- claim ledger */}
      <section className="flex min-w-0 flex-1 flex-col border-r border-line bg-canvas">
        <PanelHeading
          right={
            <span className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] tabular text-status-supported">
                {data.overview.counts.supported} supported
              </span>
              <span className="font-mono text-[10px] tabular text-status-contradicted">
                {data.overview.counts.contradicted} contradicted
              </span>
              <span className="font-mono text-[10px] tabular text-status-unresolved">
                {data.overview.counts.unresolved} unresolved
              </span>
            </span>
          }
        >
          Claim ledger
        </PanelHeading>
        <div className="min-h-0 flex-1 overflow-hidden">
          {data.claims.map((claim) => {
            const active = claim.id === selected?.id
            return (
              <div
                key={claim.id}
                className={cn(
                  'flex items-start gap-3 border-b border-line py-2.5 pl-3.5 pr-3',
                  active ? 'border-l-2 border-l-evidence bg-evidence-soft/60 pl-3' : 'border-l-2 border-l-transparent',
                )}
              >
                <span className="mt-[1px] shrink-0">
                  <ClaimStatusChip status={claim.status} size="sm" short />
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 text-[13px] leading-[1.5]',
                    active ? 'font-medium text-ink' : 'text-ink',
                  )}
                >
                  {claim.statement}
                </span>
                <span className="mt-[3px] shrink-0 font-mono text-[10px] tabular text-ink-muted">
                  {claim.evidence.length} cited
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ------------------------------------------------- selected claim */}
      <aside className="flex w-[352px] shrink-0 flex-col bg-canvas">
        <PanelHeading right={selected ? <ReviewStateChip state={selected.reviewState} size="sm" /> : null}>
          Claim detail
        </PanelHeading>

        {selected ? (
          <div className="min-h-0 flex-1 overflow-hidden px-3.5 py-3.5">
            <ClaimStatusChip status={selected.status} size="sm" />
            <p className="mt-2.5 text-[14px] font-medium leading-[1.5] text-ink">{selected.statement}</p>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-y border-line py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
              <span>{CLAIM_CATEGORY_LABELS[selected.category as ClaimCategory] ?? selected.category}</span>
              <span className="tabular">Materiality {selected.materiality}</span>
              <span className="tabular">Confidence {Math.round(selected.confidence * 100)}%</span>
            </div>

            <p className="mt-3.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              Cited evidence · {selected.evidence.length}
            </p>

            <div className="mt-2 space-y-2">
              {selected.evidence.slice(0, 3).map((evidence) => (
                <div key={evidence.id} className="rounded-control border border-line bg-page px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <EvidenceRoleChip role={evidence.role} size="sm" />
                    <CiteChip label={evidence.sourceLabel} locator={evidence.locator} />
                  </div>
                  <p className="mt-2 line-clamp-4 text-[12px] leading-[1.62] text-ink-secondary">
                    <Excerpt text={evidence.excerpt} terms={terms} />
                  </p>
                </div>
              ))}
            </div>

            {selected.analystNotes ? (
              <div className="mt-3 border-l-2 border-signal-border pl-2.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Analyst note</p>
                <p className="mt-1 line-clamp-4 text-[12px] leading-[1.6] text-ink-secondary">
                  {selected.analystNotes}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </aside>
    </Chrome>
  )
}

/* ----------------------------------------------------------- frame: graph */

const GRAPH_W = 900
const GRAPH_H = 620

function GraphFrame({ data }: { data: ShowcaseData }) {
  const entities = data.graph.nodes.filter((n) => n.kind === 'entity').slice(0, 6)
  const sources = data.graph.nodes.filter((n) => n.kind === 'source')
  const claims = data.graph.nodes.filter((n) => n.kind === 'claim').slice(0, 5)

  const column = (count: number, index: number, top: number, bottom: number) =>
    count <= 1 ? (top + bottom) / 2 : top + ((bottom - top) * index) / (count - 1)

  // Ranges are chosen so the tallest card in each column clears its neighbours
  // and the legend at the foot of the canvas.
  const position = new Map<string, { x: number; y: number }>()
  entities.forEach((node, i) => position.set(node.id, { x: 108, y: column(entities.length, i, 90, 500) }))
  sources.forEach((node, i) => position.set(node.id, { x: 442, y: column(sources.length, i, 55, 520) }))
  claims.forEach((node, i) => position.set(node.id, { x: 782, y: column(claims.length, i, 95, 510) }))

  const visible = new Set(position.keys())
  const evidenceEdges = data.graph.edges.filter(
    (edge) => visible.has(edge.source) && visible.has(edge.target) && edge.source.startsWith('claim:'),
  )
  const mentionEdges = entities
    .map((entity) => ({ from: entity.id, to: data.entitySource.get(entity.id) }))
    .filter((edge): edge is { from: string; to: string } => Boolean(edge.to && visible.has(edge.to)))

  const detail = data.detail

  return (
    <Chrome
      title={data.caseRow.title}
      tab="Graph"
      meta={`${data.overview.counts.entities} parties · ${data.overview.counts.sources} records · ${data.overview.counts.claims} claims`}
    >
      <section className="relative min-w-0 flex-1 overflow-hidden border-r border-line bg-page grid-coordinates">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {mentionEdges.map((edge) => {
            const from = position.get(edge.from)!
            const to = position.get(edge.to)!
            return (
              <path
                key={`${edge.from}-${edge.to}`}
                d={`M${from.x + 82} ${from.y} C ${from.x + 185} ${from.y}, ${to.x - 205} ${to.y}, ${to.x - 101} ${to.y}`}
                fill="none"
                stroke="#C9C9C2"
                strokeWidth="1.2"
              />
            )
          })}
          {evidenceEdges.map((edge) => {
            const from = position.get(edge.source)!
            const to = position.get(edge.target)!
            const conflicting = edge.type === 'contradicts'
            return (
              <path
                key={edge.id}
                d={`M${from.x - 112} ${from.y} C ${from.x - 220} ${from.y}, ${to.x + 205} ${to.y}, ${to.x + 101} ${to.y}`}
                fill="none"
                stroke={conflicting ? '#B4544C' : '#3F76C5'}
                strokeWidth={conflicting ? 1.8 : 1.3}
                strokeOpacity={conflicting ? 0.9 : 0.5}
                strokeDasharray={conflicting ? '5 3' : undefined}
              />
            )
          })}
        </svg>

        {entities.map((node) => {
          const point = position.get(node.id)!
          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(point.x / GRAPH_W) * 100}%`, top: `${(point.y / GRAPH_H) * 100}%` }}
            >
              <div className="w-[156px] rounded-full border border-line bg-canvas px-3 py-1.5 shadow-panel">
                <p className="truncate text-[11.5px] font-medium leading-tight text-ink">{node.name}</p>
                <p className="mt-0.5 truncate font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-muted">
                  {node.type} · {node.mentionCount}
                </p>
              </div>
            </div>
          )
        })}

        {sources.map((node) => {
          const point = position.get(node.id)!
          const [label, ...rest] = node.name.split(' · ')
          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(point.x / GRAPH_W) * 100}%`, top: `${(point.y / GRAPH_H) * 100}%` }}
            >
              <div
                className={cn(
                  'flex w-[192px] items-start gap-2 rounded-control border bg-canvas px-2.5 py-2 shadow-panel',
                  detail && node.id === `source:${detail.id}` ? 'border-evidence ring-2 ring-evidence/15' : 'border-line',
                )}
              >
                <span className="mt-[1px] font-mono text-[10.5px] font-medium text-ink">{label}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] leading-tight text-ink">{rest.join(' · ')}</span>
                  <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-muted">
                    {node.role}
                  </span>
                </span>
              </div>
            </div>
          )
        })}

        {claims.map((node) => {
          const point = position.get(node.id)!
          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(point.x / GRAPH_W) * 100}%`, top: `${(point.y / GRAPH_H) * 100}%` }}
            >
              <div className="w-[212px] rounded-control border border-line bg-canvas px-2.5 py-2 shadow-panel">
                {node.status ? <ClaimStatusChip status={node.status} size="sm" short /> : null}
                <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-[1.45] text-ink">{node.name}</p>
              </div>
            </div>
          )
        })}

        <div className="absolute bottom-3 left-3 flex items-center gap-4 rounded-control border border-line bg-canvas/95 px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-px w-5 bg-evidence" /> supports
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-px w-5 border-t border-dashed border-status-contradicted" /> contradicts
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-px w-5 bg-line-strong" /> mentions
          </span>
        </div>
      </section>

      {/* ------------------------------------------------- source detail */}
      <aside className="flex w-[344px] shrink-0 flex-col bg-canvas">
        <PanelHeading right={detail ? <ProcessingStatusChip status={detail.status} size="sm" /> : null}>
          Record detail
        </PanelHeading>

        {detail ? (
          <div className="min-h-0 flex-1 overflow-hidden px-3.5 py-3.5">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[12px] font-medium text-ink">{detail.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                {SOURCE_FORMAT_LABELS[detail.format as SourceFormat]}
              </span>
            </div>
            <p className="mt-1 text-[14px] font-medium leading-snug text-ink">{detail.title}</p>

            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 border-y border-line py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted tabular">
              <span>{detail.pageCount} pages</span>
              <span>{detail.wordCount} words</span>
              <span>{detail.chunks.length} excerpts</span>
              <span>{detail.evidenceCount} cited</span>
            </div>

            <p className="mt-3 line-clamp-3 text-[12px] leading-[1.62] text-ink-secondary">{detail.summary}</p>

            <p className="mt-3.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              Indexed excerpts
            </p>
            <div className="mt-2 space-y-2">
              {detail.chunks.slice(0, 4).map((chunk, index) => (
                <div
                  key={chunk.id}
                  className={cn(
                    'rounded-control border px-3 py-2',
                    index === 1 ? 'border-evidence bg-evidence-soft' : 'border-line bg-page',
                  )}
                >
                  <CiteChip label={detail.label} locator={chunk.locator} />
                  <p className="mt-1.5 line-clamp-3 text-[11.5px] leading-[1.6] text-ink-secondary">
                    {chunk.text.replace(/\s*\n\s*/g, ' ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </aside>
    </Chrome>
  )
}

/* -------------------------------------------------------- frame: timeline */

/** Proportional positions, then a minimum gap so clustered dates stay legible. */
function spreadPositions(values: number[], min: number, max: number, minGap: number): number[] {
  if (values.length === 0) return []
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const positions = values.map((value) => min + ((value - lo) / span) * (max - min))

  for (let i = 1; i < positions.length; i += 1) {
    positions[i] = Math.max(positions[i]!, positions[i - 1]! + minGap)
  }
  const overflow = positions[positions.length - 1]! - max
  if (overflow > 0) {
    for (let i = positions.length - 1; i >= 0; i -= 1) {
      positions[i] = Math.min(positions[i]!, i === positions.length - 1 ? max : positions[i + 1]! - minGap)
    }
    for (let i = 1; i < positions.length; i += 1) {
      positions[i] = Math.max(positions[i]!, positions[i - 1]! + minGap * 0.72)
    }
  }
  return positions
}

function TimelineFrame({ data }: { data: ShowcaseData }) {
  const events = data.timeline.slice(0, 9)
  const times = events.map((event) => new Date(`${event.occurredOn}T00:00:00Z`).getTime())
  // Inset far enough that the first and last labels stay inside the canvas.
  const positions = spreadPositions(times, 7.5, 92.5, 10.5)

  return (
    <Chrome
      title={data.caseRow.title}
      tab="Timeline"
      meta={`${events.length} dated events · ${data.discrepancies.length} differences`}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ----------------------------------------------------- timeline */}
        <section className="relative h-[232px] shrink-0 overflow-hidden border-b border-line bg-canvas">
          <div className="flex h-9 items-center gap-2 border-b border-line px-3.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              Timeline · every event cited to a record
            </span>
          </div>

          <div className="relative h-[calc(100%-2.25rem)]">
            <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
            {events.map((event, index) => {
              const above = index % 2 === 0
              const conflicting = event.precision === 'conflicting'
              return (
                <div
                  key={event.id}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${positions[index]}%` }}
                >
                  <span
                    className={cn(
                      'block size-2.5 rounded-full border-2 border-canvas',
                      conflicting ? 'bg-status-unresolved' : 'bg-ink',
                    )}
                  />
                  <div
                    className={cn(
                      'absolute left-1/2 w-[116px] -translate-x-1/2',
                      above ? 'bottom-4' : 'top-4',
                    )}
                  >
                    <p className="font-mono text-[10px] tabular text-ink-muted">
                      {formatDate(event.occurredOn, { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-[1.38] text-ink">{event.title}</p>
                    {conflicting ? (
                      <span className="mt-1 inline-block">
                        <PrecisionChip precision={event.precision} size="sm" />
                      </span>
                    ) : (
                      <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-muted">
                        {event.citations[0]?.sourceLabel ?? ''}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ------------------------------------------ discrepancy matrix */}
        <section className="flex min-h-0 flex-1 flex-col bg-canvas">
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line px-3.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              Discrepancy matrix · both readings preserved
            </span>
          </div>

          <div className="grid shrink-0 grid-cols-[120px_1fr_240px_240px_96px] border-b border-line bg-page px-3.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-muted">
            <span>Type</span>
            <span>Subject</span>
            <span>One record states</span>
            <span>Another record states</span>
            <span className="text-right">Materiality</span>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {data.discrepancies.map((discrepancy) => {
              const a = discrepancy.sides.find((side) => side.side === 'a') ?? discrepancy.sides[0]
              const b = discrepancy.sides.find((side) => side.side === 'b') ?? discrepancy.sides[1]
              return (
                <div
                  key={discrepancy.id}
                  className="grid grid-cols-[120px_1fr_240px_240px_96px] items-start gap-x-3 border-b border-line px-3.5 py-2.5"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-secondary">
                    {DISCREPANCY_TYPE_LABELS[discrepancy.type as DiscrepancyType]}
                  </span>
                  <span className="min-w-0 pr-4">
                    <span className="block text-[12.5px] font-medium leading-snug text-ink">
                      {discrepancy.title}
                    </span>
                    {/* No `block` here: it would override the clamp's display. */}
                    <span className="mt-1 line-clamp-2 text-[11px] leading-[1.5] text-ink-secondary">
                      {discrepancy.description}
                    </span>
                  </span>
                  {[a, b].map((side, index) => (
                    <span key={index} className="min-w-0">
                      {side ? (
                        <>
                          <span
                            className={cn(
                              'block truncate text-[13px] font-medium leading-snug tabular',
                              index === 0 ? 'text-ink' : 'text-status-contradicted',
                            )}
                          >
                            {side.statedValue || 'Not stated'}
                          </span>
                          <span className="mt-1.5 block">
                            <CiteChip label={side.sourceLabel} locator={side.locator} />
                          </span>
                        </>
                      ) : (
                        <span className="text-[12px] text-ink-muted">No second record</span>
                      )}
                    </span>
                  ))}
                  <span className="text-right font-mono text-[10px] uppercase tracking-[0.1em] text-ink-secondary">
                    {discrepancy.materiality}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </Chrome>
  )
}

/* ------------------------------------------------------------- empty state */

function NoDemoFrame() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-page px-16">
      <div className="max-w-[560px] rounded-panel border border-dashed border-line-strong bg-canvas px-9 py-10">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">No demonstration case</p>
        <h2 className="mt-2.5 text-[22px] font-medium leading-tight tracking-[-0.02em] text-ink">
          Seed the database before capturing.
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-secondary">
          These frames read the seeded Northstar County case out of the database so screenshots show genuine
          analysis rather than mock props.
        </p>
        <code className="mt-5 block rounded-control border border-line bg-page px-3 py-2 font-mono text-[12px] text-ink">
          npx tsx --tsconfig tsconfig.scripts.json scripts/seed.ts
        </code>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- page */

export default async function ShowcasePage({
  searchParams,
}: {
  searchParams: Promise<{ frame?: string; size?: string }>
}) {
  if (process.env.NODE_ENV === 'production' && !process.env.SHOWCASE_ENABLED) notFound()

  const params = await searchParams
  const data = await loadShowcase()

  // Figures the discrepancies turn on, highlighted wherever they appear in an
  // excerpt — taken from the case's own recorded values, never hard-coded.
  // Only quantitative differences contribute, so a year inside a date can never
  // be mistaken for a disputed figure.
  const terms = Array.from(
    new Set(
      (data?.discrepancies ?? [])
        .filter((discrepancy) => discrepancy.type === 'count' || discrepancy.type === 'amount')
        .flatMap((discrepancy) => discrepancy.sides.map((side) => side.statedValue))
        .flatMap((value) => value.match(/\d[\d,]*/g) ?? []),
    ),
  ).filter((term) => term.length >= 2 && !/^(19|20)\d{2}$/.test(term))

  const frames: ShowcaseFrame[] = [
    {
      id: 'hero',
      title: 'Landing hero',
      blurb:
        'The real landing hero, rendered from the same component as the live site: editorial headline, both calls to action, and the interactive workspace preview with its citations.',
      instructions: [
        'Let the preview settle for ~3s so a citation is highlighted before capturing',
        'Use a 1200 × 675 viewport and stop at the fold',
        'Capture at 2x device pixel ratio for a retina-quality image',
      ],
      content: <HeroFrame />,
    },
    {
      id: 'workspace',
      title: 'Case workspace — a source-backed claim',
      blurb:
        'Records, the claim ledger and the selected claim with the excerpts that contradict it. Every statement, status and citation is read from the seeded case.',
      instructions: [
        'Wait for fonts to settle before capturing — the ledger uses tabular numerals',
        'The selected claim is the highest-materiality contradicted claim in the case',
        'Highlighted figures are the values the recorded discrepancies turn on',
      ],
      content: data ? <WorkspaceFrame data={data} terms={terms} /> : <NoDemoFrame />,
    },
    {
      id: 'graph',
      title: 'Evidence graph with record detail',
      blurb:
        'Parties, records and claims with the real supporting and contradicting edges between them, alongside the indexed excerpts of the most-cited record.',
      instructions: [
        'Edges are drawn from stored evidence rows, not from a layout heuristic',
        'The dashed red edge is the contradicting citation — keep it in frame',
        'The highlighted record in the panel is the one with the most citations',
      ],
      content: data ? <GraphFrame data={data} /> : <NoDemoFrame />,
    },
    {
      id: 'timeline',
      title: 'Timeline and discrepancy matrix',
      blurb:
        'Nine dated events cited to their records, over the four points where the records state different values for the same subject.',
      instructions: [
        'Events keep proportional spacing with a minimum gap so clustered dates stay legible',
        'Orange markers are events the records date differently',
        'Both readings of each discrepancy are shown side by side, never reconciled',
      ],
      content: data ? <TimelineFrame data={data} /> : <NoDemoFrame />,
    },
  ]

  const solo = frames.find((frame) => frame.id === params.frame)
  if (solo) {
    const { width, height } = FRAME_SIZES[parseFrameSize(params.size)]
    return (
      <div className="min-h-dvh bg-page">
        <div style={{ width, height }} className="overflow-hidden">
          {solo.content}
        </div>
      </div>
    )
  }

  return <ShowcaseShell frames={frames} origin={appUrl} />
}
