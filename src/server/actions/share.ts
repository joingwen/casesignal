'use server'

import crypto from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, isNull, ne } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '@/server/db'
import { publicShares } from '@/server/db/schema'
import { requireCaseAccess, recordAudit } from '@/server/auth/guard'
import { assertWithinLimit } from '@/server/billing/limits'
import { check } from '@/server/security/rate-limit'
import { appUrl } from '@/lib/env'
import { hashSharePassword } from '@/server/share/password'
import { slugify } from '@/lib/utils'
import { actionResult, type ActionResult } from './result'

/**
 * Public evidence rooms.
 *
 * Nothing is public by default. A share link exposes only items an analyst has
 * explicitly marked for inclusion, and the link itself is disabled until it is
 * turned on. Passwords are stored as a salted scrypt hash and compared in
 * constant time.
 */

const shareSchema = z.object({
  caseId: z.string().uuid(),
  enabled: z.boolean().optional(),
  slug: z.string().trim().max(60).optional(),
  password: z.string().trim().max(200).nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  showSources: z.boolean().optional(),
  showAnalystNotes: z.boolean().optional(),
  allowDownloads: z.boolean().optional(),
  showTimeline: z.boolean().optional(),
  showClaims: z.boolean().optional(),
  showDiscrepancies: z.boolean().optional(),
})

export async function upsertShare(input: z.infer<typeof shareSchema>): Promise<ActionResult<{ slug: string; url: string; enabled: boolean }>> {
  return actionResult(async () => {
    const parsed = shareSchema.parse(input)
    const { session, caseRecord } = await requireCaseAccess(parsed.caseId, { write: true })
    check('share', session.profile.id)

    const db = await getDb()
    const existingRows = await db
      .select()
      .from(publicShares)
      .where(and(eq(publicShares.caseId, parsed.caseId), isNull(publicShares.revokedAt)))
      .limit(1)
    const existing = existingRows[0]

    if (parsed.enabled && !existing?.enabled) {
      await assertWithinLimit(session.organization.id, 'public_shares')
    }

    let slug = existing?.slug ?? ''
    if (parsed.slug !== undefined && parsed.slug.trim()) {
      const candidate = slugify(parsed.slug)
      if (candidate.length < 4) throw new Error('Choose a link name of at least 4 characters.')
      const clash = await db
        .select({ id: publicShares.id })
        .from(publicShares)
        .where(and(eq(publicShares.slug, candidate), existing ? ne(publicShares.id, existing.id) : undefined))
        .limit(1)
      if (clash[0]) throw new Error('That link name is already taken. Try another.')
      slug = candidate
    }
    if (!slug) slug = `${slugify(caseRecord.title).slice(0, 40) || 'case'}-${crypto.randomBytes(3).toString('hex')}`

    const passwordHash =
      parsed.password === undefined
        ? (existing?.passwordHash ?? null)
        : parsed.password === null || parsed.password === ''
          ? null
          : hashSharePassword(parsed.password)

    const expiresAt = parsed.expiresAt === undefined ? (existing?.expiresAt ?? null) : parsed.expiresAt ? new Date(parsed.expiresAt) : null
    if (expiresAt && Number.isNaN(expiresAt.getTime())) throw new Error('That expiry date is not valid.')

    const values = {
      caseId: parsed.caseId,
      slug,
      enabled: parsed.enabled ?? existing?.enabled ?? false,
      passwordHash,
      expiresAt,
      showSources: parsed.showSources ?? existing?.showSources ?? true,
      showAnalystNotes: parsed.showAnalystNotes ?? existing?.showAnalystNotes ?? false,
      allowDownloads: parsed.allowDownloads ?? existing?.allowDownloads ?? false,
      showTimeline: parsed.showTimeline ?? existing?.showTimeline ?? true,
      showClaims: parsed.showClaims ?? existing?.showClaims ?? true,
      showDiscrepancies: parsed.showDiscrepancies ?? existing?.showDiscrepancies ?? true,
      createdByProfileId: session.profile.id,
      updatedAt: new Date(),
    }

    if (existing) {
      await db.update(publicShares).set(values).where(eq(publicShares.id, existing.id))
    } else {
      await db.insert(publicShares).values(values)
    }

    await recordAudit({
      organizationId: session.organization.id,
      caseId: parsed.caseId,
      profileId: session.profile.id,
      action: values.enabled ? 'share.enabled' : 'share.updated',
      targetType: 'public_share',
      targetId: slug,
      detail: {
        summary: values.enabled
          ? `Public evidence room enabled at /evidence/${slug}`
          : 'Public evidence room settings updated',
        passwordProtected: Boolean(passwordHash),
      },
    })

    revalidatePath(`/app/cases/${parsed.caseId}`, 'layout')
    return { slug, url: `${appUrl}/evidence/${slug}`, enabled: values.enabled }
  })
}

export async function revokeShare(caseId: string): Promise<ActionResult<null>> {
  return actionResult(async () => {
    const { session } = await requireCaseAccess(caseId, { write: true })
    const db = await getDb()
    await db
      .update(publicShares)
      .set({ enabled: false, revokedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(publicShares.caseId, caseId), isNull(publicShares.revokedAt)))

    await recordAudit({
      organizationId: session.organization.id,
      caseId,
      profileId: session.profile.id,
      action: 'share.revoked',
      targetType: 'public_share',
      targetId: caseId,
      detail: { summary: 'Revoked the public evidence room link' },
    })

    revalidatePath(`/app/cases/${caseId}`, 'layout')
    return null
  })
}
