'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * The citation showcase — the signature section of the site.
 *
 * A claim at the centre, the excerpts that bear on it around the edge, and a
 * drawn relationship between them. Selecting or focusing an excerpt opens the
 * full citation: source, exact location, verbatim passage, relationship and
 * extraction confidence. This is the product's central promise rendered as one
 * picture.
 */

interface Excerpt {
  id: string
  label: string
  source: string
  locator: string
  role: 'supporting' | 'contradicting' | 'context'
  text: string
  confidence: number
  side: 'left' | 'right'
}

const EXCERPTS: Excerpt[] = [
  {
    id: 'x1',
    label: 'S2',
    source: 'Vendor Proposal.pdf',
    locator: 'p. 4',
    role: 'supporting',
    text: 'Halvorsen Office Systems commits to delivery of all 240 units on September 10, 2024 to the receiving dock at 14 Ridgeway Avenue.',
    confidence: 0.96,
    side: 'left',
  },
  {
    id: 'x2',
    label: 'S4',
    source: 'Meeting Minutes.pdf',
    locator: 'p. 14',
    role: 'context',
    text: 'The Facilities Manager stated that delivery of the 240 workstations is scheduled for September 18, 2024. No formal amendment to the contract delivery schedule was tabled or approved at this meeting.',
    confidence: 0.94,
    side: 'left',
  },
  {
    id: 'x3',
    label: 'S6',
    source: 'Delivery Report.pdf',
    locator: 'p. 2',
    role: 'contradicting',
    text: 'Expected quantity: 240 units. Quantity received: 228 units. Quantity back-ordered: 12 units.',
    confidence: 0.95,
    side: 'right',
  },
  {
    id: 'x4',
    label: 'S5',
    source: 'Invoice Register.xlsx',
    locator: 'Sheet “Invoices,” row 221',
    role: 'supporting',
    text: 'INV-4471 · Halvorsen Office Systems · 2024-09-22 · Quantity 240 · $178,080.00 · Approved for payment.',
    confidence: 0.99,
    side: 'right',
  },
]

const ROLE_STYLE = {
  supporting: {
    label: 'Supports',
    symbol: '+',
    chip: 'border-status-supported/30 bg-status-supported-soft text-status-supported',
    line: '#3F76C5',
    dash: undefined as string | undefined,
  },
  contradicting: {
    label: 'Conflicts with',
    symbol: '−',
    chip: 'border-status-contradicted/30 bg-status-contradicted-soft text-status-contradicted',
    line: '#B4544C',
    dash: '5 4',
  },
  context: {
    label: 'Context for',
    symbol: '·',
    chip: 'border-line-strong bg-surface text-ink-secondary',
    line: '#C9C9C2',
    dash: '2 4',
  },
} as const

export function CitationStage() {
  const [activeId, setActiveId] = useState<string>('x3')
  const active = EXCERPTS.find((e) => e.id === activeId)!

  return (
    <div className="rounded-preview border border-line bg-page/60 p-4 sm:p-7 lg:p-10">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)_minmax(0,1fr)] lg:gap-5">
        <div className="space-y-3 lg:pt-6">
          {EXCERPTS.filter((e) => e.side === 'left').map((excerpt) => (
            <ExcerptCard key={excerpt.id} excerpt={excerpt} active={excerpt.id === activeId} onSelect={setActiveId} />
          ))}
        </div>

        {/* The claim at the centre */}
        <div className="relative flex items-center">
          <div className="w-full rounded-panel border border-ink/15 bg-canvas p-5 shadow-float">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-muted">Claim</p>
            <p className="mt-2.5 text-[15px] font-medium leading-snug text-ink">
              All 240 workstations were delivered to Building C in September 2024.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-status-partial/25 bg-status-partial-soft px-2.5 py-1">
                <span className="font-mono text-[11px] text-status-partial">≈</span>
                <span className="text-[11.5px] font-medium text-status-partial">Partially supported</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-signal-border bg-signal-soft px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                <span className="text-[11.5px] font-medium text-signal">Unresolved: quantity</span>
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3.5">
              <Stat label="Supporting" value="2" />
              <Stat label="Conflicting" value="1" />
              <Stat label="Context" value="1" />
            </dl>
          </div>

          {/* Relationship lines, drawn between the centre and the excerpt columns */}
          <svg
            aria-hidden
            viewBox="0 0 100 260"
            preserveAspectRatio="none"
            className="pointer-events-none absolute -left-[14%] top-0 hidden h-full w-[128%] lg:block"
          >
            <path
              d="M2 54 C 22 54, 26 118, 30 128"
              fill="none"
              stroke={lineFor('x1', activeId)}
              strokeWidth={activeId === 'x1' ? 1.6 : 1}
              opacity={activeId === 'x1' ? 0.95 : 0.35}
              className="transition-all duration-300 ease-editorial"
            />
            <path
              d="M2 200 C 22 200, 26 138, 30 132"
              fill="none"
              stroke={lineFor('x2', activeId)}
              strokeDasharray="2 4"
              strokeWidth={activeId === 'x2' ? 1.6 : 1}
              opacity={activeId === 'x2' ? 0.95 : 0.35}
              className="transition-all duration-300 ease-editorial"
            />
            <path
              d="M98 60 C 78 60, 74 122, 70 128"
              fill="none"
              stroke={lineFor('x3', activeId)}
              strokeDasharray="5 4"
              strokeWidth={activeId === 'x3' ? 1.8 : 1}
              opacity={activeId === 'x3' ? 0.95 : 0.35}
              className="transition-all duration-300 ease-editorial"
            />
            <path
              d="M98 204 C 78 204, 74 140, 70 133"
              fill="none"
              stroke={lineFor('x4', activeId)}
              strokeWidth={activeId === 'x4' ? 1.6 : 1}
              opacity={activeId === 'x4' ? 0.95 : 0.35}
              className="transition-all duration-300 ease-editorial"
            />
          </svg>
        </div>

        <div className="space-y-3 lg:pt-6">
          {EXCERPTS.filter((e) => e.side === 'right').map((excerpt) => (
            <ExcerptCard key={excerpt.id} excerpt={excerpt} active={excerpt.id === activeId} onSelect={setActiveId} />
          ))}
        </div>
      </div>

      {/* The opened citation */}
      <div className="mt-5 rounded-panel border border-line bg-canvas p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="rounded-[5px] border border-evidence-border bg-evidence-soft px-2 py-0.5 font-mono text-[11px] text-evidence-deep">
            {active.label} {active.locator}
          </span>
          <span className="text-[13px] font-medium text-ink">{active.source}</span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
              ROLE_STYLE[active.role].chip,
            )}
          >
            <span className="font-mono">{ROLE_STYLE[active.role].symbol}</span>
            {ROLE_STYLE[active.role].label} the claim
          </span>
          <span className="ml-auto text-[11.5px] text-ink-muted">
            Extraction confidence <span className="tabular font-mono">{Math.round(active.confidence * 100)}%</span>
          </span>
        </div>
        <blockquote className="mt-3 border-l-2 border-evidence pl-4 text-[14px] leading-relaxed text-ink/90">
          “{active.text}”
        </blockquote>
        <p className="mt-3 text-[12px] text-ink-muted">
          Shown verbatim from the stored excerpt — the passage displayed is the passage that was indexed.
        </p>
      </div>
    </div>
  )
}

function lineFor(id: string, activeId: string) {
  const excerpt = EXCERPTS.find((e) => e.id === id)!
  return activeId === id ? ROLE_STYLE[excerpt.role].line : '#C9C9C2'
}

function ExcerptCard({
  excerpt,
  active,
  onSelect,
}: {
  excerpt: Excerpt
  active: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(excerpt.id)}
      onFocus={() => onSelect(excerpt.id)}
      onMouseEnter={() => onSelect(excerpt.id)}
      aria-pressed={active}
      className={cn(
        'block w-full rounded-panel border bg-canvas p-3.5 text-left transition-all duration-300 ease-editorial',
        active ? 'border-evidence-border shadow-float' : 'border-line hover:border-line-strong',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'rounded-[5px] px-1.5 py-0.5 font-mono text-[10.5px] transition-colors duration-200',
            active ? 'bg-evidence-soft text-evidence-deep' : 'bg-surface text-ink-muted',
          )}
        >
          {excerpt.label} {excerpt.locator}
        </span>
        <span className="truncate text-[11.5px] text-ink-secondary">{excerpt.source}</span>
      </div>
      <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-ink/85">
        <mark className="excerpt-mark" data-active={active} data-tone={excerpt.role === 'contradicting' ? 'conflict' : undefined}>
          {excerpt.text}
        </mark>
      </p>
    </button>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-[16px] font-medium text-ink">{value}</dd>
    </div>
  )
}
