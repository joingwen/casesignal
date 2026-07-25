import 'server-only'

import type { z } from 'zod'
import { capabilities, env } from '@/lib/env'
import { AnalysisError } from '@/server/auth/errors'
import type { AnalysisOperation } from '@/lib/domain'
import { recordAnalysisRun } from './ledger'

/**
 * Central AI provider configuration.
 *
 * The model is read from ANTHROPIC_MODEL at call time and is never hardcoded
 * anywhere else in the codebase. When no API key is configured the application
 * does not degrade to fake output: each analysis service has a deterministic
 * local implementation that reads the actual source text, and every result is
 * labelled with the provider that produced it.
 */

/** Fallback used only when ANTHROPIC_MODEL is unset. Declared once. */
const DEFAULT_MODEL = 'claude-sonnet-5'

export function activeModel(): string {
  return env.ANTHROPIC_MODEL ?? DEFAULT_MODEL
}

export function providerName(): 'anthropic' | 'local' {
  return capabilities.anthropic ? 'anthropic' : 'local'
}

/** Approximate per-million-token pricing, used only for the usage ledger. */
const COST_PER_MTOK = { input: 3, output: 15 }

export interface Usage {
  inputTokens: number
  outputTokens: number
}

export interface CompletionRequest {
  system: string
  prompt: string
  maxTokens?: number
  temperature?: number
}

let clientPromise: Promise<import('@anthropic-ai/sdk').default> | null = null

async function client() {
  if (!capabilities.anthropic) throw new AnalysisError('Anthropic is not configured.')
  if (!clientPromise) {
    clientPromise = import('@anthropic-ai/sdk').then(
      (mod) => new mod.default({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 }),
    )
  }
  return clientPromise
}

export async function complete(request: CompletionRequest): Promise<{ text: string; usage: Usage }> {
  const anthropic = await client()
  const response = await anthropic.messages.create({
    model: activeModel(),
    max_tokens: request.maxTokens ?? 2048,
    temperature: request.temperature ?? 0,
    system: request.system,
    messages: [{ role: 'user', content: request.prompt }],
  })
  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => ('text' in block ? block.text : ''))
    .join('\n')
  return {
    text,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  }
}

/** Streams assistant text deltas. Falls back to a single chunk when unavailable. */
export async function* streamCompletion(
  request: CompletionRequest,
): AsyncGenerator<{ type: 'delta'; text: string } | { type: 'done'; usage: Usage }> {
  const anthropic = await client()
  const stream = anthropic.messages.stream({
    model: activeModel(),
    max_tokens: request.maxTokens ?? 2048,
    temperature: request.temperature ?? 0,
    system: request.system,
    messages: [{ role: 'user', content: request.prompt }],
  })
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield { type: 'delta', text: event.delta.text }
    }
  }
  const final = await stream.finalMessage()
  yield {
    type: 'done',
    usage: { inputTokens: final.usage.input_tokens, outputTokens: final.usage.output_tokens },
  }
}

export interface StructuredRequest<T extends z.ZodTypeAny> {
  operation: AnalysisOperation
  caseId?: string | null
  sourceId?: string | null
  system: string
  prompt: string
  schema: T
  /** Shape description injected into the prompt so the model knows the contract. */
  schemaHint: string
  maxTokens?: number
}

/**
 * Requests JSON matching a Zod schema.
 *
 * On a validation failure the model is given exactly one repair attempt with
 * the validation errors quoted back. If it still fails we record an analysis
 * error and throw — we never insert partially-parsed or invented data.
 */
export async function structured<T extends z.ZodTypeAny>(
  request: StructuredRequest<T>,
): Promise<{ data: z.infer<T>; usage: Usage }> {
  const started = Date.now()
  const total: Usage = { inputTokens: 0, outputTokens: 0 }

  const instruction = `${request.prompt}\n\nReturn ONLY a JSON object matching this shape. No prose, no markdown fence.\n${request.schemaHint}`

  try {
    let attempt = await complete({ system: request.system, prompt: instruction, maxTokens: request.maxTokens ?? 4096 })
    total.inputTokens += attempt.usage.inputTokens
    total.outputTokens += attempt.usage.outputTokens

    let parsed = tryParse(request.schema, attempt.text)
    if (!parsed.ok) {
      const repair = await complete({
        system: request.system,
        prompt: `Your previous response did not satisfy the required JSON shape.\n\nPrevious response:\n${attempt.text.slice(0, 4000)}\n\nValidation errors:\n${parsed.errors}\n\nReturn ONLY corrected JSON matching:\n${request.schemaHint}`,
        maxTokens: request.maxTokens ?? 4096,
      })
      total.inputTokens += repair.usage.inputTokens
      total.outputTokens += repair.usage.outputTokens
      attempt = repair
      parsed = tryParse(request.schema, repair.text)
    }

    if (!parsed.ok) {
      await recordAnalysisRun({
        caseId: request.caseId ?? null,
        sourceId: request.sourceId ?? null,
        operation: request.operation,
        status: 'failed',
        provider: 'anthropic',
        model: activeModel(),
        usage: total,
        durationMs: Date.now() - started,
        error: `Structured output failed validation after one repair attempt: ${parsed.errors}`,
      })
      throw new AnalysisError(
        'The model returned a response that did not match the expected structure. Nothing was saved — try running the analysis again.',
      )
    }

    await recordAnalysisRun({
      caseId: request.caseId ?? null,
      sourceId: request.sourceId ?? null,
      operation: request.operation,
      status: 'complete',
      provider: 'anthropic',
      model: activeModel(),
      usage: total,
      durationMs: Date.now() - started,
    })

    return { data: parsed.value, usage: total }
  } catch (error) {
    if (error instanceof AnalysisError) throw error
    await recordAnalysisRun({
      caseId: request.caseId ?? null,
      sourceId: request.sourceId ?? null,
      operation: request.operation,
      status: 'failed',
      provider: 'anthropic',
      model: activeModel(),
      usage: total,
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : 'Unknown provider error',
    })
    throw new AnalysisError('The analysis provider could not be reached. Your sources are unchanged.')
  }
}

function tryParse<T extends z.ZodTypeAny>(
  schema: T,
  raw: string,
): { ok: true; value: z.infer<T> } | { ok: false; errors: string } {
  const json = extractJson(raw)
  if (!json) return { ok: false, errors: 'No JSON object was present in the response.' }
  let candidate: unknown
  try {
    candidate = JSON.parse(json)
  } catch (error) {
    return { ok: false, errors: `Response was not valid JSON: ${(error as Error).message}` }
  }
  const result = schema.safeParse(candidate)
  if (result.success) return { ok: true, value: result.data }
  return {
    ok: false,
    errors: result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; '),
  }
}

/** Pulls the outermost JSON object out of a response, tolerating code fences. */
export function extractJson(raw: string): string | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const text = (fenced?.[1] ?? raw).trim()
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') inString = !inString
    if (inString) continue
    if (ch === '{') depth += 1
    if (ch === '}') {
      depth -= 1
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

export function estimateCostUsd(usage: Usage): number {
  return (usage.inputTokens / 1_000_000) * COST_PER_MTOK.input + (usage.outputTokens / 1_000_000) * COST_PER_MTOK.output
}

/** Rough token estimate used for budgeting retrieval context. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
