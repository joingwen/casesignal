import 'server-only'

import crypto from 'node:crypto'
import { env } from '@/lib/env'
import { RateLimitError } from '@/server/auth/errors'

/**
 * In-process sliding-window rate limiting for the endpoints that cost money or
 * touch the network: AI calls, uploads and URL ingestion.
 *
 * A single-instance limiter is the right trade-off here — it bounds abuse from
 * any one session without adding an external dependency. A deployment running
 * multiple instances should point `check` at a shared store; the interface is
 * deliberately narrow so that swap is a one-file change.
 */

interface Window {
  hits: number[]
}

const windows = new Map<string, Window>()
let lastSweep = Date.now()

export const RATE_LIMITS = {
  ai: { limit: 30, windowMs: 60_000, label: 'analysis requests' },
  upload: { limit: 40, windowMs: 60_000, label: 'uploads' },
  urlFetch: { limit: 10, windowMs: 60_000, label: 'webpage imports' },
  export: { limit: 12, windowMs: 60_000, label: 'exports' },
  share: { limit: 20, windowMs: 60_000, label: 'share updates' },
  publicShare: { limit: 60, windowMs: 60_000, label: 'requests' },
} as const

export type RateLimitKind = keyof typeof RATE_LIMITS

export function check(kind: RateLimitKind, identifier: string) {
  const config = RATE_LIMITS[kind]
  const now = Date.now()

  if (now - lastSweep > 120_000) {
    for (const [key, window] of windows) {
      if (window.hits.every((t) => now - t > 300_000)) windows.delete(key)
    }
    lastSweep = now
  }

  const key = `${kind}:${identifier}`
  const window = windows.get(key) ?? { hits: [] }
  window.hits = window.hits.filter((t) => now - t < config.windowMs)

  if (window.hits.length >= config.limit) {
    const oldest = window.hits[0] ?? now
    const retryAfter = Math.max(1, Math.ceil((config.windowMs - (now - oldest)) / 1000))
    windows.set(key, window)
    throw new RateLimitError(retryAfter)
  }

  window.hits.push(now)
  windows.set(key, window)
}

/** Stable pseudonymous identifier for audit logs — the raw IP is never stored. */
export function hashIdentifier(value: string): string {
  const secret = env.RATE_LIMIT_SECRET ?? 'casesignal-local-development-salt'
  return crypto.createHmac('sha256', secret).update(value).digest('hex').slice(0, 32)
}

export function clientIdentifier(headers: Headers, fallback: string): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const real = headers.get('x-real-ip')?.trim()
  return hashIdentifier(forwarded || real || fallback)
}

/** Test-only reset so limiter state cannot leak between test cases. */
export function __resetRateLimits() {
  windows.clear()
}
