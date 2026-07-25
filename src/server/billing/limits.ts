import 'server-only'

import { and, count, eq, isNull } from 'drizzle-orm'
import { getDb } from '@/server/db'
import { cases, publicShares, subscriptions } from '@/server/db/schema'
import { PLANS, USAGE_METRIC_META, type PlanId, type PlanLimits, type UsageMetric } from '@/lib/domain'
import { PlanLimitError } from '@/server/auth/errors'
import { currentPeriod, usageForPeriod } from '@/server/ai/ledger'

/**
 * Plan enforcement.
 *
 * Entitlements are read from the subscription row, which is only ever written
 * by the Stripe webhook or by an explicit local override — never from anything
 * the client sends. Limits themselves live in src/lib/domain.ts so the pricing
 * page and the enforcement path can never disagree.
 */

export interface PlanState {
  plan: PlanLimits
  planId: PlanId
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: Date | null
  stripeCustomerId: string | null
}

export async function getPlanState(organizationId: string): Promise<PlanState> {
  const db = await getDb()
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId)).limit(1)
  const row = rows[0]
  if (!row) {
    await db.insert(subscriptions).values({ organizationId, plan: 'free' }).onConflictDoNothing()
    return {
      plan: PLANS.free,
      planId: 'free',
      status: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      stripeCustomerId: null,
    }
  }
  const planId: PlanId = row.plan === 'pro' && ['active', 'trialing', 'past_due'].includes(row.status) ? 'pro' : 'free'
  return {
    plan: PLANS[planId],
    planId,
    status: row.status,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    currentPeriodEnd: row.currentPeriodEnd,
    stripeCustomerId: row.stripeCustomerId,
  }
}

export interface UsageSnapshot {
  metric: UsageMetric
  label: string
  used: number
  limit: number
  unit: 'count' | 'bytes'
  ratio: number
}

export async function getUsageSnapshot(organizationId: string): Promise<UsageSnapshot[]> {
  const db = await getDb()
  const { plan } = await getPlanState(organizationId)

  const [activeCases] = await db
    .select({ value: count() })
    .from(cases)
    .where(and(eq(cases.organizationId, organizationId), eq(cases.status, 'active'), isNull(cases.deletedAt)))

  const [shares] = await db
    .select({ value: count() })
    .from(publicShares)
    .innerJoin(cases, eq(cases.id, publicShares.caseId))
    .where(and(eq(cases.organizationId, organizationId), eq(publicShares.enabled, true), isNull(publicShares.revokedAt)))

  const [pages, operations, storage] = await Promise.all([
    usageForPeriod(organizationId, 'processed_pages'),
    usageForPeriod(organizationId, 'ai_operations'),
    usageForPeriod(organizationId, 'storage_bytes'),
  ])

  const values: Record<UsageMetric, number> = {
    active_cases: activeCases?.value ?? 0,
    processed_pages: pages,
    ai_operations: operations,
    storage_bytes: storage,
    public_shares: shares?.value ?? 0,
  }

  return (Object.keys(USAGE_METRIC_META) as UsageMetric[]).map((metric) => {
    const meta = USAGE_METRIC_META[metric]
    const limit = plan[meta.limitKey] as number
    const used = values[metric]
    return {
      metric,
      label: meta.label,
      used,
      limit,
      unit: meta.unit,
      ratio: limit > 0 ? Math.min(1, used / limit) : used > 0 ? 1 : 0,
    }
  })
}

/**
 * Throws a PlanLimitError describing exactly which limit was reached and what
 * the caller may do about it. Work already saved is never discarded.
 */
export async function assertWithinLimit(organizationId: string, metric: UsageMetric, additional = 1) {
  const snapshot = await getUsageSnapshot(organizationId)
  const entry = snapshot.find((s) => s.metric === metric)
  if (!entry) return
  if (entry.limit === 0) {
    throw new PlanLimitError({
      metric,
      limit: 0,
      used: entry.used,
      message: `${entry.label} is not included on your current plan. Upgrade to Pro to enable it.`,
    })
  }
  if (entry.used + additional > entry.limit) {
    const unit = entry.unit === 'bytes' ? '' : ''
    throw new PlanLimitError({
      metric,
      limit: entry.limit,
      used: entry.used,
      message: `You have reached your plan limit for ${entry.label.toLowerCase()} (${formatMetric(entry.used, entry.unit)}${unit} of ${formatMetric(entry.limit, entry.unit)} this period, resetting ${nextPeriodLabel()}). Nothing has been lost — upgrade to Pro to continue.`,
    })
  }
}

export async function isFeatureAvailable(organizationId: string, feature: 'pdfExport' | 'advancedDiscrepancy' | 'priorityProcessing') {
  const { plan } = await getPlanState(organizationId)
  return plan[feature]
}

function formatMetric(value: number, unit: 'count' | 'bytes') {
  if (unit === 'bytes') {
    const mb = value / (1024 * 1024)
    return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`
  }
  return value.toLocaleString('en-US')
}

function nextPeriodLabel() {
  const [year, month] = currentPeriod().split('-').map(Number)
  const next = new Date(Date.UTC(year!, month!, 1))
  return next.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
}

export { PLANS }
