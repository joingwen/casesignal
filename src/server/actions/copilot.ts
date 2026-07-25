'use server'

import { revalidatePath } from 'next/cache'
import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '@/server/db'
import { caseConversations, caseMessages, claims, discrepancies, sources } from '@/server/db/schema'
import { requireCaseAccess } from '@/server/auth/guard'
import { check } from '@/server/security/rate-limit'
import { assertWithinLimit } from '@/server/billing/limits'
import { retrieve, type RetrievedChunk } from '@/server/retrieval'
import { generateAnswer, planQuery } from '@/server/ai/services'
import type { AiProvider } from '@/server/ai/provider'
import { verifyCitations, type ResolvedCitation } from '@/lib/citations'
import { actionResult, type ActionResult } from './result'

/**
 * Case Copilot.
 *
 * The answer path is: plan → retrieve → generate → **verify**. The verification
 * step is not optional: any citation the model produced that does not resolve to
 * a chunk actually included in this retrieval is stripped, and if nothing
 * survives, the answer is replaced with an explicit statement that the case
 * sources do not establish the point. A citation shown to an analyst always
 * opens the exact excerpt it names.
 */

const askSchema = z.object({
  caseId: z.string().uuid(),
  question: z.string().trim().min(3, 'Ask a question about this case.').max(1000),
  sourceIds: z.array(z.string().uuid()).max(20).optional(),
  focusChunkIds: z.array(z.string().uuid()).max(20).optional(),
})

export interface AskResult {
  messageId: string
  answer: string
  citations: ResolvedCitation[]
  insufficientEvidence: boolean
  retrievedCount: number
  invalidMarkers: string[]
  uncitedSentences: string[]
  provider: AiProvider
}

export async function askCase(input: z.infer<typeof askSchema>): Promise<ActionResult<AskResult>> {
  return actionResult(async () => {
    const parsed = askSchema.parse(input)
    const { session, caseRecord } = await requireCaseAccess(parsed.caseId)
    check('ai', session.profile.id)
    await assertWithinLimit(session.organization.id, 'ai_operations')

    const db = await getDb()
    const sourceRows = await db
      .select({ id: sources.id, label: sources.label, title: sources.title, format: sources.format })
      .from(sources)
      .where(and(eq(sources.caseId, parsed.caseId), isNull(sources.deletedAt)))

    if (sourceRows.length === 0) {
      throw new Error('Add at least one source to this case before asking a question.')
    }

    const plan = await planQuery({
      caseId: parsed.caseId,
      question: parsed.question,
      sourceInventory: sourceRows.map((s) => `${s.label} — ${s.title} (${s.format})`).join('\n'),
    })

    // Run every planned query and merge, so a multi-part question retrieves
    // material for each part rather than only the strongest phrasing.
    const merged = new Map<string, RetrievedChunk>()
    for (const query of plan.searchQueries.slice(0, 4)) {
      const results = await retrieve({
        caseId: parsed.caseId,
        query,
        limit: 10,
        sourceIds: parsed.sourceIds,
        focusChunkIds: parsed.focusChunkIds,
      })
      for (const chunk of results) {
        const existing = merged.get(chunk.id)
        if (!existing || existing.score < chunk.score) merged.set(chunk.id, chunk)
      }
    }

    const retrieved = Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 14)

    const generated = await generateAnswer({
      caseId: parsed.caseId,
      question: parsed.question,
      objective: caseRecord.objective,
      chunks: retrieved,
    })

    const verification = verifyCitations({
      text: generated.text,
      retrieved: retrieved.map((chunk) => ({
        id: chunk.id,
        sourceId: chunk.sourceId,
        text: chunk.text,
        pageNumber: chunk.pageNumber,
        sheetName: chunk.sheetName,
        rowStart: chunk.rowStart,
        rowEnd: chunk.rowEnd,
        sectionPath: chunk.sectionPath,
        timecode: chunk.timecode,
        regionLabel: chunk.regionLabel,
      })),
      sources: sourceRows.map((s) => ({ id: s.id, label: s.label, title: s.title, format: s.format as never })),
    })

    const insufficient = generated.insufficient || verification.unsupported
    const answer = verification.unsupported
      ? 'The available case sources do not establish this. The excerpts retrieved for this question do not address it directly — adding a record that covers this point would allow it to be answered.'
      : verification.text

    const conversation = await ensureConversation(parsed.caseId, session.profile.id)
    await db.insert(caseMessages).values({
      conversationId: conversation,
      caseId: parsed.caseId,
      role: 'user',
      content: parsed.question,
    })

    const inserted = await db
      .insert(caseMessages)
      .values({
        conversationId: conversation,
        caseId: parsed.caseId,
        role: 'assistant',
        content: answer,
        citations: verification.citations.map((c) => ({
          marker: c.marker,
          chunkId: c.chunkId,
          sourceId: c.sourceId,
          sourceLabel: c.sourceLabel,
          locator: c.locator,
          excerpt: c.excerpt,
        })),
        retrievedChunkIds: retrieved.map((c) => c.id),
        insufficientEvidence: insufficient,
      })
      .returning()

    await db
      .update(caseConversations)
      .set({ updatedAt: new Date() })
      .where(eq(caseConversations.id, conversation))

    revalidatePath(`/app/cases/${parsed.caseId}`, 'layout')

    return {
      messageId: inserted[0]!.id,
      answer,
      citations: verification.citations,
      insufficientEvidence: insufficient,
      retrievedCount: retrieved.length,
      invalidMarkers: verification.invalidMarkers,
      uncitedSentences: verification.uncitedSentences,
      provider: generated.provider,
    }
  })
}

async function ensureConversation(caseId: string, profileId: string) {
  const db = await getDb()
  const existing = await db
    .select({ id: caseConversations.id })
    .from(caseConversations)
    .where(and(eq(caseConversations.caseId, caseId), eq(caseConversations.profileId, profileId)))
    .orderBy(desc(caseConversations.updatedAt))
    .limit(1)
  if (existing[0]) return existing[0].id
  const inserted = await db.insert(caseConversations).values({ caseId, profileId }).returning()
  return inserted[0]!.id
}

export async function clearConversation(caseId: string): Promise<ActionResult<null>> {
  return actionResult(async () => {
    const { session } = await requireCaseAccess(caseId, { write: true })
    const db = await getDb()
    const conversation = await ensureConversation(caseId, session.profile.id)
    await db.delete(caseMessages).where(eq(caseMessages.conversationId, conversation))
    revalidatePath(`/app/cases/${caseId}`, 'layout')
    return null
  })
}

/** Turns a verified answer into a claim, carrying its citations across intact. */
export async function convertAnswerToClaim(caseId: string, messageId: string, statement: string): Promise<ActionResult<{ claimId: string }>> {
  return actionResult(async () => {
    await requireCaseAccess(caseId, { write: true })
    const db = await getDb()
    const rows = await db
      .select()
      .from(caseMessages)
      .where(and(eq(caseMessages.id, messageId), eq(caseMessages.caseId, caseId)))
      .limit(1)
    const message = rows[0]
    if (!message) throw new Error('That answer is no longer available.')

    const { createClaim } = await import('./claims')
    const result = await createClaim({
      caseId,
      statement: statement.trim().slice(0, 400),
      category: 'other',
      materiality: 'medium',
      chunkIds: message.citations.map((c) => c.chunkId),
      origin: 'copilot',
    })
    if (!result.ok) throw new Error(result.error)
    return result.data
  })
}

/**
 * Context-aware prompt suggestions. These reflect the actual state of the case
 * — what is unresolved, what conflicts, what was just added — rather than a
 * fixed list.
 */
export async function suggestedQuestions(caseId: string): Promise<string[]> {
  const db = await getDb()
  const [sourceRows, discrepancyRows, claimRows] = await Promise.all([
    db
      .select({ label: sources.label, title: sources.title })
      .from(sources)
      .where(and(eq(sources.caseId, caseId), isNull(sources.deletedAt)))
      .orderBy(asc(sources.sortOrder))
      .limit(6),
    db.select({ subject: discrepancies.subject, title: discrepancies.title }).from(discrepancies).where(eq(discrepancies.caseId, caseId)).limit(3),
    db
      .select({ statement: claims.statement })
      .from(claims)
      .where(and(eq(claims.caseId, caseId), eq(claims.status, 'unresolved'), isNull(claims.archivedAt)))
      .limit(3),
  ])

  const suggestions: string[] = []
  for (const discrepancy of discrepancyRows) {
    suggestions.push(`Which records disagree about the ${discrepancy.subject || 'reported figures'}, and what does each one say?`)
  }
  if (sourceRows.length >= 2) {
    suggestions.push(`Compare ${sourceRows[0]!.title} and ${sourceRows[1]!.title} — where do they differ?`)
  }
  suggestions.push('Build a chronology of everything these records date.')
  for (const claim of claimRows.slice(0, 1)) {
    suggestions.push(`What evidence exists for: ${claim.statement.slice(0, 90)}?`)
  }
  suggestions.push('What is documented about approvals, and by whom?')
  suggestions.push('Which records would resolve the open questions in this case?')

  return Array.from(new Set(suggestions)).slice(0, 6)
}
