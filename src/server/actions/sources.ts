'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '@/server/db'
import { sourceChunks, sources } from '@/server/db/schema'
import { requireCaseAccess, requireSourceAccess, recordAudit } from '@/server/auth/guard'
import { assertWithinLimit } from '@/server/billing/limits'
import { check } from '@/server/security/rate-limit'
import { createSourceRecord, processSource } from '@/server/ingest/pipeline'
import { validatePastedText } from '@/server/ingest/validate'
import { fetchPublicPage } from '@/server/ingest/url'
import { deleteObject, getObject } from '@/server/storage'
import { actionResult, type ActionResult } from './result'

const noteSchema = z.object({
  caseId: z.string().uuid(),
  title: z.string().trim().min(2, 'Give this note a title.').max(160),
  text: z.string().trim().min(1, 'Add the text you want to include.'),
  kind: z.enum(['note', 'paste']).default('note'),
})

/** Adds a typed note or pasted transcript as a first-class, citable source. */
export async function addTextSource(input: z.infer<typeof noteSchema>): Promise<ActionResult<{ sourceId: string }>> {
  return actionResult(async () => {
    const parsed = noteSchema.parse(input)
    const { session } = await requireCaseAccess(parsed.caseId, { write: true })
    check('upload', session.profile.id)
    await assertWithinLimit(session.organization.id, 'processed_pages')

    const text = validatePastedText(parsed.text)
    const source = await createSourceRecord({
      caseId: parsed.caseId,
      title: parsed.title,
      kind: parsed.kind,
      format: parsed.kind === 'paste' ? 'txt' : 'note',
      byteSize: Buffer.byteLength(text, 'utf8'),
    })

    await processSource({
      sourceId: source.id,
      caseId: parsed.caseId,
      organizationId: session.organization.id,
      text,
    })

    await recordAudit({
      organizationId: session.organization.id,
      caseId: parsed.caseId,
      profileId: session.profile.id,
      action: 'source.added',
      targetType: 'source',
      targetId: source.id,
      detail: { summary: `Added ${parsed.kind === 'paste' ? 'pasted text' : 'note'} “${parsed.title}”` },
    })

    revalidatePath(`/app/cases/${parsed.caseId}`, 'layout')
    return { sourceId: source.id }
  })
}

const urlSchema = z.object({
  caseId: z.string().uuid(),
  url: z.string().trim().min(4, 'Enter a webpage address.'),
  title: z.string().trim().max(160).optional(),
})

export async function addUrlSource(input: z.infer<typeof urlSchema>): Promise<ActionResult<{ sourceId: string }>> {
  return actionResult(async () => {
    const parsed = urlSchema.parse(input)
    const { session } = await requireCaseAccess(parsed.caseId, { write: true })
    check('urlFetch', session.profile.id)
    await assertWithinLimit(session.organization.id, 'processed_pages')

    const page = await fetchPublicPage(parsed.url)
    const source = await createSourceRecord({
      caseId: parsed.caseId,
      title: (parsed.title || page.title || page.finalUrl).slice(0, 160),
      kind: 'url',
      format: 'html',
      sourceUrl: page.finalUrl,
      mimeType: page.contentType,
      byteSize: Buffer.byteLength(page.html, 'utf8'),
    })

    await processSource({
      sourceId: source.id,
      caseId: parsed.caseId,
      organizationId: session.organization.id,
      html: page.html,
    })

    await recordAudit({
      organizationId: session.organization.id,
      caseId: parsed.caseId,
      profileId: session.profile.id,
      action: 'source.added',
      targetType: 'source',
      targetId: source.id,
      detail: { summary: `Imported webpage ${page.finalUrl}` },
    })

    revalidatePath(`/app/cases/${parsed.caseId}`, 'layout')
    return { sourceId: source.id }
  })
}

export async function retrySource(sourceId: string): Promise<ActionResult<{ status: string }>> {
  return actionResult(async () => {
    const { session, source } = await requireSourceAccess(sourceId, { write: true })
    check('upload', session.profile.id)

    let buffer: Buffer | undefined
    let text: string | undefined

    if (source.storageKey) {
      const stored = await getObject(source.storageKey)
      if (!stored) throw new Error('The stored file for this source is no longer available. Re-upload the record.')
      buffer = stored
    } else if (source.sourceUrl) {
      // Webpages are re-fetched so a retry picks up the current page.
      const page = await fetchPublicPage(source.sourceUrl)
      const result = await processSource({
        sourceId: source.id,
        caseId: source.caseId,
        organizationId: session.organization.id,
        html: page.html,
      })
      revalidatePath(`/app/cases/${source.caseId}`, 'layout')
      return { status: result.status }
    } else {
      // Notes and pasted text live only in the chunk table; reassemble them.
      const db = await getDb()
      const existing = await db
        .select({ text: sourceChunks.text })
        .from(sourceChunks)
        .where(eq(sourceChunks.sourceId, source.id))
        .orderBy(sourceChunks.chunkIndex)
      text = existing.map((c) => c.text).join('\n\n')
      if (!text.trim()) throw new Error('There is no stored content to reprocess for this note.')
    }

    const result = await processSource({
      sourceId: source.id,
      caseId: source.caseId,
      organizationId: session.organization.id,
      buffer,
      text,
    })

    revalidatePath(`/app/cases/${source.caseId}`, 'layout')
    return { status: result.status }
  })
}

const renameSchema = z.object({
  sourceId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
})

export async function renameSource(input: z.infer<typeof renameSchema>): Promise<ActionResult<null>> {
  return actionResult(async () => {
    const parsed = renameSchema.parse(input)
    const { source } = await requireSourceAccess(parsed.sourceId, { write: true })
    const db = await getDb()
    await db.update(sources).set({ title: parsed.title, updatedAt: new Date() }).where(eq(sources.id, parsed.sourceId))
    revalidatePath(`/app/cases/${source.caseId}`, 'layout')
    return null
  })
}

export async function setSourceShared(sourceId: string, included: boolean): Promise<ActionResult<null>> {
  return actionResult(async () => {
    const { session, source } = await requireSourceAccess(sourceId, { write: true })
    const db = await getDb()
    await db.update(sources).set({ includedInShare: included, updatedAt: new Date() }).where(eq(sources.id, sourceId))
    await recordAudit({
      organizationId: session.organization.id,
      caseId: source.caseId,
      profileId: session.profile.id,
      action: included ? 'share.source_included' : 'share.source_excluded',
      targetType: 'source',
      targetId: sourceId,
      detail: { summary: `${included ? 'Included' : 'Excluded'} ${source.label} in the public evidence room` },
    })
    revalidatePath(`/app/cases/${source.caseId}`, 'layout')
    return null
  })
}

export async function deleteSource(sourceId: string): Promise<ActionResult<null>> {
  return actionResult(async () => {
    const { session, source } = await requireSourceAccess(sourceId, { write: true })
    const db = await getDb()

    if (source.storageKey) await deleteObject(source.storageKey).catch(() => undefined)
    await db.delete(sources).where(eq(sources.id, sourceId))

    await recordAudit({
      organizationId: session.organization.id,
      caseId: source.caseId,
      profileId: session.profile.id,
      action: 'source.deleted',
      targetType: 'source',
      targetId: sourceId,
      detail: { summary: `Deleted source ${source.label} “${source.title}” and every citation to it` },
    })

    revalidatePath(`/app/cases/${source.caseId}`, 'layout')
    return null
  })
}

/** Reorders the source rail; ordering drives citation label display order. */
export async function reorderSources(caseId: string, orderedIds: string[]): Promise<ActionResult<null>> {
  return actionResult(async () => {
    await requireCaseAccess(caseId, { write: true })
    const db = await getDb()
    await Promise.all(
      orderedIds.map((id, index) =>
        db
          .update(sources)
          .set({ sortOrder: index })
          .where(and(eq(sources.id, id), eq(sources.caseId, caseId))),
      ),
    )
    revalidatePath(`/app/cases/${caseId}`, 'layout')
    return null
  })
}
