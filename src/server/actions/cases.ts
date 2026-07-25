'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '@/server/db'
import {
  cases,
  claims,
  discrepancies,
  discrepancyEvidence,
  entities,
  entityRelationships,
  sourceChunks,
  sources,
} from '@/server/db/schema'
import { requireCaseAccess, recordAudit } from '@/server/auth/guard'
import { requireSession } from '@/server/auth/session'
import { assertWithinLimit } from '@/server/billing/limits'
import { CASE_TEMPLATES, type CaseTemplateId } from '@/lib/domain'
import { analyzeDiscrepancies, extractRelationships, suggestMissingEvidence } from '@/server/ai/services'
import { normalizeEntityName } from '@/server/ai/local/text'
import { formatLocator } from '@/lib/citations'
import { deleteObject } from '@/server/storage'
import { actionResult, type ActionResult } from './result'

const createCaseSchema = z.object({
  title: z.string().trim().min(3, 'Give the case a title of at least 3 characters.').max(160),
  description: z.string().trim().max(1000).default(''),
  objective: z.string().trim().max(1000).default(''),
  templateId: z.string().default('general'),
})

export async function createCase(input: z.infer<typeof createCaseSchema>): Promise<ActionResult<{ caseId: string }>> {
  return actionResult(async () => {
    const session = await requireSession()
    const parsed = createCaseSchema.parse(input)
    await assertWithinLimit(session.organization.id, 'active_cases')

    const template = CASE_TEMPLATES.find((t) => t.id === parsed.templateId) ?? CASE_TEMPLATES[0]
    const db = await getDb()
    const inserted = await db
      .insert(cases)
      .values({
        organizationId: session.organization.id,
        createdByProfileId: session.profile.id,
        title: parsed.title,
        description: parsed.description,
        objective: parsed.objective || template.objective,
        templateId: (template.id as CaseTemplateId) ?? 'general',
      })
      .returning()

    const created = inserted[0]!
    await recordAudit({
      organizationId: session.organization.id,
      caseId: created.id,
      profileId: session.profile.id,
      action: 'case.created',
      targetType: 'case',
      targetId: created.id,
      detail: { summary: `Created case “${created.title}”` },
    })

    revalidatePath('/app')
    return { caseId: created.id }
  })
}

const updateCaseSchema = z.object({
  caseId: z.string().uuid(),
  title: z.string().trim().min(3).max(160).optional(),
  description: z.string().trim().max(1000).optional(),
  objective: z.string().trim().max(1000).optional(),
  status: z.enum(['active', 'archived']).optional(),
})

export async function updateCase(input: z.infer<typeof updateCaseSchema>): Promise<ActionResult<null>> {
  return actionResult(async () => {
    const parsed = updateCaseSchema.parse(input)
    const { session } = await requireCaseAccess(parsed.caseId, { write: true })
    const db = await getDb()

    if (parsed.status === 'active') {
      await assertWithinLimit(session.organization.id, 'active_cases', 0)
    }

    await db
      .update(cases)
      .set({
        ...(parsed.title !== undefined ? { title: parsed.title } : {}),
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
        ...(parsed.objective !== undefined ? { objective: parsed.objective } : {}),
        ...(parsed.status !== undefined ? { status: parsed.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(cases.id, parsed.caseId))

    revalidatePath(`/app/cases/${parsed.caseId}`)
    revalidatePath('/app')
    return null
  })
}

export async function deleteCase(caseId: string): Promise<ActionResult<null>> {
  return actionResult(async () => {
    const { session, caseRecord } = await requireCaseAccess(caseId, { write: true })
    const db = await getDb()

    // Remove stored files before the rows that reference them disappear.
    const fileRows = await db
      .select({ storageKey: sources.storageKey })
      .from(sources)
      .where(and(eq(sources.caseId, caseId), isNull(sources.deletedAt)))
    for (const row of fileRows) {
      if (row.storageKey) await deleteObject(row.storageKey).catch(() => undefined)
    }

    await recordAudit({
      organizationId: session.organization.id,
      caseId,
      profileId: session.profile.id,
      action: 'case.deleted',
      targetType: 'case',
      targetId: caseId,
      detail: { summary: `Deleted case “${caseRecord.title}” and all derived analysis` },
    })

    await db.delete(cases).where(eq(cases.id, caseId))
    revalidatePath('/app')
    return null
  })
}

/**
 * Build Case Map — the cross-source analysis pass.
 *
 * Per-source extraction (entities, claims, events) already ran during
 * ingestion. This step does the work that only makes sense once several records
 * are present: relationships between entities, contradictions between records,
 * a case summary and the list of records that would resolve open questions.
 */
export async function buildCaseMap(caseId: string): Promise<ActionResult<{ discrepancies: number; relationships: number }>> {
  return actionResult(async () => {
    const { session, caseRecord } = await requireCaseAccess(caseId, { write: true })
    const db = await getDb()

    const chunkRows = await db
      .select({
        id: sourceChunks.id,
        sourceId: sourceChunks.sourceId,
        text: sourceChunks.text,
        pageNumber: sourceChunks.pageNumber,
        sheetName: sourceChunks.sheetName,
        rowStart: sourceChunks.rowStart,
        rowEnd: sourceChunks.rowEnd,
        sectionPath: sourceChunks.sectionPath,
        timecode: sourceChunks.timecode,
        regionLabel: sourceChunks.regionLabel,
        label: sources.label,
        title: sources.title,
        format: sources.format,
      })
      .from(sourceChunks)
      .innerJoin(sources, eq(sources.id, sourceChunks.sourceId))
      .where(and(eq(sourceChunks.caseId, caseId), isNull(sources.deletedAt)))
      .orderBy(sources.sortOrder, sourceChunks.chunkIndex)
      .limit(400)

    if (chunkRows.length === 0) {
      throw new Error('Add at least one processed source before building the case map.')
    }

    const serviceChunks = chunkRows.map((row) => ({
      id: row.id,
      sourceId: row.sourceId,
      sourceLabel: row.label,
      sourceTitle: row.title,
      format: row.format as never,
      locator: formatLocator(row, row.format as never),
      text: row.text,
      pageNumber: row.pageNumber,
    }))

    const entityRows = await db.select().from(entities).where(eq(entities.caseId, caseId))

    const [relationshipResult, discrepancyResult] = await Promise.all([
      extractRelationships({
        caseId,
        entities: entityRows.map((e) => ({ name: e.name, type: e.type })),
        chunks: serviceChunks,
      }),
      analyzeDiscrepancies({ caseId, chunks: serviceChunks }),
    ])

    // Relationships are rebuilt each run so the graph always reflects current sources.
    await db.delete(entityRelationships).where(eq(entityRelationships.caseId, caseId))
    const entityByName = new Map(entityRows.map((e) => [normalizeEntityName(e.name), e.id]))
    let relationshipCount = 0
    for (const relationship of relationshipResult.relationships) {
      const fromId = entityByName.get(normalizeEntityName(relationship.from))
      const toId = entityByName.get(normalizeEntityName(relationship.to))
      if (!fromId || !toId || fromId === toId) continue
      await db.insert(entityRelationships).values({
        caseId,
        fromEntityId: fromId,
        toEntityId: toId,
        type: relationship.type,
        description: relationship.description,
        confidence: relationship.confidence,
        chunkIds: relationship.chunkIds,
      })
      relationshipCount += 1
    }

    const chunkToSource = new Map(serviceChunks.map((c) => [c.id, c.sourceId]))
    const existingDiscrepancies = await db
      .select({ id: discrepancies.id, title: discrepancies.title, subject: discrepancies.subject })
      .from(discrepancies)
      .where(eq(discrepancies.caseId, caseId))
    const existingKeys = new Set(existingDiscrepancies.map((d) => `${d.title}|${d.subject}`))

    let newDiscrepancies = 0
    for (const item of discrepancyResult.discrepancies) {
      // Never clobber analyst review state: only genuinely new differences are added.
      if (existingKeys.has(`${item.title}|${item.subject}`)) continue
      const sourceA = chunkToSource.get(item.sideA.chunkId)
      const sourceB = chunkToSource.get(item.sideB.chunkId)
      if (!sourceA || !sourceB) continue

      const inserted = await db
        .insert(discrepancies)
        .values({
          caseId,
          title: item.title,
          description: item.description,
          type: item.type,
          subject: item.subject,
          confidence: item.confidence,
          materiality: item.materiality,
        })
        .returning()
      const discrepancyId = inserted[0]!.id
      await db.insert(discrepancyEvidence).values([
        {
          discrepancyId,
          chunkId: item.sideA.chunkId,
          sourceId: sourceA,
          side: 'a',
          statedValue: item.sideA.statedValue,
          excerpt: item.sideA.excerpt,
        },
        {
          discrepancyId,
          chunkId: item.sideB.chunkId,
          sourceId: sourceB,
          side: 'b',
          statedValue: item.sideB.statedValue,
          excerpt: item.sideB.excerpt,
        },
      ])
      newDiscrepancies += 1
    }

    const claimRows = await db
      .select({ status: claims.status })
      .from(claims)
      .where(and(eq(claims.caseId, caseId), isNull(claims.archivedAt)))

    const sourceRows = await db
      .select({ title: sources.title })
      .from(sources)
      .where(and(eq(sources.caseId, caseId), isNull(sources.deletedAt)))

    const summary = [
      `${sourceRows.length} record${sourceRows.length === 1 ? '' : 's'} indexed.`,
      `${claimRows.length} claim${claimRows.length === 1 ? '' : 's'} extracted, of which ${claimRows.filter((c) => c.status === 'supported').length} are supported by at least one citation.`,
      `${existingDiscrepancies.length + newDiscrepancies} point${existingDiscrepancies.length + newDiscrepancies === 1 ? '' : 's'} where records differ.`,
      'Every item links to the excerpt it came from; nothing here is a determination of fact.',
    ].join(' ')

    await db.update(cases).set({ summary, lastAnalyzedAt: new Date(), updatedAt: new Date() }).where(eq(cases.id, caseId))

    await recordAudit({
      organizationId: session.organization.id,
      caseId,
      profileId: session.profile.id,
      action: 'case.map_built',
      targetType: 'case',
      targetId: caseId,
      detail: { summary: `Built the case map for “${caseRecord.title}”` },
    })

    revalidatePath(`/app/cases/${caseId}`, 'layout')
    return { discrepancies: newDiscrepancies, relationships: relationshipCount }
  })
}

export async function getMissingEvidenceSuggestions(caseId: string): Promise<ActionResult<{ record: string; reason: string; priority: string }[]>> {
  return actionResult(async () => {
    const { caseRecord } = await requireCaseAccess(caseId)
    const db = await getDb()
    const [sourceRows, discrepancyRows, claimRows] = await Promise.all([
      db.select({ title: sources.title }).from(sources).where(and(eq(sources.caseId, caseId), isNull(sources.deletedAt))),
      db.select({ subject: discrepancies.subject, title: discrepancies.title }).from(discrepancies).where(eq(discrepancies.caseId, caseId)),
      db
        .select({ statement: claims.statement, status: claims.status })
        .from(claims)
        .where(and(eq(claims.caseId, caseId), eq(claims.status, 'unresolved')))
        .limit(12),
    ])

    const result = await suggestMissingEvidence({
      caseId,
      objective: caseRecord.objective,
      sourceTitles: sourceRows.map((s) => s.title),
      openQuestions: claimRows.map((c) => c.statement),
      discrepancySubjects: discrepancyRows.map((d) => d.subject).filter(Boolean),
      context: [
        `Records held: ${sourceRows.map((s) => s.title).join('; ') || 'none'}`,
        `Unresolved claims: ${claimRows.map((c) => c.statement).join('; ') || 'none'}`,
        `Differences between records: ${discrepancyRows.map((d) => d.title).join('; ') || 'none'}`,
      ].join('\n'),
    })

    return result.suggestions
  })
}

export async function duplicateDemoCase(): Promise<ActionResult<{ caseId: string }>> {
  return actionResult(async () => {
    const session = await requireSession()
    const { seedDemoCase } = await import('@/server/demo/seed')
    const caseId = await seedDemoCase({
      organizationId: session.organization.id,
      profileId: session.profile.id,
      force: true,
    })
    revalidatePath('/app')
    return { caseId }
  })
}

/** Cleans up derived analysis without touching sources — used by "rebuild map". */
export async function resetCaseAnalysis(caseId: string): Promise<ActionResult<null>> {
  return actionResult(async () => {
    const { session } = await requireCaseAccess(caseId, { write: true })
    const db = await getDb()
    await db.delete(discrepancies).where(eq(discrepancies.caseId, caseId))
    await db.delete(entityRelationships).where(eq(entityRelationships.caseId, caseId))
    await recordAudit({
      organizationId: session.organization.id,
      caseId,
      profileId: session.profile.id,
      action: 'case.analysis_reset',
      targetType: 'case',
      targetId: caseId,
      detail: { summary: 'Cleared derived relationships and discrepancies' },
    })
    revalidatePath(`/app/cases/${caseId}`, 'layout')
    return null
  })
}

export async function listRecentCases(limit = 5) {
  const session = await requireSession()
  const db = await getDb()
  return db
    .select({ id: cases.id, title: cases.title, updatedAt: cases.updatedAt, isDemo: cases.isDemo })
    .from(cases)
    .where(and(eq(cases.organizationId, session.organization.id), isNull(cases.deletedAt)))
    .orderBy(desc(cases.updatedAt))
    .limit(limit)
}
