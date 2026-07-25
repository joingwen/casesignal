import { env } from './env'

/**
 * Social presence.
 *
 * The X account is a brand fact, not optional configuration, so it is declared
 * here with a real default rather than being gated behind an environment
 * variable that could silently blank the link out. `NEXT_PUBLIC_SOCIAL_X`
 * remains an override for forks and preview deployments.
 */
export const X_URL = env.NEXT_PUBLIC_SOCIAL_X ?? 'https://x.com/KevinMoncla'

/** `@handle`, derived from the URL so the two can never drift apart. */
export const X_HANDLE = `@${X_URL.replace(/\/+$/, '').split('/').pop() ?? 'CaseSignal'}`

/** Bare handle, for metadata fields that add their own `@`. */
export const X_HANDLE_BARE = X_HANDLE.replace(/^@/, '')
