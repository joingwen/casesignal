import 'server-only'

import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { env, isProduction } from '@/lib/env'

/**
 * Evidence-room password sessions.
 *
 * Accepting a password grants a short-lived, signed cookie scoped to that one
 * slug. The signature covers the slug, the expiry and the stored password hash,
 * so a cookie cannot be moved to another room and rotating the password
 * immediately invalidates every session issued under the old one. Nothing about
 * the case is stored in the cookie.
 */

const TTL_SECONDS = 60 * 60 * 2

export function shareCookieName(slug: string): string {
  return `cs_share_${slug}`
}

function secret(): string {
  return env.RATE_LIMIT_SECRET ?? 'casesignal-local-development-salt'
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
}

export interface ShareCookie {
  name: string
  value: string
  options: {
    httpOnly: true
    sameSite: 'lax'
    secure: boolean
    path: string
    maxAge: number
  }
}

export function buildShareCookie(slug: string, passwordHash: string): ShareCookie {
  const expires = Math.floor(Date.now() / 1000) + TTL_SECONDS
  return {
    name: shareCookieName(slug),
    value: `${expires}.${sign(`${slug}.${expires}.${passwordHash}`)}`,
    options: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: `/evidence/${slug}`,
      maxAge: TTL_SECONDS,
    },
  }
}

/**
 * Validates a token against the slug and the *current* password hash. Exported
 * so the rule can be exercised directly, without a request context.
 */
export function verifyShareToken(token: string | undefined, slug: string, passwordHash: string): boolean {
  if (!token) return false
  const separator = token.indexOf('.')
  if (separator <= 0) return false

  const expires = Number(token.slice(0, separator))
  const provided = token.slice(separator + 1)
  if (!Number.isFinite(expires) || expires * 1000 < Date.now()) return false

  const expected = sign(`${slug}.${expires}.${passwordHash}`)
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/** True when this visitor has already entered the current password. */
export async function hasShareAccess(slug: string, passwordHash: string | null): Promise<boolean> {
  if (!passwordHash) return true
  const store = await cookies()
  return verifyShareToken(store.get(shareCookieName(slug))?.value, slug, passwordHash)
}

/** Slugs are server-generated and always slug-safe; anything else is refused. */
export function isShareSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 3 && value.length <= 80 && /^[a-z0-9-]+$/.test(value)
}
