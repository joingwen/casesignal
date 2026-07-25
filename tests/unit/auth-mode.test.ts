import { describe, expect, it } from 'vitest'

/**
 * Local-auth safety invariant.
 *
 * The local cookie session accepts any email with no password. It is a
 * development convenience, and a production deployment that is missing its
 * Clerk keys must refuse it rather than silently downgrade to it — otherwise a
 * public URL is an open door.
 *
 * `capabilities` is computed once at module load from `process.env`, so the
 * decision is reproduced here rather than re-imported per case. The assertions
 * below are the contract that `src/lib/env.ts` must keep.
 */
function localAuthAllowed(input: {
  publishableKey?: string
  secretKey?: string
  nodeEnv: 'development' | 'test' | 'production'
  allowLocalAuth?: string
}) {
  const clerkAuth = Boolean(input.publishableKey && input.secretKey)
  return !clerkAuth && (input.nodeEnv !== 'production' || input.allowLocalAuth === '1')
}

describe('local authentication is refused in production', () => {
  it('is allowed in development when Clerk is absent', () => {
    expect(localAuthAllowed({ nodeEnv: 'development' })).toBe(true)
  })

  it('is allowed in test when Clerk is absent', () => {
    expect(localAuthAllowed({ nodeEnv: 'test' })).toBe(true)
  })

  it('is REFUSED in production when Clerk is absent', () => {
    expect(localAuthAllowed({ nodeEnv: 'production' })).toBe(false)
  })

  it('is refused in production when only one Clerk key is present', () => {
    expect(localAuthAllowed({ nodeEnv: 'production', publishableKey: 'pk_live_x' })).toBe(false)
    expect(localAuthAllowed({ nodeEnv: 'production', secretKey: 'sk_live_x' })).toBe(false)
  })

  it('is refused in production for any value of ALLOW_LOCAL_AUTH other than an explicit 1', () => {
    for (const value of ['', '0', 'true', 'yes', 'TRUE', ' 1']) {
      expect(localAuthAllowed({ nodeEnv: 'production', allowLocalAuth: value })).toBe(false)
    }
  })

  it('is permitted in production only by a deliberate opt-in', () => {
    expect(localAuthAllowed({ nodeEnv: 'production', allowLocalAuth: '1' })).toBe(true)
  })

  it('is never used when Clerk is configured, in any environment', () => {
    for (const nodeEnv of ['development', 'test', 'production'] as const) {
      expect(localAuthAllowed({ nodeEnv, publishableKey: 'pk_x', secretKey: 'sk_x' })).toBe(false)
      // Even the opt-in must not re-enable it while Clerk is present.
      expect(localAuthAllowed({ nodeEnv, publishableKey: 'pk_x', secretKey: 'sk_x', allowLocalAuth: '1' })).toBe(false)
    }
  })
})
