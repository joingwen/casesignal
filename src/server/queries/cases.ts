import 'server-only'

import { and, count, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm'
import { getDb } from '@/server/db'
import {
  cases,
  claims,
  discrepancies,
  publicShares,
  sources,
  timelineEvents,
  userProfiles,
} from '@/server/db/schema'
import { PROCESSING_STATUS_META, type CaseStatus, type ProcessingStatus } from '@/lib/domain'
import type { SessionContext } from '@/server/auth/session'

export interface CaseListItem {
  id: string
  title: string
  description: string
  objective: string
  templateId: string
  status: CaseStatus
  isDemo: boolean
  updatedAt: string
  createdAt: string
  createdBy: string
  counts: {
    sources: number
    claims: number
    events: number
    discrepancies: number
    processing: number
    unresolved: number
  }
  shared: boolean
}

export interface CaseListFilters {
  query?: string
  status?: CaseStatus | 'all'
  sort?: 'recent' | 'created' | 'title'
}

export async function listCases(session: SessionContext, filters: CaseListFilters = {}): Promise<CaseListItem[]> {
  const db = await getDb()
  const conditions = [eq(cases.organizationId, session.organization.id), isNull(cases.deletedAt)]

  if (filters.status && filters.status !== 'all') conditions.push(eq(cases.status, filters.status))
  if (filters.query?.trim()) {
    const q = `%${filters.query.trim()}%`
    conditions.push(or(ilike(cases.title, q), ilike(cases.description, q), ilike(cases.objective, q))!)
  }

  const rows = await db
    .select({
      id: cases.id,
      title: cases.title,
      description: cases.description,
      objective: cases.objective,
      templateId: cases.templateId,
      status: cases.status,
      isDemo: cases.isDemo,
      updatedAt: cases.updatedAt,
      createdAt: cases.createdAt,
      createdBy: userProfiles.displayName,
    })
    .from(cases)
    .leftJoin(userProfiles, eq(userProfiles.id, cases.createdByProfileId))
    .where(and(...conditions))
    .orderBy(
      filters.sort === 'title' ? cases.title : filters.sort === 'created' ? desc(cases.createdAt) : desc(cases.updatedAt),
    )
    .limit(200)

  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)

  const [sourceCounts, claimCounts, eventCounts, discrepancyCounts, shareRows] = await Promise.all([
    db
      .select({ caseId: sources.caseId, total: count(), status: sources.status })
      .from(sources)
      .where(and(inArray(sources.caseId, ids), isNull(sources.deletedAt)))
      .groupBy(sources.caseId, sources.status),
    db
      .select({ caseId: claims.caseId, total: count(), status: claims.status })
      .from(claims)
      .where(and(inArray(claims.caseId, ids), isNull(claims.archivedAt)))
      .groupBy(claims.caseId, claims.status),
    db
      .select({ caseId: timelineEvents.caseId, total: count() })
      .from(timelineEvents)
      .where(inArray(timelineEvents.caseId, ids))
      .groupBy(timelineEvents.caseId),
    db
      .select({ caseId: discrepancies.caseId, total: count() })
      .from(discrepancies)
      .where(inArray(discrepancies.caseId, ids))
      .groupBy(discrepancies.caseId),
    db
      .select({ caseId: publicShares.caseId })
      .from(publicShares)
      .where(and(inArray(publicShares.caseId, ids), eq(publicShares.enabled, true), isNull(publicShares.revokedAt))),
  ])

  const sourceTotals = new Map<string, { total: number; processing: number }>()
  for (const row of sourceCounts) {
    const entry = sourceTotals.get(row.caseId) ?? { total: 0, processing: 0 }
    entry.total += Number(row.total)
    if (!PROCESSING_STATUS_META[row.status as ProcessingStatus].terminal) entry.processing += Number(row.total)
    sourceTotals.set(row.caseId, entry)
  }

  const claimTotals = new Map<string, { total: number; unresolved: number }>()
  for (const row of claimCounts) {
    const entry = claimTotals.get(row.caseId) ?? { total: 0, unresolved: 0 }
    entry.total += Number(row.total)
    if (row.status === 'unresolved' || row.status === 'contradicted') entry.unresolved += Number(row.total)
    claimTotals.set(row.caseId, entry)
  }

  const eventTotals = new Map(eventCounts.map((r) => [r.caseId, Number(r.total)]))
  const discrepancyTotals = new Map(discrepancyCounts.map((r) => [r.caseId, Number(r.total)]))
  const sharedSet = new Set(shareRows.map((r) => r.caseId))

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    objective: row.objective,
    templateId: row.templateId,
    status: row.status as CaseStatus,
    isDemo: row.isDemo,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy ?? 'Unknown',
    counts: {
      sources: sourceTotals.get(row.id)?.total ?? 0,
      processing: sourceTotals.get(row.id)?.processing ?? 0,
      claims: claimTotals.get(row.id)?.total ?? 0,
      unresolved: claimTotals.get(row.id)?.unresolved ?? 0,
      events: eventTotals.get(row.id) ?? 0,
      discrepancies: discrepancyTotals.get(row.id) ?? 0,
    },
    shared: sharedSet.has(row.id),
  }))
}

export async function findDemoCase(session: SessionContext) {
  const db = await getDb()
  const rows = await db
    .select({ id: cases.id })
    .from(cases)
    .where(and(eq(cases.organizationId, session.organization.id), eq(cases.isDemo, true), isNull(cases.deletedAt)))
    .limit(1)
  return rows[0]?.id ?? null
}
