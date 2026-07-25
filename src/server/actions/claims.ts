'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '@/server/db'
import { claimEvidence, claims, discrepancies, sourceChunks, timelineEvents } from '@/server/db/schema'
import { requireCaseAccess, recordAudit } from '@/server/auth/guard'
import {
  CLAIM_CATEGORIES,
  CLAIM_STATUSES,
  EVIDENCE_ROLES,
  MATERIALITY_LEVELS,
  REVIEW_STATES,
  deriveClaimStatus,
} from '@/lib/domain'
import { actionResult, type ActionResult } from './result'

/**
 * Claim mutations.
 *
 * Status is derived from the cited evidence whenever evidence changes, unless
 * an analyst has explicitly set it — in which case `statusOverridden` is set and
 * the derived value never silently replaces their judgement.
 */

async function recomputeStatus(claimId: string) {
  const db = await getDb()
  const claimRows = await db.select().from(claims).where(eq(claims.id, claimId)).limit(1)
  const claim = claimRows[0]
  if (!claim || claim.statusOverridden) return

  const evidence = await db.select({ role: claimEvidence.role }).from(claimEvidence).where(eq(claimEvidence.claimId, claimId))
  const status = deriveClaimStatus({
    supporting: evidence.filter((e) => e.role === 'supporting').length,
    contradicting: evidence.filter((e) => e.role === 'contradicting').length,
    context: evidence.filter((e) => e.role === 'context').length,
  })
  await db.update(claims).set({ status, updatedAt: new Date() }).where(eq(claims.id, claimId))
}

const updateSchema = z.object({
  caseId: z.string().uuid(),
  claimId: z.string().uuid(),
  statement: z.string().trim().min(8).max(400).optional(),
  category: z.enum(CLAIM_CATEGORIES).optional(),
  status: z.enum(CLAIM_STATUSES).optional(),
  materiality: z.enum(MATERIALITY_LEVELS).optional(),
  reviewState: z.enum(REVIEW_STATES).optional(),
  analystNotes: z.string().trim().max(4000).optional(),
  includedInBrief: z.boolean().optional(),
  includedInShare: z.boolean().optional(),
})

export async function updateClaim(input: z.infer<typeof updateSchema>): Promise<ActionResult<null>> {
  return actionResult(async () => {
    const parsed = updateSchema.parse(input)
    const { session } = await requireCaseAccess(parsed.caseId, { write: true })
    const db = await getDb()

    const owned = await db
      .select({ id: claims.id })
      .from(claims)
      .where(and(eq(claims.id, parsed.claimId), eq(claims.caseId, parsed.caseId)))
      .limit(1)
    if (!owned[0]) throw new Error('That claim is not part of this case.')

    await db
      .update(claims)
      .set({
        ...(parsed.statement !== undefined ? { statement: parsed.statement } : {}),
        ...(parsed.category !== undefined ? { category: parsed.category } : {}),
        ...(parsed.status !== undefined ? { status: parsed.status, statusOverridden: true } : {}),
        ...(parsed.materiality !== undefined ? { materiality: parsed.materiality } : {}),
        ...(parsed.reviewState !== undefined ? { reviewState: parsed.reviewState } : {}),
        ...(parsed.analystNotes !== undefined ? { analystNotes: parsed.analystNotes } : {}),
        ...(parsed.includedInBrief !== undefined ? { includedInBrief: parsed.includedInBrief } : {}),
        ...(parsed.includedInShare !== undefined ? { includedInShare: parsed.includedInShare } : {}),
        updatedAt: new Date(),
      })
      .where(eq(claims.id, parsed.claimId))

    if (parsed.status !== undefined) {
      await recordAudit({
        organizationId: session.organization.id,
        caseId: parsed.caseId,
        profileId: session.profile.id,
        action: 'claim.status_changed',
        targetType: 'claim',
        targetId: parsed.claimId,
        detail: { summary: `Set claim status to ${parsed.status}` },
      })
    }

    revalidatePath(`/app/cases/${parsed.caseId}`, 'layout')
    return null
  })
}

const createSchema = z.object({
  caseId: z.string().uuid(),
  statement: z.string().trim().min(8, 'Write the claim as one sentence.').max(400),
  category: z.enum(CLAIM_CATEGORIES).default('other'),
  materiality: z.enum(MATERIALITY_LEVELS).default('medium'),
  chunkIds: z.array(z.string().uuid()).default([]),
  origin: z.enum(['analyst', 'copilot']).default('analyst'),
})

export async function createClaim(input: z.infer<typeof createSchema>): Promise<ActionResult<{ claimId: string }>> {
  return actionResult(async () => {
    const parsed = createSchema.parse(input)
    const { session } = await requireCaseAccess(parsed.caseId, { write: true })
    const db = await getDb()

    const inserted = await db
      .insert(claims)
      .values({
        caseId: parsed.caseId,
        statement: parsed.statement,
        category: parsed.category,
        materiality: parsed.materiality,
        status: 'unresolved',
        confidence: parsed.origin === 'analyst' ? 0.5 : 0.6,
        origin: parsed.origin,
        createdByProfileId: session.profile.id,
      })
      .returning()

    const claimId = inserted[0]!.id
    if (parsed.chunkIds.length > 0) {
      await attachEvidenceRows(parsed.caseId, claimId, parsed.chunkIds, 'supporting')
      await recomputeStatus(claimId)
    }

    revalidatePath(`/app/cases/${parsed.caseId}`, 'layout')
    return { claimId }
  })
}

const evidenceSchema = z.object({
  caseId: z.string().uuid(),
  claimId: z.string().uuid(),
  chunkIds: z.array(z.string().uuid()).min(1),
  role: z.enum(EVIDENCE_ROLES),
})

export async function addClaimEvidence(input: z.infer<typeof evidenceSchema>): Promise<ActionResult<null>> {
  return actionResult(async () => {
    const parsed = evidenceSchema.parse(input)
    await requireCaseAccess(parsed.caseId, { write: true })
    await attachEvidenceRows(parsed.caseId, parsed.claimId, parsed.chunkIds, parsed.role)
    await recomputeStatus(parsed.claimId)
    revalidatePath(`/app/cases/${parsed.caseId}`, 'layout')
    return null
  })
}

/**
 * Citations may only reference chunks that belong to this case — this is the
 * check that makes a fabricated or cross-case citation impossible to persist.
 */
async function attachEvidenceRows(caseId: string, claimId: string, chunkIds: string[], role: 'supporting' | 'contradicting' | 'context') {
  const db = await getDb()
  const valid = await db
    .select({ id: sourceChunks.id, sourceId: sourceChunks.sourceId, text: sourceChunks.text })
    .from(sourceChunks)
    .where(and(eq(sourceChunks.caseId, caseId), inArray(sourceChunks.id, chunkIds)))

  if (valid.length === 0) throw new Error('Those excerpts are not part of this case.')

  for (const chunk of valid) {
    await db
      .insert(claimEvidence)
      .values({
        claimId,
        chunkId: chunk.id,
        sourceId: chunk.sourceId,
        role,
        excerpt: chunk.text.slice(0, 560),
        confidence: 0.7,
      })
      .onConflictDoNothing()
  }
}

export async function removeClaimEvidence(caseId: string, evidenceId: string): Promise<ActionResult<null>> {
  return actionResult(async () => {
    await requireCaseAccess(caseId, { write: true })
    const db = await getDb()
    const rows = await db.select().from(claimEvidence).where(eq(claimEvidence.id, evidenceId)).limit(1)
    const evidence = rows[0]
    if (!evidence) throw new Error('That citation no longer exists.')

    const owned = await db
      .select({ id: claims.id })
      .from(claims)
      .where(and(eq(claims.id, evidence.claimId), eq(claims.caseId, caseId)))
      .limit(1)
    if (!owned[0]) throw new Error('That citation is not part of this case.')

    await db.delete(claimEvidence).where(eq(claimEvidence.id, evidenceId))
    await recomputeStatus(evidence.claimId)
    revalidatePath(`/app/cases/${caseId}`, 'layout')
    return null
  })
}

export async function archiveClaim(caseId: string, claimId: string): Promise<ActionResult<null>> {
  return actionResult(async () => {
    await requireCaseAccess(caseId, { write: true })
    const db = await getDb()
    await db
      .update(claims)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(claims.id, claimId), eq(claims.caseId, caseId)))
    revalidatePath(`/app/cases/${caseId}`, 'layout')
    return null
  })
}

/** Merges duplicates: evidence moves to the survivor, the other is archived. */
export async function mergeClaims(caseId: string, keepClaimId: string, mergeClaimId: string): Promise<ActionResult<null>> {
  return actionResult(async () => {
    await requireCaseAccess(caseId, { write: true })
    if (keepClaimId === mergeClaimId) throw new Error('Select two different claims to merge.')
    const db = await getDb()

    const both = await db
      .select({ id: claims.id })
      .from(claims)
      .where(and(inArray(claims.id, [keepClaimId, mergeClaimId]), eq(claims.caseId, caseId)))
    if (both.length !== 2) throw new Error('Both claims must belong to this case.')

    const moving = await db.select().from(claimEvidence).where(eq(claimEvidence.claimId, mergeClaimId))
    for (const evidence of moving) {
      await db
        .insert(claimEvidence)
        .values({
          claimId: keepClaimId,
          chunkId: evidence.chunkId,
          sourceId: evidence.sourceId,
          role: evidence.role,
          excerpt: evidence.excerpt,
          note: evidence.note,
          confidence: evidence.confidence,
        })
        .onConflictDoNothing()
    }

    await db
      .update(claims)
      .set({ archivedAt: new Date(), mergedIntoClaimId: keepClaimId, updatedAt: new Date() })
      .where(eq(claims.id, mergeClaimId))

    await recomputeStatus(keepClaimId)
    revalidatePath(`/app/cases/${caseId}`, 'layout')
    return null
  })
}

/* -------------------------------------------------------------- timeline */

const eventSchema = z.object({
  caseId: z.string().uuid(),
  eventId: z.string().uuid(),
  title: z.string().trim().min(4).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  precision: z.enum(['exact', 'estimated', 'range', 'conflicting']).optional(),
  analystNotes: z.string().trim().max(2000).optional(),
  reviewState: z.enum(REVIEW_STATES).optional(),
  includedInShare: z.boolean().optional(),
})

export async function updateTimelineEvent(input: z.infer<typeof eventSchema>): Promise<ActionResult<null>> {
  return actionResult(async () => {
    const parsed = eventSchema.parse(input)
    await requireCaseAccess(parsed.caseId, { write: true })
    const db = await getDb()
    await db
      .update(timelineEvents)
      .set({
        ...(parsed.title !== undefined ? { title: parsed.title } : {}),
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
        ...(parsed.occurredOn !== undefined ? { occurredOn: parsed.occurredOn } : {}),
        ...(parsed.precision !== undefined ? { precision: parsed.precision } : {}),
        ...(parsed.analystNotes !== undefined ? { analystNotes: parsed.analystNotes } : {}),
        ...(parsed.reviewState !== undefined ? { reviewState: parsed.reviewState } : {}),
        ...(parsed.includedInShare !== undefined ? { includedInShare: parsed.includedInShare } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(timelineEvents.id, parsed.eventId), eq(timelineEvents.caseId, parsed.caseId)))
    revalidatePath(`/app/cases/${parsed.caseId}`, 'layout')
    return null
  })
}

export async function deleteTimelineEvent(caseId: string, eventId: string): Promise<ActionResult<null>> {
  return actionResult(async () => {
    await requireCaseAccess(caseId, { write: true })
    const db = await getDb()
    await db.delete(timelineEvents).where(and(eq(timelineEvents.id, eventId), eq(timelineEvents.caseId, caseId)))
    revalidatePath(`/app/cases/${caseId}`, 'layout')
    return null
  })
}

/* --------------------------------------------------------- discrepancies */

const discrepancySchema = z.object({
  caseId: z.string().uuid(),
  discrepancyId: z.string().uuid(),
  reviewState: z.enum(REVIEW_STATES).optional(),
  analystNotes: z.string().trim().max(4000).optional(),
  includedInShare: z.boolean().optional(),
  resolved: z.boolean().optional(),
})

export async function updateDiscrepancy(input: z.infer<typeof discrepancySchema>): Promise<ActionResult<null>> {
  return actionResult(async () => {
    const parsed = discrepancySchema.parse(input)
    const { session } = await requireCaseAccess(parsed.caseId, { write: true })
    const db = await getDb()
    await db
      .update(discrepancies)
      .set({
        ...(parsed.reviewState !== undefined ? { reviewState: parsed.reviewState } : {}),
        ...(parsed.analystNotes !== undefined ? { analystNotes: parsed.analystNotes } : {}),
        ...(parsed.includedInShare !== undefined ? { includedInShare: parsed.includedInShare } : {}),
        ...(parsed.resolved !== undefined ? { resolvedAt: parsed.resolved ? new Date() : null } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(discrepancies.id, parsed.discrepancyId), eq(discrepancies.caseId, parsed.caseId)))

    if (parsed.reviewState) {
      await recordAudit({
        organizationId: session.organization.id,
        caseId: parsed.caseId,
        profileId: session.profile.id,
        action: 'discrepancy.reviewed',
        targetType: 'discrepancy',
        targetId: parsed.discrepancyId,
        detail: { summary: `Marked a discrepancy as ${parsed.reviewState.replace('_', ' ')}` },
      })
    }

    revalidatePath(`/app/cases/${parsed.caseId}`, 'layout')
    return null
  })
}
