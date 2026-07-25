import { requireCaseAccess, recordAudit } from '@/server/auth/guard'
import { AppError, toClientError } from '@/server/auth/errors'
import { check } from '@/server/security/rate-limit'
import { isFeatureAvailable } from '@/server/billing/limits'
import { renderBriefMarkdown } from '@/server/actions/brief'
import { renderBriefPdf } from '@/server/export/pdf'
import { getDb } from '@/server/db'
import { exports as exportsTable } from '@/server/db/schema'
import { NEUTRALITY_DISCLAIMER } from '@/lib/domain'
import { slugify } from '@/lib/utils'

/**
 * Brief PDF export.
 *
 * The dossier is rendered from exactly the Markdown the workspace shows, so a
 * printed brief and an on-screen brief carry the same citations. The plan gate
 * runs before any rendering work is done.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PRO_ONLY = 'PDF dossiers are a Pro feature. Markdown export is available on every plan.'

export async function POST(_request: Request, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await ctx.params
    const { session, caseRecord } = await requireCaseAccess(caseId)

    check('export', session.profile.id)

    if (!(await isFeatureAvailable(session.organization.id, 'pdfExport'))) {
      throw new AppError(PRO_ONLY, { status: 402, code: 'plan_limit' })
    }

    const markdown = await renderBriefMarkdown(caseId)
    const pdf = renderBriefPdf({
      title: caseRecord.title,
      subtitle: caseRecord.description,
      markdown,
      disclaimer: NEUTRALITY_DISCLAIMER,
    })

    const db = await getDb()
    await db.insert(exportsTable).values({
      caseId,
      profileId: session.profile.id,
      format: 'pdf',
      scope: 'brief',
      byteSize: pdf.byteLength,
    })

    await recordAudit({
      organizationId: caseRecord.organizationId,
      caseId,
      profileId: session.profile.id,
      action: 'brief.exported',
      targetType: 'brief',
      targetId: caseId,
      detail: { summary: 'Exported the brief as PDF', byteSize: pdf.byteLength },
    })

    const filename = `${slugify(caseRecord.title) || 'case'}-brief.pdf`

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-length': String(pdf.byteLength),
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': 'private, no-store, max-age=0, must-revalidate',
        'x-content-type-options': 'nosniff',
      },
    })
  } catch (error) {
    const { message, code, status } = toClientError(error)
    return Response.json({ ok: false, error: message, code }, { status })
  }
}
