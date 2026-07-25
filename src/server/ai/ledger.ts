import 'server-only'

import { and, eq, sql } from 'drizzle-orm'
import { getDb } from '@/server/db'
import { analysisRuns, cases, usageEvents } from '@/server/db/schema'
import type { AnalysisOperation, AnalysisRunStatus, UsageMetric } from '@/lib/domain'
import { estimateCostUsd, type Usage } from './provider'

/**
 * AI usage ledger.
 *
 * Records what ran, on what, with which model, and what it cost. Prompts,
 * responses and any hidden model reasoning are deliberately not stored — only
 * counts, timings and a short result summary.
 */
export async function recordAnalysisRun(input: {
  caseId: string | null
  sourceId?: string | null
  operation: AnalysisOperation
  status: AnalysisRunStatus
  provider: 'anthropic' | 'local'
  model: string
  usage: Usage
  durationMs: number
  error?: string
  resultSummary?: Record<string, unknown>
}) {
  if (!input.caseId) return
  const db = await getDb()
  await db.insert(analysisRuns).values({
    caseId: input.caseId,
    sourceId: input.sourceId ?? null,
    operation: input.operation,
    status: input.status,
    provider: input.provider,
    model: input.model,
    inputTokens: input.usage.inputTokens,
    outputTokens: input.usage.outputTokens,
    estimatedCostUsd:
      input.provider === 'anthropic' ? estimateCostUsd(input.usage).toFixed(6) : '0',
    durationMs: input.durationMs,
    error: input.error ?? null,
    resultSummary: input.resultSummary ?? {},
  })

  if (input.status === 'complete' || input.status === 'partial') {
    const owner = await db
      .select({ organizationId: cases.organizationId })
      .from(cases)
      .where(eq(cases.id, input.caseId))
      .limit(1)
    if (owner[0]) {
      await recordUsage({
        organizationId: owner[0].organizationId,
        caseId: input.caseId,
        metric: 'ai_operations',
        quantity: 1,
        metadata: { operation: input.operation, provider: input.provider },
      })
    }
  }
}

export function currentPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function recordUsage(input: {
  organizationId: string
  caseId?: string | null
  metric: UsageMetric
  quantity?: number
  metadata?: Record<string, unknown>
}) {
  const db = await getDb()
  await db.insert(usageEvents).values({
    organizationId: input.organizationId,
    caseId: input.caseId ?? null,
    metric: input.metric,
    quantity: input.quantity ?? 1,
    periodMonth: currentPeriod(),
    metadata: input.metadata ?? {},
  })
}

export async function usageForPeriod(organizationId: string, metric: UsageMetric, period = currentPeriod()) {
  const db = await getDb()
  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${usageEvents.quantity}), 0)::int` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.organizationId, organizationId),
        eq(usageEvents.metric, metric),
        eq(usageEvents.periodMonth, period),
      ),
    )
  return Number(rows[0]?.total ?? 0)
}
