/**
 * Error types that are safe to surface to a client. Anything not in this file
 * is reported to the user as a generic message and logged server-side only —
 * internal stack traces and provider errors never reach the browser.
 */

export class AppError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, options: { status?: number; code?: string } = {}) {
    super(message)
    this.name = 'AppError'
    this.status = options.status ?? 400
    this.code = options.code ?? 'bad_request'
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You do not have access to this case.') {
    super(message, { status: 403, code: 'forbidden' })
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found.') {
    super(message, { status: 404, code: 'not_found' })
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends AppError {
  readonly fields: Record<string, string>

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message, { status: 422, code: 'invalid' })
    this.name = 'ValidationError'
    this.fields = fields
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number

  constructor(retryAfterSeconds: number) {
    super(`Too many requests. Try again in ${retryAfterSeconds} seconds.`, { status: 429, code: 'rate_limited' })
    this.name = 'RateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export class PlanLimitError extends AppError {
  readonly metric: string
  readonly limit: number
  readonly used: number

  constructor(input: { metric: string; limit: number; used: number; message: string }) {
    super(input.message, { status: 402, code: 'plan_limit' })
    this.name = 'PlanLimitError'
    this.metric = input.metric
    this.limit = input.limit
    this.used = input.used
  }
}

export class AnalysisError extends AppError {
  constructor(message: string) {
    super(message, { status: 502, code: 'analysis_failed' })
    this.name = 'AnalysisError'
  }
}

/** Converts any thrown value into a payload that is safe to return to a client. */
export function toClientError(error: unknown): { message: string; code: string; status: number } {
  if (error instanceof AppError) {
    return { message: error.message, code: error.code, status: error.status }
  }
  if (process.env.NODE_ENV !== 'production') {
    console.error('[casesignal] unhandled error', error)
  }
  return { message: 'Something went wrong on our side. Please try again.', code: 'internal', status: 500 }
}
