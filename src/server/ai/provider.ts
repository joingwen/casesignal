import 'server-only'

import type { z } from 'zod'
import { capabilities, env } from '@/lib/env'
import { AnalysisError } from '@/server/auth/errors'
import type { AnalysisOperation } from '@/lib/domain'
import { recordAnalysisRun } from './ledger'

/**
 * Central AI provider configuration.
 *
 * CaseSignal is provider-agnostic. OpenAI and Anthropic are both first-class,
 * selected purely by which key is present, and the model is always read from the
 * environment — never hardcoded anywhere else in the codebase. When neither is
 * configured the application does not degrade to fake output: each analysis
 * service has a deterministic local implementation that reads the actual source
 * text, and every result is labelled with the provider that produced it.
 *
 * Adding a provider means implementing `complete`, `stream` and `describeImage`
 * below; nothing downstream changes.
 */

export type AiProvider = 'openai' | 'anthropic' | 'local'

/** Defaults used only when the corresponding *_MODEL variable is unset. */
const DEFAULT_MODELS = {
  openai: 'gpt-4.1',
  anthropic: 'claude-sonnet-5',
} as const

/**
 * Approximate per-million-token pricing, used only for the usage ledger. These
 * are estimates for cost visibility, not billing figures.
 */
const COST_PER_MTOK: Record<'openai' | 'anthropic', { input: number; output: number }> = {
  openai: { input: 2, output: 8 },
  anthropic: { input: 3, output: 15 },
}

/** OpenAI is preferred when both are configured, matching the documented setup. */
export function activeProvider(): AiProvider {
  if (capabilities.openai) return 'openai'
  if (capabilities.anthropic) return 'anthropic'
  return 'local'
}

export function activeModel(): string {
  const provider = activeProvider()
  if (provider === 'openai') return env.OPENAI_MODEL ?? DEFAULT_MODELS.openai
  if (provider === 'anthropic') return env.ANTHROPIC_MODEL ?? DEFAULT_MODELS.anthropic
  return 'local-deterministic'
}

export function providerName(): AiProvider {
  return activeProvider()
}

export interface Usage {
  inputTokens: number
  outputTokens: number
}

export interface CompletionRequest {
  system: string
  prompt: string
  maxTokens?: number
  temperature?: number
  /** Ask the provider for a JSON object rather than prose. */
  json?: boolean
}

/* ------------------------------------------------------------------ clients */

let openaiPromise: Promise<import('openai').default> | null = null
let anthropicPromise: Promise<import('@anthropic-ai/sdk').default> | null = null

async function openaiClient() {
  if (!openaiPromise) {
    openaiPromise = import('openai').then((mod) => new mod.default({ apiKey: env.OPENAI_API_KEY, maxRetries: 2 }))
  }
  return openaiPromise
}

async function anthropicClient() {
  if (!anthropicPromise) {
    anthropicPromise = import('@anthropic-ai/sdk').then(
      (mod) => new mod.default({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 }),
    )
  }
  return anthropicPromise
}

/* --------------------------------------------------------------- completion */

export async function complete(request: CompletionRequest): Promise<{ text: string; usage: Usage }> {
  const provider = activeProvider()
  if (provider === 'local') throw new AnalysisError('No AI provider is configured.')

  if (provider === 'openai') {
    const client = await openaiClient()
    const response = await client.chat.completions.create({
      model: activeModel(),
      temperature: request.temperature ?? 0,
      max_completion_tokens: request.maxTokens ?? 2048,
      ...(request.json ? { response_format: { type: 'json_object' as const } } : {}),
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.prompt },
      ],
    })
    return {
      text: response.choices[0]?.message?.content ?? '',
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    }
  }

  const client = await anthropicClient()
  const response = await client.messages.create({
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

/** Streams assistant text deltas. */
export async function* streamCompletion(
  request: CompletionRequest,
): AsyncGenerator<{ type: 'delta'; text: string } | { type: 'done'; usage: Usage }> {
  const provider = activeProvider()
  if (provider === 'local') throw new AnalysisError('No AI provider is configured.')

  if (provider === 'openai') {
    const client = await openaiClient()
    const stream = await client.chat.completions.create({
      model: activeModel(),
      temperature: request.temperature ?? 0,
      max_completion_tokens: request.maxTokens ?? 2048,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.prompt },
      ],
    })
    const usage: Usage = { inputTokens: 0, outputTokens: 0 }
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) yield { type: 'delta', text: delta }
      if (chunk.usage) {
        usage.inputTokens = chunk.usage.prompt_tokens ?? 0
        usage.outputTokens = chunk.usage.completion_tokens ?? 0
      }
    }
    yield { type: 'done', usage }
    return
  }

  const client = await anthropicClient()
  const stream = client.messages.stream({
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

/* ------------------------------------------------------------------- vision */

/**
 * Transcribes a document image. Both providers accept a base64 data URL; the
 * caller supplies the instruction so transcription rules stay in one place.
 */
export async function describeImage(input: {
  buffer: Buffer
  mimeType: string
  system: string
  prompt: string
  maxTokens?: number
}): Promise<{ text: string; usage: Usage }> {
  const provider = activeProvider()
  if (provider === 'local') throw new AnalysisError('No AI provider is configured.')

  const media = ['image/png', 'image/jpeg', 'image/webp'].includes(input.mimeType) ? input.mimeType : 'image/png'
  const base64 = input.buffer.toString('base64')

  if (provider === 'openai') {
    const client = await openaiClient()
    const response = await client.chat.completions.create({
      model: activeModel(),
      temperature: 0,
      max_completion_tokens: input.maxTokens ?? 3000,
      messages: [
        { role: 'system', content: input.system },
        {
          role: 'user',
          content: [
            { type: 'text', text: input.prompt },
            { type: 'image_url', image_url: { url: `data:${media};base64,${base64}` } },
          ],
        },
      ],
    })
    return {
      text: response.choices[0]?.message?.content ?? '',
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    }
  }

  const client = await anthropicClient()
  const response = await client.messages.create({
    model: activeModel(),
    max_tokens: input.maxTokens ?? 3000,
    temperature: 0,
    system: input.system,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: media as 'image/png', data: base64 } },
          { type: 'text', text: input.prompt },
        ],
      },
    ],
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

/* --------------------------------------------------------------- structured */

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
  const provider = activeProvider()
  if (provider === 'local') throw new AnalysisError('No AI provider is configured.')

  const instruction = `${request.prompt}\n\nReturn ONLY a JSON object matching this shape. No prose, no markdown fence.\n${request.schemaHint}`

  try {
    let attempt = await complete({
      system: request.system,
      prompt: instruction,
      maxTokens: request.maxTokens ?? 4096,
      json: true,
    })
    total.inputTokens += attempt.usage.inputTokens
    total.outputTokens += attempt.usage.outputTokens

    let parsed = tryParse(request.schema, attempt.text)
    if (!parsed.ok) {
      const repair = await complete({
        system: request.system,
        prompt: `Your previous response did not satisfy the required JSON shape.\n\nPrevious response:\n${attempt.text.slice(0, 4000)}\n\nValidation errors:\n${parsed.errors}\n\nReturn ONLY corrected JSON matching:\n${request.schemaHint}`,
        maxTokens: request.maxTokens ?? 4096,
        json: true,
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
        provider,
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
      provider,
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
      provider,
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

export function estimateCostUsd(usage: Usage, provider: AiProvider = activeProvider()): number {
  if (provider === 'local') return 0
  const rate = COST_PER_MTOK[provider]
  return (usage.inputTokens / 1_000_000) * rate.input + (usage.outputTokens / 1_000_000) * rate.output
}

/** Rough token estimate used for budgeting retrieval context. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
