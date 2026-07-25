import crypto from 'node:crypto'

/**
 * Evidence-room password hashing.
 *
 * Kept out of the `'use server'` action module because a server-action file may
 * only export async functions — and these must stay synchronous so the
 * comparison below can use `timingSafeEqual` without an await boundary.
 *
 * Format: `scrypt$<base64 salt>$<base64 hash>`.
 */

export function hashSharePassword(password: string): string {
  const salt = crypto.randomBytes(16)
  const derived = crypto.scryptSync(password, salt, 32)
  return `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`
}

export function verifySharePassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split('$')
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false
  try {
    const salt = Buffer.from(saltB64, 'base64')
    const expected = Buffer.from(hashB64, 'base64')
    if (expected.length === 0) return false
    const derived = crypto.scryptSync(password, salt, expected.length)
    return crypto.timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}
