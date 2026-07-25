import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { cn, formatBytes } from '@/lib/utils'
import type { UsageSnapshot } from '@/server/billing/limits'

export function formatUsageValue(value: number, unit: 'count' | 'bytes') {
  return unit === 'bytes' ? formatBytes(value) : value.toLocaleString('en-US')
}

/** A metric is at rest below 80%, worth noticing above it, and blocking at 100%. */
function toneFor(ratio: number) {
  if (ratio >= 1) return 'bg-status-contradicted'
  if (ratio >= 0.8) return 'bg-signal'
  return 'bg-evidence'
}

function Bar({ ratio, className }: { ratio: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block h-1 w-full overflow-hidden rounded-full bg-surface', className)}
    >
      <span
        className={cn('block h-full rounded-full transition-[width] duration-500 ease-editorial', toneFor(ratio))}
        style={{ width: `${Math.max(ratio > 0 ? 2 : 0, Math.round(ratio * 100))}%` }}
      />
    </span>
  )
}

/**
 * The dashboard's compact meter: three real numbers and a way to see the rest.
 * No projections, no trend lines — just what has been counted this period.
 */
export function UsageStrip({
  usage,
  metrics = ['active_cases', 'processed_pages', 'storage_bytes'],
  className,
}: {
  usage: UsageSnapshot[]
  metrics?: string[]
  className?: string
}) {
  const shown = metrics
    .map((metric) => usage.find((entry) => entry.metric === metric))
    .filter((entry): entry is UsageSnapshot => Boolean(entry))

  return (
    <section
      aria-label="Plan usage"
      className={cn('border-b border-line bg-canvas px-5 py-3 lg:px-8', className)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <ul className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-6">
          {shown.map((entry) => (
            <li key={entry.metric} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[11px] uppercase tracking-wide text-ink-muted">
                  {entry.label}
                </span>
                <span className="tabular shrink-0 text-[12px] text-ink-secondary">
                  {formatUsageValue(entry.used, entry.unit)} /{' '}
                  {formatUsageValue(entry.limit, entry.unit)}
                </span>
              </div>
              <Bar ratio={entry.ratio} className="mt-1.5" />
            </li>
          ))}
        </ul>

        <Link
          href="/app/usage"
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-[3px] text-[12.5px] text-ink-secondary',
            'transition-colors duration-200 ease-editorial hover:text-ink',
            'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
          )}
        >
          Usage detail
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

/** One metric, explained. Used on the dedicated usage screen. */
export function UsageMetricRow({
  entry,
  explanation,
}: {
  entry: UsageSnapshot
  explanation: string
}) {
  const atLimit = entry.limit > 0 && entry.used >= entry.limit
  return (
    <li className="border-b border-line px-5 py-5 last:border-b-0 lg:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[15px] font-medium text-ink">{entry.label}</h3>
        <p className="tabular text-sm text-ink-secondary">
          <span className="text-ink">{formatUsageValue(entry.used, entry.unit)}</span>
          {' / '}
          {entry.limit === 0 ? 'not included' : formatUsageValue(entry.limit, entry.unit)}
        </p>
      </div>

      <Bar ratio={entry.ratio} className="mt-2.5 h-1.5" />

      <p className="mt-2.5 max-w-[70ch] text-[13px] leading-relaxed text-ink-secondary">
        {explanation}
      </p>

      {atLimit ? (
        <p className="mt-2 text-[12.5px] text-status-contradicted">
          This limit has been reached. Nothing already saved is affected — new work against this
          metric is paused until the period resets or the plan changes.
        </p>
      ) : null}
    </li>
  )
}
