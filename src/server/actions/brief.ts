'use server'

import { revalidatePath } from 'next/cache'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '@/server/db'
import {
  briefSections,
  briefs,
  claimEvidence,
  claims,
  discrepancies,
  discrepancyEvidence,
  exports as exportsTable,
  sourceChunks,
  sources,
  timelineEventSources,
  timelineEvents,
} from '@/server/db/schema'
import { requireCaseAccess, recordAudit } from '@/server/auth/guard'
import { check } from '@/server/security/rate-limit'
import { isFeatureAvailable } from '@/server/billing/limits'
import { writeBriefSection } from '@/server/ai/services'
import { formatCitation, formatLocator } from '@/lib/citations'
import { BRIEF_SECTION_META, CLAIM_STATUS_META, NEUTRALITY_DISCLAIMER, type BriefSectionKey } from '@/lib/domain'
import { formatDate } from '@/lib/utils'
import { actionResult, type ActionResult } from './result'

/**
 * Brief builder.
 *
 * Structural sections (source inventory, timeline, claims, discrepancies,
 * appendix) are composed directly from the case data so their citations are
 * exactly the stored ones. Prose sections are drafted from that same material,
 * which is why a generated brief cannot contain a citation the case does not
 * hold.
 */

async function loadBriefMaterial(caseId: string) {
  const db = await getDb()
  const [sourceRows, claimRows, evidenceRows, eventRows, eventSourceRows, discrepancyRows, discrepancyEvidenceRows] =
    await Promise.all([
      db
        .select()
        .from(sources)
        .where(and(eq(sources.caseId, caseId), isNull(sources.deletedAt)))
        .orderBy(asc(sources.sortOrder)),
      db
        .select()
        .from(claims)
        .where(and(eq(claims.caseId, caseId), isNull(claims.archivedAt), eq(claims.includedInBrief, true))),
      db
        .select({
          claimId: claimEvidence.claimId,
          role: claimEvidence.role,
          sourceId: claimEvidence.sourceId,
          chunkId: claimEvidence.chunkId,
          excerpt: claimEvidence.excerpt,
        })
        .from(claimEvidence)
        .innerJoin(claims, eq(claims.id, claimEvidence.claimId))
        .where(eq(claims.caseId, caseId)),
      db.select().from(timelineEvents).where(eq(timelineEvents.caseId, caseId)).orderBy(asc(timelineEvents.occurredOn)),
      db
        .select({ eventId: timelineEventSources.eventId, sourceId: timelineEventSources.sourceId, chunkId: timelineEventSources.chunkId })
        .from(timelineEventSources)
        .innerJoin(timelineEvents, eq(timelineEvents.id, timelineEventSources.eventId))
        .where(eq(timelineEvents.caseId, caseId)),
      db.select().from(discrepancies).where(eq(discrepancies.caseId, caseId)),
      db
        .select({
          discrepancyId: discrepancyEvidence.discrepancyId,
          side: discrepancyEvidence.side,
          sourceId: discrepancyEvidence.sourceId,
          chunkId: discrepancyEvidence.chunkId,
          statedValue: discrepancyEvidence.statedValue,
          excerpt: discrepancyEvidence.excerpt,
        })
        .from(discrepancyEvidence)
        .innerJoin(discrepancies, eq(discrepancies.id, discrepancyEvidence.discrepancyId))
        .where(eq(discrepancies.caseId, caseId)),
    ])

  const chunkRows = await db
    .select({
      id: sourceChunks.id,
      sourceId: sourceChunks.sourceId,
      pageNumber: sourceChunks.pageNumber,
      sheetName: sourceChunks.sheetName,
      rowStart: sourceChunks.rowStart,
      rowEnd: sourceChunks.rowEnd,
      sectionPath: sourceChunks.sectionPath,
      timecode: sourceChunks.timecode,
      regionLabel: sourceChunks.regionLabel,
    })
    .from(sourceChunks)
    .where(eq(sourceChunks.caseId, caseId))

  const sourceById = new Map(sourceRows.map((s) => [s.id, s]))
  const chunkById = new Map(chunkRows.map((c) => [c.id, c]))

  const cite = (chunkId: string) => {
    const chunk = chunkById.get(chunkId)
    if (!chunk) return ''
    const source = sourceById.get(chunk.sourceId)
    if (!source) return ''
    return formatCitation(source.label, formatLocator(chunk, source.format as never))
  }

  return { sourceRows, claimRows, evidenceRows, eventRows, eventSourceRows, discrepancyRows, discrepancyEvidenceRows, cite }
}

type Material = Awaited<ReturnType<typeof loadBriefMaterial>>

function composeSection(key: BriefSectionKey, caseRow: { title: string; description: string; objective: string }, material: Material): string {
  const { sourceRows, claimRows, evidenceRows, eventRows, eventSourceRows, discrepancyRows, discrepancyEvidenceRows, cite } = material

  switch (key) {
    case 'objective':
      return caseRow.objective || caseRow.description || 'No objective has been recorded for this case yet.'

    case 'source_inventory':
      if (sourceRows.length === 0) return 'No records have been added to this case.'
      return sourceRows
        .map(
          (s) =>
            `- **${s.label}** — ${s.title} (${s.format.toUpperCase()}${s.pageCount ? `, ${s.pageCount} page${s.pageCount === 1 ? '' : 's'}` : ''}). Added ${formatDate(s.createdAt)}.${s.sourceUrl ? ` Retrieved from ${s.sourceUrl}.` : ''}`,
        )
        .join('\n')

    case 'timeline':
      if (eventRows.length === 0) return 'No dated events were identified in the current records.'
      return eventRows
        .map((event) => {
          const citations = eventSourceRows
            .filter((s) => s.eventId === event.id)
            .map((s) => cite(s.chunkId))
            .filter(Boolean)
          return `- **${formatDate(event.occurredOn)}**${event.precision !== 'exact' ? ` (${event.precision})` : ''} — ${event.title} ${citations.join(' ')}`.trim()
        })
        .join('\n')

    case 'material_claims': {
      if (claimRows.length === 0) return 'No claims have been marked for inclusion.'
      const material = claimRows.filter((c) => c.materiality !== 'low')
      const list = material.length > 0 ? material : claimRows
      return list
        .map((claim) => {
          const citations = evidenceRows
            .filter((e) => e.claimId === claim.id)
            .map((e) => `${e.role === 'contradicting' ? 'conflicting ' : ''}${cite(e.chunkId)}`)
            .filter(Boolean)
          return `- ${claim.statement} — **${CLAIM_STATUS_META[claim.status as keyof typeof CLAIM_STATUS_META].label}**. ${citations.join(' ')}`.trim()
        })
        .join('\n')
    }

    case 'discrepancies':
      if (discrepancyRows.length === 0) return 'No inconsistencies between records were identified.'
      return discrepancyRows
        .map((discrepancy) => {
          const sides = discrepancyEvidenceRows.filter((e) => e.discrepancyId === discrepancy.id)
          const detail = sides
            .map((side) => `${side.statedValue || 'value not stated'} ${cite(side.chunkId)}`)
            .join(' versus ')
          return `- **${discrepancy.title}.** ${discrepancy.description} ${detail ? `Recorded values: ${detail}.` : ''}`.trim()
        })
        .join('\n\n')

    case 'appendix': {
      const lines = sourceRows.map((s) => `- **${s.label}** — ${s.title}${s.sourceUrl ? ` (${s.sourceUrl})` : ''}`)
      return [...lines, '', `_${NEUTRALITY_DISCLAIMER}_`].join('\n')
    }

    case 'methodology':
      return [
        `This review covers ${sourceRows.length} record${sourceRows.length === 1 ? '' : 's'} added to the case between ${sourceRows.length ? formatDate(sourceRows[0]!.createdAt) : '—'} and ${sourceRows.length ? formatDate(sourceRows[sourceRows.length - 1]!.createdAt) : '—'}.`,
        'Each record was indexed into excerpts that preserve their original location (page, sheet and row, section or timecode). Claims, dated events and named parties were extracted from those excerpts, and each is linked to the excerpt it came from.',
        'Differences between records were identified by comparing stated values for the same subject across different records. No information outside the listed records was used.',
      ].join('\n\n')

    case 'limitations':
      return [
        'This brief describes what the listed records state. It does not establish what occurred, and it makes no finding about any person or organization.',
        `Records not held by this case were not considered. ${sourceRows.filter((s) => s.status === 'needs_review').length > 0 ? 'Some records were extracted with low confidence and should be read in the original before being relied upon. ' : ''}Where records conflict, both readings are preserved rather than resolved.`,
        NEUTRALITY_DISCLAIMER,
      ].join('\n\n')

    case 'key_findings': {
      const supported = claimRows.filter((c) => c.status === 'supported')
      if (supported.length === 0) return 'No claim in this case is currently supported by an uncontested citation.'
      return supported
        .slice(0, 8)
        .map((claim) => {
          const citations = evidenceRows.filter((e) => e.claimId === claim.id).map((e) => cite(e.chunkId)).filter(Boolean)
          return `- ${claim.statement} ${citations.slice(0, 3).join(' ')}`.trim()
        })
        .join('\n')
    }

    case 'unresolved_questions': {
      const unresolved = claimRows.filter((c) => c.status === 'unresolved' || c.status === 'contradicted')
      const open = discrepancyRows.filter((d) => !d.resolvedAt)
      const lines = [
        ...unresolved.slice(0, 6).map((c) => `- ${c.statement} — the records do not settle this.`),
        ...open.slice(0, 6).map((d) => `- ${d.title} — the records state different values and no record reconciles them.`),
      ]
      return lines.length > 0 ? lines.join('\n') : 'No open questions are currently recorded.'
    }

    case 'executive_summary': {
      const counts = {
        sources: sourceRows.length,
        claims: claimRows.length,
        supported: claimRows.filter((c) => c.status === 'supported').length,
        contradicted: claimRows.filter((c) => c.status === 'contradicted').length,
        discrepancies: discrepancyRows.length,
        events: eventRows.length,
      }
      return [
        `This review examined ${counts.sources} record${counts.sources === 1 ? '' : 's'} for the purpose stated in the case objective.`,
        `${counts.claims} claim${counts.claims === 1 ? '' : 's'} were extracted from those records. ${counts.supported} are supported by at least one citation with no conflicting citation; ${counts.contradicted} are contradicted by another record.`,
        `${counts.events} dated event${counts.events === 1 ? '' : 's'} were identified, and ${counts.discrepancies} point${counts.discrepancies === 1 ? '' : 's'} where the records state different values.`,
        'Each statement in this brief carries the citation for the record it came from. Nothing here is a determination of fact.',
      ].join('\n\n')
    }

    case 'recommended_records':
      return 'Run "Suggest missing records" in the case workspace to populate this section from the current state of the case.'

    default:
      return ''
  }
}

const generateSchema = z.object({
  caseId: z.string().uuid(),
  sectionKey: z.enum(Object.keys(BRIEF_SECTION_META) as [BriefSectionKey, ...BriefSectionKey[]]).optional(),
})

/** Generates the whole brief, or regenerates a single section. */
export async function generateBrief(input: z.infer<typeof generateSchema>): Promise<ActionResult<{ sections: number }>> {
  return actionResult(async () => {
    const parsed = generateSchema.parse(input)
    const { session, caseRecord } = await requireCaseAccess(parsed.caseId, { write: true })
    check('ai', session.profile.id)

    const db = await getDb()
    const material = await loadBriefMaterial(parsed.caseId)
    if (material.sourceRows.length === 0) {
      throw new Error('Add at least one source before drafting the brief.')
    }

    const existing = await db.select().from(briefs).where(eq(briefs.caseId, parsed.caseId)).limit(1)
    let brief = existing[0]
    if (!brief) {
      const inserted = await db
        .insert(briefs)
        .values({ caseId: parsed.caseId, title: `${caseRecord.title} — investigation brief` })
        .returning()
      brief = inserted[0]!
    }

    const keys = parsed.sectionKey ? [parsed.sectionKey] : (Object.keys(BRIEF_SECTION_META) as BriefSectionKey[])
    const contextSummary = [
      composeSection('source_inventory', caseRecord, material),
      composeSection('material_claims', caseRecord, material),
      composeSection('discrepancies', caseRecord, material),
      composeSection('timeline', caseRecord, material),
    ].join('\n\n')

    let written = 0
    for (const key of keys) {
      const meta = BRIEF_SECTION_META[key]
      const composed = composeSection(key, caseRecord, material)
      const body = meta.generated
        ? await writeBriefSection({
            caseId: parsed.caseId,
            sectionTitle: meta.title,
            guidance: meta.hint,
            context: contextSummary,
            fallback: composed,
          })
        : composed

      await db
        .insert(briefSections)
        .values({
          briefId: brief.id,
          caseId: parsed.caseId,
          key,
          title: meta.title,
          body,
          position: (Object.keys(BRIEF_SECTION_META) as BriefSectionKey[]).indexOf(key),
          generated: true,
          included: true,
        })
        .onConflictDoUpdate({
          target: [briefSections.briefId, briefSections.key],
          set: { body, generated: true, updatedAt: new Date() },
        })
      written += 1
    }

    await db
      .update(briefs)
      .set({ generatedAt: new Date(), status: 'draft', updatedAt: new Date() })
      .where(eq(briefs.id, brief.id))

    revalidatePath(`/app/cases/${parsed.caseId}/brief`)
    return { sections: written }
  })
}

const sectionSchema = z.object({
  caseId: z.string().uuid(),
  sectionId: z.string().uuid(),
  body: z.string().max(20000).optional(),
  included: z.boolean().optional(),
  position: z.number().int().min(0).max(50).optional(),
})

export async function updateBriefSection(input: z.infer<typeof sectionSchema>): Promise<ActionResult<null>> {
  return actionResult(async () => {
    const parsed = sectionSchema.parse(input)
    await requireCaseAccess(parsed.caseId, { write: true })
    const db = await getDb()
    await db
      .update(briefSections)
      .set({
        ...(parsed.body !== undefined ? { body: parsed.body, generated: false } : {}),
        ...(parsed.included !== undefined ? { included: parsed.included } : {}),
        ...(parsed.position !== undefined ? { position: parsed.position } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(briefSections.id, parsed.sectionId), eq(briefSections.caseId, parsed.caseId)))
    revalidatePath(`/app/cases/${parsed.caseId}/brief`)
    return null
  })
}

export async function reorderBriefSections(caseId: string, orderedIds: string[]): Promise<ActionResult<null>> {
  return actionResult(async () => {
    await requireCaseAccess(caseId, { write: true })
    const db = await getDb()
    await Promise.all(
      orderedIds.map((id, index) =>
        db
          .update(briefSections)
          .set({ position: index, updatedAt: new Date() })
          .where(and(eq(briefSections.id, id), eq(briefSections.caseId, caseId))),
      ),
    )
    revalidatePath(`/app/cases/${caseId}/brief`)
    return null
  })
}

/** Renders the brief to Markdown. PDF export is produced from this same text. */
export async function renderBriefMarkdown(caseId: string): Promise<string> {
  const { caseRecord } = await requireCaseAccess(caseId)
  const db = await getDb()
  const briefRows = await db.select().from(briefs).where(eq(briefs.caseId, caseId)).limit(1)
  const brief = briefRows[0]
  const sectionRows = brief
    ? await db.select().from(briefSections).where(eq(briefSections.briefId, brief.id)).orderBy(asc(briefSections.position))
    : []

  const lines: string[] = [
    `# ${caseRecord.title}`,
    '',
    caseRecord.description || '',
    '',
    `_Prepared with CaseSignal · ${formatDate(new Date())}_`,
    '',
    '---',
    '',
  ]

  for (const section of sectionRows.filter((s) => s.included && s.body.trim())) {
    lines.push(`## ${section.title}`, '', section.body.trim(), '')
  }

  lines.push('---', '', `_${NEUTRALITY_DISCLAIMER}_`)
  return lines.join('\n')
}

export async function recordExport(caseId: string, format: 'markdown' | 'pdf', byteSize: number): Promise<ActionResult<null>> {
  return actionResult(async () => {
    const { session } = await requireCaseAccess(caseId)
    check('export', session.profile.id)
    if (format === 'pdf' && !(await isFeatureAvailable(session.organization.id, 'pdfExport'))) {
      throw new Error('PDF dossiers are a Pro feature. Markdown export is available on every plan.')
    }
    const db = await getDb()
    await db.insert(exportsTable).values({ caseId, profileId: session.profile.id, format, scope: 'brief', byteSize })
    await recordAudit({
      organizationId: session.organization.id,
      caseId,
      profileId: session.profile.id,
      action: 'brief.exported',
      targetType: 'brief',
      targetId: caseId,
      detail: { summary: `Exported the brief as ${format.toUpperCase()}` },
    })
    return null
  })
}
