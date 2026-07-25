import { ZodError } from 'zod'
import { toClientError } from '@/server/auth/errors'

/**
 * Uniform server-action envelope.
 *
 * Actions never throw across the boundary: they return a discriminated result
 * so client components can render a precise message, and internal details are
 * stripped by `toClientError` before anything reaches the browser.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string; fields?: Record<string, string> }

export async function actionResult<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (error) {
    if (error instanceof ZodError) {
      const fields: Record<string, string> = {}
      for (const issue of error.issues) {
        const key = issue.path.join('.') || 'form'
        if (!fields[key]) fields[key] = issue.message
      }
      return {
        ok: false,
        error: error.issues[0]?.message ?? 'Please check the highlighted fields.',
        code: 'invalid',
        fields,
      }
    }
    const client = toClientError(error)
    return { ok: false, error: client.message, code: client.code }
  }
}
