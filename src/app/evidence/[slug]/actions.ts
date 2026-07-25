'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { and, eq, isNull } from 'drizzle-orm'

import { getDb } from '@/server/db'
import { publicShares } from '@/server/db/schema'
import { verifySharePassword } from '@/server/share/password'
import { check, clientIdentifier } from '@/server/security/rate-limit'
import { RateLimitError } from '@/server/auth/errors'
import { buildShareCookie, isShareSlug } from './share-session'

/**
 * The password gate for a protected evidence room.
 *
 * Every failure returns the same message: the form never distinguishes between
 * a room that does not exist, one that has been revoked and a wrong password,
 * so the endpoint cannot be used to enumerate share links.
 */

export interface ShareGateState {
  error: string | null
}

const GENERIC_FAILURE = 'That password does not match this evidence room.'

export async function unlockShare(_previous: ShareGateState, formData: FormData): Promise<ShareGateState> {
  const slug = formData.get('slug')
  const password = formData.get('password')

  if (!isShareSlug(slug)) return { error: GENERIC_FAILURE }
  if (typeof password !== 'string' || password.length === 0) {
    return { error: 'Enter the password you were given.' }
  }
  if (password.length > 200) return { error: GENERIC_FAILURE }

  try {
    check('publicShare', clientIdentifier(await headers(), slug))
  } catch (error) {
    if (error instanceof RateLimitError) return { error: error.message }
    throw error
  }

  const db = await getDb()
  const rows = await db
    .select({ passwordHash: publicShares.passwordHash, expiresAt: publicShares.expiresAt })
    .from(publicShares)
    .where(and(eq(publicShares.slug, slug), eq(publicShares.enabled, true), isNull(publicShares.revokedAt)))
    .limit(1)

  const share = rows[0]
  if (!share?.passwordHash) return { error: GENERIC_FAILURE }
  if (share.expiresAt && share.expiresAt.getTime() <= Date.now()) return { error: GENERIC_FAILURE }

  let accepted = false
  try {
    accepted = verifySharePassword(password, share.passwordHash)
  } catch {
    accepted = false
  }
  if (!accepted) return { error: GENERIC_FAILURE }

  const cookie = buildShareCookie(slug, share.passwordHash)
  const store = await cookies()
  store.set(cookie.name, cookie.value, cookie.options)

  redirect(`/evidence/${slug}`)
}
