import {
  FileSpreadsheet,
  FileText,
  Globe,
  Image as ImageIcon,
  NotebookPen,
  Table2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Static product panels used across the marketing pages.
 *
 * Every panel is built from the same visual primitives as the application and
 * shows real workflow content — a source library mid-ingest, a claim ledger, an
 * evidence graph, a discrepancy comparison — rather than an illustration of one.
 */

/* ------------------------------------------------- start from anywhere */

const INPUTS = [
  { icon: FileText, label: 'Procurement Request.pdf', meta: '3 pages', state: 'complete' as const },
  { icon: FileText, label: 'Vendor Proposal.pdf', meta: '5 pages', state: 'complete' as const },
  { icon: FileSpreadsheet, label: 'Invoice Register.xlsx', meta: 'Sheet “Invoices”', state: 'indexing' as const },
  { icon: Globe, label: 'County procurement page', meta: 'Public webpage', state: 'extracting' as const },
  { icon: ImageIcon, label: 'Signed receipt.png', meta: 'Vision extraction', state: 'queued' as const },
  { icon: NotebookPen, label: 'Interview notes', meta: 'Typed note', state: 'complete' as const },
]

const STATE_LABEL = {
  complete: 'Indexed',
  indexing: 'Indexing',
  extracting: 'Extracting',
  queued: 'Queued',
} as const

export function SourceIntakePanel() {
  return (
    <div className="overflow-hidden rounded-preview border border-line bg-canvas shadow-preview">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="text-[12px] font-medium text-ink">Source library</span>
        <span className="text-[11px] text-ink-muted">
          <span className="tabular">6</span> records
        </span>
      </div>
      <ul className="divide-y divide-line">
        {INPUTS.map((input) => {
          const Icon = input.icon
          const done = input.state === 'complete'
          return (
            <li key={input.label} className="flex items-center gap-3 px-4 py-2.5">
              <Icon className={cn('h-4 w-4 shrink-0', done ? 'text-ink-muted' : 'text-evidence')} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] text-ink">{input.label}</p>
                <p className="text-[11px] text-ink-muted">{input.meta}</p>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                  done ? 'border-line bg-surface text-ink-secondary' : 'border-evidence-border bg-evidence-soft text-evidence-deep',
                )}
              >
                {STATE_LABEL[input.state]}
              </span>
            </li>
          )
        })}
      </ul>
      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center justify-between text-[11px] text-ink-muted">
          <span>Preserving page, sheet and row locations</span>
          <span className="tabular">68%</span>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface">
          <div className="h-full w-[68%] rounded-full bg-evidence" />
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------- claim ledger */

const LEDGER = [
  { statement: 'The vendor proposal commits to delivery on September 10, 2024.', status: 'Supported', symbol: '=', tone: 'supported', plus: 1, minus: 0 },
  { statement: 'The quantity invoiced matches the quantity recorded as received.', status: 'Contradicted', symbol: '≠', tone: 'contradicted', plus: 0, minus: 2 },
  { statement: 'A revised delivery date was communicated to the committee.', status: 'Partial', symbol: '≈', tone: 'partial', plus: 1, minus: 1 },
  { statement: 'The 12 back-ordered units were subsequently delivered.', status: 'Unresolved', symbol: '?', tone: 'unresolved', plus: 0, minus: 0 },
] as const

const TONE_CLASS: Record<string, string> = {
  supported: 'border-status-supported/30 bg-status-supported-soft text-status-supported',
  contradicted: 'border-status-contradicted/30 bg-status-contradicted-soft text-status-contradicted',
  partial: 'border-status-partial/30 bg-status-partial-soft text-status-partial',
  unresolved: 'border-signal-border bg-signal-soft text-signal',
}

export function ClaimLedgerPanel() {
  return (
    <div className="overflow-hidden rounded-preview border border-line bg-canvas">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="text-[12px] font-medium text-ink">Claim ledger</span>
        <span className="text-[11px] text-ink-muted">Sorted by materiality</span>
      </div>
      <table className="w-full">
        <caption className="sr-only">Claims with status and citation counts</caption>
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="px-4 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted">
              Claim
            </th>
            <th scope="col" className="px-2 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted">
              Status
            </th>
            <th scope="col" className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted">
              Cites
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {LEDGER.map((row) => (
            <tr key={row.statement}>
              <td className="px-4 py-2.5 text-[12.5px] leading-snug text-ink">{row.statement}</td>
              <td className="px-2 py-2.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                    TONE_CLASS[row.tone],
                  )}
                >
                  <span className="font-mono">{row.symbol}</span>
                  {row.status}
                </span>
              </td>
              <td className="tabular whitespace-nowrap px-4 py-2.5 text-right font-mono text-[11px]">
                <span className="text-status-supported">+{row.plus}</span>{' '}
                <span className={row.minus > 0 ? 'text-status-contradicted' : 'text-ink-muted'}>−{row.minus}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* -------------------------------------------------------- evidence graph */

export function EvidenceGraphPanel({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-preview border border-line bg-canvas', className)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="text-[12px] font-medium text-ink">Evidence graph</span>
        <span className="flex items-center gap-3 text-[10.5px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-4 bg-evidence" /> supports
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-4 border-t border-dashed border-status-contradicted" /> contradicts
          </span>
        </span>
      </div>
      <div className="bg-page/30 p-4">
        <svg viewBox="0 0 420 220" className="h-[220px] w-full" role="img" aria-label="Entities, records and claims connected by supporting and contradicting relationships">
          <path d="M120 60 C 170 60, 190 44, 236 44" fill="none" stroke="#3F76C5" strokeWidth="1.3" opacity="0.8" />
          <path d="M120 66 C 170 66, 190 104, 236 108" fill="none" stroke="#3F76C5" strokeWidth="1.3" opacity="0.8" />
          <path d="M120 72 C 176 72, 200 168, 236 172" fill="none" stroke="#B4544C" strokeWidth="1.4" strokeDasharray="5 4" opacity="0.85" />
          <path d="M60 96 L 60 132" stroke="#C9C9C2" strokeWidth="1.1" strokeDasharray="2 4" />
          <path d="M120 148 C 168 148, 196 172, 236 176" fill="none" stroke="#C9C9C2" strokeWidth="1.1" strokeDasharray="2 4" />

          <GNode x={8} y={52} w={112} title="Halvorsen Office" sub="Organization" accent="#3F76C5" />
          <GNode x={8} y={132} w={112} title="R. Castellanos" sub="Person" accent="#3F76C5" />
          <GNode x={236} y={30} w={176} title="Vendor Proposal · p. 4" sub="Document" accent="#111111" />
          <GNode x={236} y={94} w={176} title="Meeting Minutes · p. 14" sub="Document" accent="#111111" />
          <GNode x={236} y={158} w={176} title="Delivery Report · p. 2" sub="Document" accent="#B4544C" />
        </svg>
      </div>
    </div>
  )
}

function GNode({ x, y, w, title, sub, accent }: { x: number; y: number; w: number; title: string; sub: string; accent: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={30} rx={6} fill="#FFFFFF" stroke="#DFDFD9" />
      <rect x={x} y={y} width={2.5} height={30} rx={1.25} fill={accent} />
      <text x={x + 10} y={y + 13} fontSize="9.5" fill="#111111" fontFamily="var(--font-geist-sans), system-ui">
        {title}
      </text>
      <text x={x + 10} y={y + 23} fontSize="7.5" fill="#92928C" fontFamily="var(--font-geist-sans), system-ui">
        {sub}
      </text>
    </g>
  )
}

/* ------------------------------------------------ discrepancy comparison */

export function DiscrepancyPanel() {
  return (
    <div className="overflow-hidden rounded-preview border border-line bg-canvas">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
          <span className="text-[13px] font-medium text-ink">Delivery date differs between records</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10.5px] text-ink-secondary">Date</span>
          <span className="rounded-full border border-signal-border bg-signal-soft px-2 py-0.5 text-[10.5px] font-medium text-signal">
            Needs follow-up
          </span>
        </div>
      </div>

      <p className="px-4 py-3 text-[13px] leading-relaxed text-ink-secondary">
        These records appear inconsistent regarding the reported delivery date. No record in this case documents an agreed
        change to the contract schedule.
      </p>

      <div className="grid border-t border-line sm:grid-cols-2">
        <ComparisonSide
          label="S2"
          locator="p. 4"
          source="Vendor Proposal.pdf"
          value="September 10, 2024"
          excerpt="Halvorsen Office Systems commits to delivery of all 240 units on September 10, 2024."
        />
        <ComparisonSide
          className="border-t border-line sm:border-l sm:border-t-0"
          label="S4"
          locator="p. 14"
          source="Meeting Minutes.pdf"
          value="September 18, 2024"
          excerpt="The Facilities Manager stated that delivery of the 240 workstations is scheduled for September 18, 2024."
          tone="conflict"
        />
      </div>
    </div>
  )
}

function ComparisonSide({
  label,
  locator,
  source,
  value,
  excerpt,
  className,
  tone,
}: {
  label: string
  locator: string
  source: string
  value: string
  excerpt: string
  className?: string
  tone?: 'conflict'
}) {
  return (
    <div className={cn('p-4', className)}>
      <div className="flex items-center gap-2">
        <span className="rounded-[4px] bg-evidence-soft px-1.5 py-0.5 font-mono text-[10px] text-evidence-deep">
          {label} {locator}
        </span>
        <span className="truncate text-[11.5px] text-ink-secondary">{source}</span>
      </div>
      <p className="mt-2.5 text-[10px] uppercase tracking-[0.12em] text-ink-muted">Stated value</p>
      <p className="tabular mt-0.5 text-[15px] font-medium text-ink">{value}</p>
      <p className="mt-3 text-[12px] leading-relaxed text-ink/80">
        <mark className="excerpt-mark" data-tone={tone === 'conflict' ? 'conflict' : undefined}>
          {excerpt}
        </mark>
      </p>
    </div>
  )
}

/* --------------------------------------------------------- timeline */

const TIMELINE = [
  { date: 'Jun 14, 2024', title: 'Purchase request submitted', cite: 'S1 p. 1', precision: 'Exact' },
  { date: 'Aug 2, 2024', title: 'Notice of award issued', cite: 'S3 p. 1', precision: 'Exact' },
  { date: 'Sep 10, 2024', title: 'Delivery date committed in proposal', cite: 'S2 p. 4', precision: 'Conflicting' },
  { date: 'Sep 18, 2024', title: 'Delivery date stated to committee', cite: 'S4 p. 14', precision: 'Conflicting' },
  { date: 'Sep 21, 2024', title: 'Delivery received — 228 of 240 units', cite: 'S6 p. 1', precision: 'Exact' },
]

export function TimelinePanel({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-preview border border-line bg-canvas', className)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="text-[12px] font-medium text-ink">Verified timeline</span>
        <span className="text-[11px] text-ink-muted">Chronological</span>
      </div>
      <ol className="relative px-4 py-4">
        <span aria-hidden className="absolute left-[27px] top-6 bottom-6 w-px bg-line" />
        {TIMELINE.map((event) => {
          const conflicting = event.precision === 'Conflicting'
          return (
            <li key={event.date + event.title} className="relative flex gap-3.5 py-2">
              <span
                className={cn(
                  'relative z-10 mt-1.5 h-2 w-2 shrink-0 rounded-full ring-4 ring-canvas',
                  conflicting ? 'bg-signal' : 'bg-evidence',
                )}
              />
              <div className="min-w-0">
                <p className="tabular text-[11px] text-ink-muted">{event.date}</p>
                <p className="text-[12.5px] leading-snug text-ink">{event.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-[4px] bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-secondary">
                    {event.cite}
                  </span>
                  {conflicting && (
                    <span className="rounded-full border border-signal-border bg-signal-soft px-1.5 py-0.5 text-[10px] font-medium text-signal">
                      ⚠ Sources differ
                    </span>
                  )}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/* ---------------------------------------------------------- copilot */

export function CopilotPanel({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-preview border border-line bg-canvas', className)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="text-[12px] font-medium text-ink">Case copilot</span>
        <span className="text-[11px] text-ink-muted">Answers only from this case</span>
      </div>
      <div className="space-y-3 p-4">
        <p className="ml-auto w-fit max-w-[85%] rounded-panel rounded-br-[4px] bg-surface px-3 py-2 text-[12.5px] text-ink">
          Which records disagree about the delivery date?
        </p>
        <div className="max-w-[95%] space-y-2 text-[12.5px] leading-relaxed text-ink/90">
          <p className="font-medium text-ink">The available sources conflict on this point.</p>
          <p>
            The vendor proposal commits to delivery of all 240 units on September 10, 2024{' '}
            <CiteChip>S2 p. 4</CiteChip>.
          </p>
          <p>
            The committee minutes record delivery as scheduled for September 18, 2024, and record that no formal amendment
            was approved <CiteChip>S4 p. 14</CiteChip>.
          </p>
          <p>
            The receiving report records the delivery arriving on September 21, 2024 <CiteChip>S6 p. 1</CiteChip>.
          </p>
        </div>
        <p className="border-t border-line pt-3 text-[11px] text-ink-muted">
          3 citations verified against the retrieved excerpts. Unverifiable citations are removed before an answer is shown.
        </p>
      </div>
    </div>
  )
}

function CiteChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-[4px] border border-evidence-border bg-evidence-soft px-1 py-px align-baseline font-mono text-[10.5px] text-evidence-deep">
      {children}
    </span>
  )
}

/* --------------------------------------------------------- brief */

export function BriefPanel({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-preview border border-line bg-canvas', className)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="text-[12px] font-medium text-ink">Investigation brief</span>
        <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] text-ink-secondary">Draft</span>
      </div>
      <div className="p-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">Key findings</p>
        <ul className="mt-2.5 space-y-2 text-[12.5px] leading-relaxed text-ink/90">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink/40" />
            <span>
              The receiving report records 228 units received, with 12 units back-ordered <CiteChip>S6 p. 2</CiteChip>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink/40" />
            <span>
              The invoice register records 240 units invoiced{' '}
              <CiteChip>S5 Sheet “Invoices,” row 221</CiteChip>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink/40" />
            <span>
              The award was made on August 2, 2024 in the amount of $178,080 <CiteChip>S3 p. 1</CiteChip>
            </span>
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3.5">
          <span className="rounded-control border border-line bg-surface px-2.5 py-1 text-[11px] text-ink-secondary">
            Export Markdown
          </span>
          <span className="rounded-control border border-line bg-surface px-2.5 py-1 text-[11px] text-ink-secondary">
            Export PDF
          </span>
          <span className="rounded-control border border-evidence-border bg-evidence-soft px-2.5 py-1 text-[11px] text-evidence-deep">
            Publish evidence room
          </span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------ small table */

export function SpreadsheetPanel({ className }: { className?: string }) {
  const rows = [
    ['219', 'INV-4469', 'Meridian Facilities', '30', '$21,900.00'],
    ['220', 'INV-4470', 'Northstar Print', '48', '$3,264.00'],
    ['221', 'INV-4471', 'Halvorsen Office Systems', '240', '$178,080.00'],
    ['222', 'INV-4472', 'Halvorsen Office Systems', '1', '$0.00'],
  ]
  return (
    <div className={cn('overflow-hidden rounded-preview border border-line bg-canvas', className)}>
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <Table2 className="h-3.5 w-3.5 text-ink-muted" />
        <span className="text-[12px] font-medium text-ink">Invoice Register.xlsx</span>
        <span className="ml-auto rounded-[4px] bg-evidence-soft px-1.5 py-0.5 font-mono text-[10px] text-evidence-deep">
          Sheet “Invoices”
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px]">
          <caption className="sr-only">Invoice register rows with row 221 cited</caption>
          <thead>
            <tr className="border-b border-line text-left">
              {['Row', 'Invoice', 'Vendor', 'Qty', 'Amount'].map((header) => (
                <th key={header} scope="col" className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-ink-muted">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => {
              const cited = row[0] === '221'
              return (
                <tr key={row[0]} className={cited ? 'bg-evidence-soft/60' : undefined}>
                  {row.map((cell, i) => (
                    <td
                      key={i}
                      className={cn(
                        'px-3 py-1.5 text-[11.5px] text-ink',
                        (i === 0 || i === 3 || i === 4) && 'tabular font-mono text-[11px]',
                        cited && i === 0 && 'font-semibold text-evidence-deep',
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
