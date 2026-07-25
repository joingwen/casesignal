import * as React from 'react'

import { Badge, EmptyState } from '@/components/ui'
import {
  ANALYSIS_OPERATION_LABELS,
  type AnalysisOperation,
} from '@/lib/domain'
import { formatDate } from '@/lib/utils'
import { requireCaseAccess } from '@/server/auth/guard'
import { getActivity } from '@/server/queries/case-detail'

const STATUS_TONE: Record<string, string> = {
  complete: 'border-status-supported/25 bg-status-supported-soft text-status-supported',
  running: 'border-status-partial/25 bg-status-partial-soft text-status-partial',
  partial: 'border-status-partial/25 bg-status-partial-soft text-status-partial',
  failed: 'border-status-contradicted/25 bg-status-contradicted-soft text-status-contradicted',
}

const STATUS_SYMBOL: Record<string, string> = {
  complete: '✓',
  running: '›',
  partial: '≈',
  failed: '✕',
}

export default async function ActivityPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  await requireCaseAccess(caseId)
  const activity = await getActivity(caseId)

  const groups = new Map<string, typeof activity>()
  for (const item of activity) {
    const day = item.createdAt.slice(0, 10)
    const list = groups.get(day) ?? []
    list.push(item)
    groups.set(day, list)
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <header className="mb-4">
        <h1 className="text-[15px] font-medium text-ink">Activity</h1>
        <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-ink-secondary">
          Every analysis run and every recorded action on this case, in the order they happened.
          Nothing here is inferred — each entry was written when the operation ran.
        </p>
      </header>

      {activity.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="No activity recorded yet"
            description="Adding a record or building the case map writes entries here."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([day, items]) => (
            <section key={day}>
              <h2 className="text-[11px] font-medium uppercase tracking-wide text-ink-secondary">
                {formatDate(day)}
              </h2>
              <ol className="mt-2 divide-y divide-line overflow-hidden rounded-panel border border-line bg-canvas">
                {items.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                    <span className="w-[62px] shrink-0 font-mono text-[11px] text-ink-muted tabular">
                      {new Date(item.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'UTC',
                      })}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink">
                        {item.kind === 'analysis'
                          ? (ANALYSIS_OPERATION_LABELS[item.title as AnalysisOperation] ?? item.title)
                          : item.title.replace(/[._]/g, ' ')}
                      </p>
                      <p
                        className={
                          item.status === 'failed'
                            ? 'mt-0.5 text-[12px] leading-relaxed text-status-contradicted'
                            : 'mt-0.5 text-[12px] leading-relaxed text-ink-secondary'
                        }
                      >
                        {item.detail}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-muted">{item.actor}</p>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        STATUS_TONE[item.status] ?? 'border-line bg-surface text-ink-secondary'
                      }`}
                    >
                      <span className="font-mono opacity-80" aria-hidden="true">
                        {STATUS_SYMBOL[item.status] ?? '·'}
                      </span>
                      {item.status}
                    </span>

                    {item.kind === 'audit' ? (
                      <Badge variant="outline" className="shrink-0">
                        Audit
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
