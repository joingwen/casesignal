import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@/components/ui'
import { requireSession } from '@/server/auth/session'
import { getPlanState, getUsageSnapshot } from '@/server/billing/limits'
import { currentPeriod } from '@/server/ai/ledger'
import { formatDate } from '@/lib/utils'
import type { UsageMetric } from '@/lib/domain'
import { PageHeader } from '@/components/app/page-header'
import { UsageMetricRow } from '@/components/app/usage-meter'

export const metadata: Metadata = {
  title: 'Usage',
  description: 'What has been counted against your plan this period.',
}

/** Plain-language definition of each counter, so a number is never unexplained. */
const EXPLANATIONS: Record<UsageMetric, string> = {
  active_cases:
    'Cases with status Active in this workspace. Archiving a case frees a slot; archived cases stay fully readable.',
  processed_pages:
    'Pages, sheets and text blocks extracted from records this period. A page is counted once when it is first extracted, not each time you read it.',
  ai_operations:
    'Individual analysis calls: source summaries, entity, claim and timeline extraction, discrepancy analysis, source-backed answers and brief sections. Re-running an analysis counts again.',
  storage_bytes:
    'Bytes held for uploaded files this period. Deleting a source or a case releases its storage.',
  public_shares:
    'Public evidence rooms currently enabled. Revoking a share frees its slot immediately and the link stops resolving.',
}

/** The counting period is a calendar month in UTC; it resets on the first. */
function periodReset() {
  const [year, month] = currentPeriod().split('-').map(Number)
  return new Date(Date.UTC(year ?? new Date().getUTCFullYear(), month ?? 1, 1))
}

export default async function UsagePage() {
  const session = await requireSession()
  const [usage, planState] = await Promise.all([
    getUsageSnapshot(session.organization.id),
    getPlanState(session.organization.id),
  ])

  return (
    <>
      <PageHeader
        eyebrow="Plan"
        title="Usage"
        description={`Counted against the ${planState.plan.name} plan. Monthly counters reset on ${formatDate(periodReset())}; active cases and evidence rooms reflect what exists right now.`}
        actions={
          <Button asChild variant="secondary">
            <Link href="/app/settings/billing">Plan and billing</Link>
          </Button>
        }
      />

      <ul className="bg-canvas">
        {usage.map((entry) => (
          <UsageMetricRow
            key={entry.metric}
            entry={entry}
            explanation={EXPLANATIONS[entry.metric]}
          />
        ))}
      </ul>

      <div className="border-t border-line px-5 py-6 lg:px-8">
        <p className="max-w-[70ch] text-[12.5px] leading-relaxed text-ink-muted">
          These are counts of work already done, not estimates or projections. When a limit is
          reached, work already saved is never discarded — the next operation against that limit is
          refused with a message naming the limit.
        </p>
      </div>
    </>
  )
}
