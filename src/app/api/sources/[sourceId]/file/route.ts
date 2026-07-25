import { requireSourceAccess } from '@/server/auth/guard'
import { toClientError } from '@/server/auth/errors'
import { getObject } from '@/server/storage'
import { sanitizeFilename } from '@/server/ingest/validate'

/**
 * Private file streaming.
 *
 * This is what makes local storage exactly as safe as a signed URL: the
 * organization-membership check runs on *every* request for the bytes, not
 * once when a link is minted. There is no anonymous path to this route, and no
 * durable public URL for any stored record.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function fail(error: unknown) {
  const { message, code, status } = toClientError(error)
  return Response.json({ ok: false, error: message, code }, { status })
}

export async function GET(_request: Request, ctx: { params: Promise<{ sourceId: string }> }) {
  try {
    const { sourceId } = await ctx.params
    const { source } = await requireSourceAccess(sourceId)

    if (!source.storageKey) {
      return Response.json(
        { ok: false, error: 'This source has no stored file.', code: 'not_found' },
        { status: 404 },
      )
    }

    const body = await getObject(source.storageKey)
    if (!body) {
      return Response.json(
        { ok: false, error: 'This file is no longer available in storage.', code: 'not_found' },
        { status: 404 },
      )
    }

    const filename = sanitizeFilename(source.originalFilename ?? source.title ?? 'record')

    return new Response(new Uint8Array(body), {
      status: 200,
      headers: {
        'content-type': source.mimeType || 'application/octet-stream',
        'content-length': String(body.byteLength),
        // The filename is re-sanitized here so no quote or control character
        // can break out of the header value.
        'content-disposition': `inline; filename="${filename.replace(/"/g, '')}"`,
        'cache-control': 'private, no-store, max-age=0, must-revalidate',
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; sandbox",
        'referrer-policy': 'no-referrer',
      },
    })
  } catch (error) {
    return fail(error)
  }
}
