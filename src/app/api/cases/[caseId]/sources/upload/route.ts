import { requireCaseAccess, recordAudit } from '@/server/auth/guard'
import { ValidationError, toClientError } from '@/server/auth/errors'
import { check } from '@/server/security/rate-limit'
import { assertWithinLimit } from '@/server/billing/limits'
import { validateUpload } from '@/server/ingest/validate'
import { createSourceRecord, processSource } from '@/server/ingest/pipeline'
import { buildStorageKey, putObject } from '@/server/storage'
import { MAX_UPLOAD_BYTES } from '@/lib/domain'

/**
 * Source upload.
 *
 * Authorization runs before anything is read from the request body, and the
 * declared size is rejected before the file is buffered into memory, so an
 * oversized or unauthorized upload never costs more than the headers.
 *
 * The order below is deliberate and is the same order the ingest contract
 * documents: access → rate limit → validate → plan limit → store → record →
 * process → audit. Nothing downstream re-checks the filename or MIME type.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Multipart framing adds boundary and header bytes around the file itself. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024

function fail(error: unknown) {
  const { message, code, status } = toClientError(error)
  return Response.json({ ok: false, error: message, code }, { status })
}

export async function POST(request: Request, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await ctx.params
    const { session, caseRecord } = await requireCaseAccess(caseId, { write: true })

    check('upload', session.profile.id)

    // Refuse an oversized body before `formData()` pulls it into memory.
    const declaredLength = Number(request.headers.get('content-length') ?? '')
    if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES) {
      throw new ValidationError(
        `This upload is larger than the ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB maximum. Split the record or upload a smaller export.`,
        { file: 'too_large' },
      )
    }

    let form: FormData
    try {
      form = await request.formData()
    } catch {
      throw new ValidationError('This upload could not be read. Try again, or add the text directly as a note.', {
        file: 'unreadable',
      })
    }

    const file = form.get('file')
    if (!(file instanceof File)) {
      throw new ValidationError('Attach a file to upload.', { file: 'missing' })
    }

    const validated = validateUpload({
      filename: file.name,
      mimeType: file.type,
      byteSize: file.size,
    })

    const titleField = form.get('title')
    const title =
      typeof titleField === 'string' && titleField.trim() ? titleField.trim().slice(0, 200) : validated.safeFilename

    await assertWithinLimit(session.organization.id, 'processed_pages')

    const buffer = Buffer.from(await file.arrayBuffer())
    // The stream can disagree with the declared size; the stored bytes decide.
    if (buffer.byteLength !== validated.byteSize) {
      validateUpload({ filename: file.name, mimeType: file.type, byteSize: buffer.byteLength })
    }

    const storageKey = buildStorageKey({ caseId, filename: validated.safeFilename })
    await putObject(storageKey, buffer, validated.mimeType)

    const source = await createSourceRecord({
      caseId,
      title,
      kind: 'file',
      format: validated.format,
      originalFilename: validated.safeFilename,
      mimeType: validated.mimeType,
      byteSize: buffer.byteLength,
      storageKey,
    })

    const result = await processSource({
      sourceId: source.id,
      caseId,
      organizationId: caseRecord.organizationId,
      buffer,
    })

    await recordAudit({
      organizationId: caseRecord.organizationId,
      caseId,
      profileId: session.profile.id,
      action: 'source.uploaded',
      targetType: 'source',
      targetId: source.id,
      detail: {
        summary: `Uploaded ${source.label} — ${title}`,
        format: validated.format,
        byteSize: buffer.byteLength,
        status: result.status,
      },
    })

    return Response.json(
      {
        ok: true,
        source: {
          id: source.id,
          label: source.label,
          title: source.title,
          status: result.status,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    return fail(error)
  }
}
