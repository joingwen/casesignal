'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Use-case gallery.
 *
 * Each frame is an adapted CaseSignal interface for that kind of work, built
 * from the same primitives as the product — no stock imagery. Horizontally
 * browsable with buttons, keyboard arrows and native touch scrolling.
 */

interface UseCase {
  id: string
  name: string
  summary: string
  objective: string
  claim: string
  status: 'Supported' | 'Partially supported' | 'Contradicted' | 'Unresolved'
  citations: { label: string; locator: string; source: string }[]
  metrics: { label: string; value: string }[]
}

const USE_CASES: UseCase[] = [
  {
    id: 'public-records',
    name: 'Public records investigation',
    summary: 'Turn a stack of responsive documents into a mapped, citable record set.',
    objective: 'Establish what a records release does and does not show.',
    claim: 'The released schedule omits the two dates referenced in the cover letter.',
    status: 'Partially supported',
    citations: [
      { label: 'S1', locator: 'p. 2', source: 'Response letter.pdf' },
      { label: 'S3', locator: 'p. 11', source: 'Attachment B.pdf' },
    ],
    metrics: [
      { label: 'Records', value: '34' },
      { label: 'Claims', value: '96' },
      { label: 'Open questions', value: '7' },
    ],
  },
  {
    id: 'election-admin',
    name: 'Election administration review',
    summary: 'Compare procedural records against reported administrative figures.',
    objective: 'Check documented procedure against documented outcome.',
    claim: 'The chain-of-custody log records two seals not listed on the transfer form.',
    status: 'Unresolved',
    citations: [
      { label: 'S2', locator: 'p. 6', source: 'Custody log.pdf' },
      { label: 'S5', locator: 'Sheet “Transfers,” row 48', source: 'Transfer register.xlsx' },
    ],
    metrics: [
      { label: 'Records', value: '21' },
      { label: 'Events', value: '58' },
      { label: 'Differences', value: '3' },
    ],
  },
  {
    id: 'procurement',
    name: 'Procurement analysis',
    summary: 'Trace a purchase from request through award, invoice and delivery.',
    objective: 'Reconcile what was ordered, invoiced and received.',
    claim: 'The invoiced quantity exceeds the quantity recorded as received.',
    status: 'Contradicted',
    citations: [
      { label: 'S5', locator: 'Sheet “Invoices,” row 221', source: 'Invoice register.xlsx' },
      { label: 'S6', locator: 'p. 2', source: 'Delivery report.pdf' },
    ],
    metrics: [
      { label: 'Records', value: '7' },
      { label: 'Claims', value: '11' },
      { label: 'Differences', value: '4' },
    ],
  },
  {
    id: 'journalism',
    name: 'Investigative journalism',
    summary: 'Separate what is documented from what is asserted, before you publish.',
    objective: 'Determine which statements the records actually support.',
    claim: 'The statement attributed in the transcript is not reflected in the filed document.',
    status: 'Contradicted',
    citations: [
      { label: 'S4', locator: '00:14:22', source: 'Interview transcript.txt' },
      { label: 'S7', locator: 'section “Scope”', source: 'Filed statement (webpage)' },
    ],
    metrics: [
      { label: 'Records', value: '18' },
      { label: 'Attributions', value: '42' },
      { label: 'Unverified', value: '9' },
    ],
  },
  {
    id: 'compliance',
    name: 'Corporate compliance',
    summary: 'Test whether documented actions match documented policy.',
    objective: 'Assess the approval trail against the written policy.',
    claim: 'Two approvals were recorded below the threshold stated in the policy.',
    status: 'Supported',
    citations: [
      { label: 'S1', locator: 'section “Thresholds”', source: 'Approval policy.docx' },
      { label: 'S4', locator: 'Sheet “Approvals,” rows 12–14', source: 'Approval log.xlsx' },
    ],
    metrics: [
      { label: 'Records', value: '12' },
      { label: 'Controls', value: '19' },
      { label: 'Exceptions', value: '2' },
    ],
  },
  {
    id: 'legal',
    name: 'Legal document review',
    summary: 'Build a defensible chronology across exhibits and correspondence.',
    objective: 'Fix the sequence of events across a mixed exhibit set.',
    claim: 'The notice date in Exhibit C precedes the correspondence that references it.',
    status: 'Partially supported',
    citations: [
      { label: 'S2', locator: 'p. 3', source: 'Exhibit C.pdf' },
      { label: 'S6', locator: 'p. 1', source: 'Correspondence bundle.pdf' },
    ],
    metrics: [
      { label: 'Exhibits', value: '46' },
      { label: 'Events', value: '134' },
      { label: 'Conflicts', value: '5' },
    ],
  },
]

const STATUS_TONE = {
  Supported: 'border-status-supported/30 bg-status-supported-soft text-status-supported',
  'Partially supported': 'border-status-partial/30 bg-status-partial-soft text-status-partial',
  Contradicted: 'border-status-contradicted/30 bg-status-contradicted-soft text-status-contradicted',
  Unresolved: 'border-signal-border bg-signal-soft text-signal',
} as const

const STATUS_SYMBOL = {
  Supported: '=',
  'Partially supported': '≈',
  Contradicted: '≠',
  Unresolved: '?',
} as const

export function UseCaseGallery() {
  const scroller = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const scrollTo = useCallback((next: number) => {
    const node = scroller.current
    if (!node) return
    const clamped = Math.max(0, Math.min(USE_CASES.length - 1, next))
    const card = node.children[clamped] as HTMLElement | undefined
    if (!card) return
    node.scrollTo({ left: card.offsetLeft - node.offsetLeft, behavior: 'smooth' })
    setIndex(clamped)
  }, [])

  useEffect(() => {
    const node = scroller.current
    if (!node) return
    const onScroll = () => {
      const children = Array.from(node.children) as HTMLElement[]
      const left = node.scrollLeft + node.offsetLeft
      let closest = 0
      let best = Number.POSITIVE_INFINITY
      children.forEach((child, i) => {
        const distance = Math.abs(child.offsetLeft - left)
        if (distance < best) {
          best = distance
          closest = i
        }
      })
      setIndex(closest)
    }
    node.addEventListener('scroll', onScroll, { passive: true })
    return () => node.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          scrollTo(index + 1)
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          scrollTo(index - 1)
        }
      }}
    >
      <div
        ref={scroller}
        role="group"
        aria-label="Use cases"
        tabIndex={0}
        className="scrollbar-slim -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 lg:-mx-10 lg:px-10"
      >
        {USE_CASES.map((useCase, i) => (
          <article
            key={useCase.id}
            id={useCase.id}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${USE_CASES.length}: ${useCase.name}`}
            className="w-[85vw] max-w-[520px] shrink-0 snap-start overflow-hidden rounded-preview border border-line bg-canvas sm:w-[520px]"
          >
            <div className="border-b border-line bg-page/50 px-5 py-4">
              <h3 className="text-[17px] font-semibold tracking-tight text-ink">{useCase.name}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-secondary">{useCase.summary}</p>
            </div>

            {/* An adapted CaseSignal surface for this kind of work */}
            <div className="px-5 py-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">Case objective</p>
              <p className="mt-1.5 text-[13px] text-ink">{useCase.objective}</p>

              <div className="mt-4 rounded-panel border border-line p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] leading-snug text-ink">{useCase.claim}</p>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium',
                      STATUS_TONE[useCase.status],
                    )}
                  >
                    <span className="font-mono">{STATUS_SYMBOL[useCase.status]}</span>
                    {useCase.status}
                  </span>
                </div>
                <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                  {useCase.citations.map((citation) => (
                    <li key={citation.label + citation.locator} className="flex items-center gap-2">
                      <span className="shrink-0 rounded-[4px] bg-evidence-soft px-1.5 py-0.5 font-mono text-[10px] text-evidence-deep">
                        {citation.label} {citation.locator}
                      </span>
                      <span className="truncate text-[11.5px] text-ink-secondary">{citation.source}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <dl className="mt-4 grid grid-cols-3 divide-x divide-line border-t border-line pt-3.5">
                {useCase.metrics.map((metric) => (
                  <div key={metric.label} className="px-3 first:pl-0 last:pr-0">
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">{metric.label}</dt>
                    <dd className="tabular mt-0.5 text-[17px] font-medium text-ink">{metric.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-[12.5px] text-ink-muted">
          <span className="tabular">{index + 1}</span> / <span className="tabular">{USE_CASES.length}</span> ·{' '}
          <span className="hidden sm:inline">Use arrow keys to browse</span>
          <span className="sm:hidden">Swipe to browse</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollTo(index - 1)}
            disabled={index === 0}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink transition-colors duration-200 hover:bg-surface disabled:opacity-35 disabled:hover:bg-transparent"
          >
            <span className="sr-only">Previous use case</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollTo(index + 1)}
            disabled={index === USE_CASES.length - 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink transition-colors duration-200 hover:bg-surface disabled:opacity-35 disabled:hover:bg-transparent"
          >
            <span className="sr-only">Next use case</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
