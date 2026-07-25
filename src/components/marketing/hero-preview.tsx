'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, FileSpreadsheet, FileText, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The hero product preview.
 *
 * A working miniature of the case workspace built on the same fictional records
 * as the in-product demo: selecting a citation moves the document highlight and
 * the page marker, selecting a source opens that record, and hovering a graph
 * edge names the relationship. It advances on its own for one pass so the
 * workflow reads without interaction, then hands control to the visitor the
 * moment they touch it. With `prefers-reduced-motion` it never advances.
 */

type Role = 'supporting' | 'contradicting'

interface PreviewSource {
  id: string
  label: string
  title: string
  kind: 'pdf' | 'xlsx'
  pages: { page: number; heading: string; paragraphs: string[] }[]
}

const SOURCES: PreviewSource[] = [
  {
    id: 'proposal',
    label: 'S2',
    title: 'Vendor Proposal.pdf',
    kind: 'pdf',
    pages: [
      {
        page: 4,
        heading: 'Delivery schedule',
        paragraphs: [
          'Halvorsen Office Systems commits to delivery of all 240 units on September 10, 2024 to the receiving dock at 14 Ridgeway Avenue.',
          'Installation will be carried out between September 11 and September 17, 2024, in floor order beginning with floor 2.',
          'The delivery date stated above assumes purchase order issuance no later than August 9, 2024.',
        ],
      },
    ],
  },
  {
    id: 'minutes',
    label: 'S4',
    title: 'Meeting Minutes.pdf',
    kind: 'pdf',
    pages: [
      {
        page: 14,
        heading: 'Item 6 — Building C furniture replacement',
        paragraphs: [
          'The Facilities Manager stated that delivery of the 240 workstations is scheduled for September 18, 2024, with installation to follow beginning the week of September 23.',
          'The Committee noted the update. No formal amendment to the contract delivery schedule was tabled or approved at this meeting.',
        ],
      },
    ],
  },
  {
    id: 'delivery',
    label: 'S6',
    title: 'Delivery Report.pdf',
    kind: 'pdf',
    pages: [
      {
        page: 1,
        heading: 'Receiving report DR-2024-0912',
        paragraphs: [
          'The delivery arrived on September 21, 2024 and was checked against the purchase order at the dock.',
          'Carrier: Halvorsen Office Systems, own fleet. Received by J. Marsh, Receiving Clerk.',
        ],
      },
      {
        page: 2,
        heading: 'Quantity received',
        paragraphs: [
          'Expected quantity: 240 units. Quantity received: 228 units. Quantity back-ordered: 12 units.',
          'Twelve units were not present on the delivery vehicle. No date for the outstanding units was provided at the time of delivery.',
        ],
      },
    ],
  },
  {
    id: 'invoices',
    label: 'S5',
    title: 'Invoice Register.xlsx',
    kind: 'xlsx',
    pages: [
      {
        page: 221,
        heading: 'Sheet “Invoices” — row 221',
        paragraphs: [
          'Invoice No.: INV-4471; Vendor: Halvorsen Office Systems; Invoice Date: 2024-09-22; Quantity: 240; Amount: $178,080.00; Status: Approved for payment.',
        ],
      },
    ],
  },
]

interface PreviewCitation {
  id: string
  sourceId: string
  page: number
  locator: string
  role: Role
  /** The exact sentence in the page that the citation resolves to. */
  sentence: string
  confidence: number
}

const CITATIONS: PreviewCitation[] = [
  {
    id: 'cit-1',
    sourceId: 'proposal',
    page: 4,
    locator: 'p. 4',
    role: 'supporting',
    sentence:
      'Halvorsen Office Systems commits to delivery of all 240 units on September 10, 2024 to the receiving dock at 14 Ridgeway Avenue.',
    confidence: 0.96,
  },
  {
    id: 'cit-2',
    sourceId: 'minutes',
    page: 14,
    locator: 'p. 14',
    role: 'supporting',
    sentence:
      'The Facilities Manager stated that delivery of the 240 workstations is scheduled for September 18, 2024, with installation to follow beginning the week of September 23.',
    confidence: 0.94,
  },
  {
    id: 'cit-3',
    sourceId: 'delivery',
    page: 1,
    locator: 'p. 1',
    role: 'supporting',
    sentence: 'The delivery arrived on September 21, 2024 and was checked against the purchase order at the dock.',
    confidence: 0.95,
  },
  {
    id: 'cit-4',
    sourceId: 'delivery',
    page: 2,
    locator: 'p. 2',
    role: 'contradicting',
    sentence: 'Expected quantity: 240 units. Quantity received: 228 units. Quantity back-ordered: 12 units.',
    confidence: 0.95,
  },
]

const CLAIM = {
  statement: 'All 240 workstations were delivered to Building C in September 2024.',
  status: 'Partially supported',
  summary: 'The September delivery is evidenced; the quantity is not.',
}

const CYCLE_MS = 2600

export function HeroPreview() {
  const [activeId, setActiveId] = useState(CITATIONS[0]!.id)
  const [interacted, setInteracted] = useState(false)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const active = useMemo(() => CITATIONS.find((c) => c.id === activeId)!, [activeId])
  const activeSource = useMemo(() => SOURCES.find((s) => s.id === active.sourceId)!, [active])
  const activePage = useMemo(
    () => activeSource.pages.find((p) => p.page === active.page) ?? activeSource.pages[0]!,
    [activeSource, active.page],
  )

  const stop = useCallback(() => {
    setInteracted(true)
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
  }, [])

  useEffect(() => {
    if (interacted) return
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    timer.current = setInterval(() => {
      setActiveId((current) => {
        const index = CITATIONS.findIndex((c) => c.id === current)
        return CITATIONS[(index + 1) % CITATIONS.length]!.id
      })
    }, CYCLE_MS)

    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [interacted])

  const select = (id: string) => {
    stop()
    setActiveId(id)
  }

  const selectSource = (sourceId: string) => {
    stop()
    const citation = CITATIONS.find((c) => c.sourceId === sourceId)
    if (citation) setActiveId(citation.id)
  }

  const supporting = CITATIONS.filter((c) => c.role === 'supporting')
  const conflicting = CITATIONS.filter((c) => c.role === 'contradicting')

  return (
    <div className="relative" onPointerDown={stop}>
      {/*
        Floating contextual chips. They sit fully outside the preview frame —
        translated past its edge rather than overlaid — so they read as
        annotations on the workflow and never cover the content they describe.
        Hidden below xl, where there is no margin to place them in.
      */}
      <FloatingChip
        className="left-0 top-20 hidden -translate-x-[calc(100%+18px)] xl:flex"
        tone="evidence"
      >
        <span className="tabular font-mono text-[11px]">{supporting.length}</span> supporting sources
      </FloatingChip>
      <FloatingChip
        className="right-0 top-[34%] hidden translate-x-[calc(100%+18px)] xl:flex"
        tone="signal"
      >
        <span className="tabular font-mono text-[11px]">{conflicting.length}</span> conflicting record
      </FloatingChip>
      <FloatingChip
        className="bottom-24 left-0 hidden -translate-x-[calc(100%+18px)] 2xl:flex"
        tone="neutral"
      >
        Extraction confidence{' '}
        <span className="tabular font-mono text-[11px]">{Math.round(active.confidence * 100)}%</span>
      </FloatingChip>
      <FloatingChip
        className="bottom-16 right-0 hidden translate-x-[calc(100%+18px)] 2xl:flex"
        tone="neutral"
      >
        {activeSource.kind === 'xlsx' ? `Row ${active.page}` : `Page ${active.page}`}
      </FloatingChip>

      <div className="overflow-hidden rounded-preview border border-line bg-canvas shadow-preview">
        {/* Workspace toolbar */}
        <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="truncate text-[12.5px] font-medium text-ink">
              Northstar County Equipment Procurement Review
            </span>
            <span className="hidden shrink-0 rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink-muted sm:inline">
              Fictional demo
            </span>
          </div>
          <div className="hidden items-center gap-1 text-[11.5px] text-ink-muted sm:flex">
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Search the case</span>
            <kbd className="ml-1 rounded-[4px] border border-line bg-surface px-1 py-0.5 font-mono text-[10px]">⌘K</kbd>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[168px_minmax(0,1fr)] xl:grid-cols-[176px_minmax(0,1fr)_248px]">
          {/* Source rail */}
          <div className="border-b border-line bg-page/40 md:border-b-0 md:border-r">
            <div className="px-3 pb-2 pt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              Sources
            </div>
            <ul className="flex gap-1.5 overflow-x-auto px-2 pb-3 md:block md:space-y-0.5 md:overflow-visible md:px-1.5">
              {SOURCES.map((source) => {
                const isActive = source.id === activeSource.id
                return (
                  <li key={source.id} className="shrink-0 md:shrink">
                    <button
                      type="button"
                      onClick={() => selectSource(source.id)}
                      aria-pressed={isActive}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left transition-colors duration-200 ease-editorial',
                        isActive ? 'bg-evidence-soft' : 'hover:bg-surface',
                      )}
                    >
                      {source.kind === 'xlsx' ? (
                        <FileSpreadsheet className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-evidence' : 'text-ink-muted')} />
                      ) : (
                        <FileText className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-evidence' : 'text-ink-muted')} />
                      )}
                      <span className="min-w-0">
                        <span className={cn('block font-mono text-[10px]', isActive ? 'text-evidence' : 'text-ink-muted')}>
                          {source.label}
                        </span>
                        <span className="block truncate text-[11.5px] leading-tight text-ink">{source.title}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Document surface */}
          <div className="relative min-w-0 bg-canvas">
            <div className="flex items-center justify-between border-b border-line px-4 py-2">
              <span className="truncate text-[11.5px] text-ink-secondary">{activeSource.title}</span>
              <span className="shrink-0 rounded-full border border-evidence-border bg-evidence-soft px-2 py-0.5 font-mono text-[10px] text-evidence-deep">
                {activeSource.kind === 'xlsx' ? `Row ${active.page}` : `Page ${active.page}`}
              </span>
            </div>

            <div className="px-4 py-4 sm:px-6 sm:py-5">
              <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                {activePage.heading}
              </p>
              <div className="space-y-2.5 text-[12.5px] leading-[1.75] text-ink/90">
                {activePage.paragraphs.map((paragraph) => {
                  const isCited = paragraph === active.sentence
                  return (
                    <p key={paragraph}>
                      {isCited ? (
                        <mark
                          className="excerpt-mark"
                          data-active="true"
                          data-tone={active.role === 'contradicting' ? 'conflict' : undefined}
                        >
                          {paragraph}
                        </mark>
                      ) : (
                        paragraph
                      )}
                    </p>
                  )
                })}
              </div>
            </div>

            <EvidenceGraphStrip hovered={hoveredEdge} onHover={setHoveredEdge} activeRole={active.role} />
          </div>

          {/* Claim detail */}
          <div className="border-t border-line bg-page/40 xl:border-l xl:border-t-0">
            <div className="px-4 pb-2 pt-3.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              Selected claim
            </div>
            <div className="px-4 pb-4">
              <p className="text-[12.5px] leading-snug text-ink">{CLAIM.statement}</p>

              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-status-partial/25 bg-status-partial-soft px-2 py-0.5">
                <span className="font-mono text-[10px] text-status-partial">≈</span>
                <span className="text-[10.5px] font-medium text-status-partial">{CLAIM.status}</span>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-ink-secondary">{CLAIM.summary}</p>

              <div className="mt-4 space-y-3">
                <CitationGroup
                  label="Supporting"
                  symbol="+"
                  tone="supported"
                  citations={supporting}
                  activeId={activeId}
                  onSelect={select}
                />
                <CitationGroup
                  label="Conflicting"
                  symbol="−"
                  tone="contradicted"
                  citations={conflicting}
                  activeId={activeId}
                  onSelect={select}
                />
              </div>

              <Link
                href="/demo"
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-control border border-line-strong bg-canvas px-3 py-1.5 text-[11.5px] font-medium text-ink transition-colors duration-200 hover:bg-surface"
              >
                Inspect evidence
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Showing {activeSource.title}, {active.locator}. Citation is {active.role === 'supporting' ? 'supporting' : 'conflicting'}.
      </p>
    </div>
  )
}

function CitationGroup({
  label,
  symbol,
  tone,
  citations,
  activeId,
  onSelect,
}: {
  label: string
  symbol: string
  tone: 'supported' | 'contradicted'
  citations: PreviewCitation[]
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted">
        <span className={cn('font-mono', tone === 'supported' ? 'text-status-supported' : 'text-status-contradicted')}>
          {symbol}
        </span>
        {label}
        <span className="tabular">({citations.length})</span>
      </p>
      <ul className="space-y-1">
        {citations.map((citation) => {
          const source = SOURCES.find((s) => s.id === citation.sourceId)!
          const isActive = citation.id === activeId
          return (
            <li key={citation.id}>
              <button
                type="button"
                onClick={() => onSelect(citation.id)}
                aria-pressed={isActive}
                className={cn(
                  'flex w-full items-center gap-1.5 rounded-[6px] border px-1.5 py-1 text-left transition-all duration-200 ease-editorial',
                  isActive
                    ? 'border-evidence-border bg-evidence-soft'
                    : 'border-transparent hover:border-line hover:bg-canvas',
                )}
              >
                <span className={cn('font-mono text-[10px]', isActive ? 'text-evidence-deep' : 'text-ink-muted')}>
                  {source.label} {citation.locator}
                </span>
                <span className="min-w-0 flex-1 truncate text-[10.5px] text-ink-secondary">{source.title}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Compact evidence graph: the claim, the records it rests on, and one conflict. */
function EvidenceGraphStrip({
  hovered,
  onHover,
  activeRole,
}: {
  hovered: string | null
  onHover: (id: string | null) => void
  activeRole: Role
}) {
  const edges = [
    { id: 'e1', d: 'M96 44 C 150 44, 168 22, 214 22', label: 'supports', tone: 'supporting' as const },
    { id: 'e2', d: 'M96 48 C 152 48, 170 62, 214 62', label: 'supports', tone: 'supporting' as const },
    { id: 'e3', d: 'M96 52 C 158 52, 190 96, 214 100', label: 'contradicts', tone: 'contradicting' as const },
  ]

  return (
    <div className="border-t border-line bg-page/30 px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">Evidence graph</span>
        <span className="text-[10px] text-ink-muted">
          {hovered ? edges.find((e) => e.id === hovered)?.label : 'Hover a connection'}
        </span>
      </div>
      <svg viewBox="0 0 330 124" className="h-[104px] w-full" role="img" aria-label="Claim connected to three records: two supporting, one conflicting">
        <g>
          {edges.map((edge) => (
            <path
              key={edge.id}
              d={edge.d}
              fill="none"
              stroke={edge.tone === 'contradicting' ? '#B4544C' : '#3F76C5'}
              strokeWidth={hovered === edge.id ? 2 : 1.3}
              strokeDasharray={edge.tone === 'contradicting' ? '4 3' : undefined}
              opacity={hovered && hovered !== edge.id ? 0.3 : 0.85}
              className="transition-all duration-200 ease-editorial"
              onMouseEnter={() => onHover(edge.id)}
              onMouseLeave={() => onHover(null)}
              pointerEvents="stroke"
              strokeLinecap="round"
            />
          ))}
        </g>

        <GraphNode x={4} y={34} width={92} label="Claim" title="240 delivered" tone={activeRole === 'contradicting' ? 'warn' : 'claim'} />
        <GraphNode x={214} y={8} width={112} label="S2 · p. 4" title="Vendor Proposal" tone="source" />
        <GraphNode x={214} y={48} width={112} label="S4 · p. 14" title="Meeting Minutes" tone="source" />
        <GraphNode x={214} y={88} width={112} label="S6 · p. 2" title="Delivery Report" tone="conflict" />
      </svg>
    </div>
  )
}

function GraphNode({
  x,
  y,
  width,
  label,
  title,
  tone,
}: {
  x: number
  y: number
  width: number
  label: string
  title: string
  tone: 'claim' | 'source' | 'conflict' | 'warn'
}) {
  const stroke = tone === 'conflict' ? '#E3BDB8' : tone === 'warn' ? '#F0C9A7' : '#DFDFD9'
  const accent = tone === 'conflict' ? '#B4544C' : tone === 'warn' ? '#E98243' : tone === 'claim' ? '#111111' : '#3F76C5'
  return (
    <g>
      <rect x={x} y={y} width={width} height={28} rx={6} fill="#FFFFFF" stroke={stroke} strokeWidth={1} />
      <rect x={x} y={y} width={2.5} height={28} rx={1.25} fill={accent} />
      <text x={x + 9} y={y + 12} fontSize="7.5" fill="#92928C" fontFamily="var(--font-geist-mono), monospace">
        {label}
      </text>
      <text x={x + 9} y={y + 22} fontSize="9" fill="#111111" fontFamily="var(--font-geist-sans), system-ui">
        {title}
      </text>
    </g>
  )
}

function FloatingChip({
  children,
  className,
  tone,
}: {
  children: React.ReactNode
  className?: string
  tone: 'evidence' | 'signal' | 'neutral'
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'absolute z-10 items-center gap-1.5 rounded-full border bg-canvas/95 px-3 py-1.5 text-[11.5px] shadow-float backdrop-blur-sm',
        tone === 'evidence' && 'border-evidence-border text-evidence-deep',
        tone === 'signal' && 'border-signal-border text-signal',
        tone === 'neutral' && 'border-line text-ink-secondary',
        className,
      )}
    >
      {children}
    </div>
  )
}
