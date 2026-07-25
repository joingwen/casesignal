import 'server-only'

import { capabilities, env } from '@/lib/env'

/**
 * Optional semantic retrieval via Voyage AI.
 *
 * Embeddings are strictly additive: without VOYAGE_API_KEY every retrieval path
 * still works through Postgres full-text search, and indexing simply stores no
 * vector. Failures here are logged and swallowed so a provider outage can never
 * block source ingestion.
 */

const ENDPOINT = 'https://api.voyageai.com/v1/embeddings'
const DEFAULT_MODEL = 'voyage-3'
const MAX_BATCH = 64

function model() {
  return env.VOYAGE_MODEL ?? DEFAULT_MODEL
}

async function request(input: string[], inputType: 'document' | 'query'): Promise<number[][] | null> {
  if (!capabilities.embeddings || input.length === 0) return null
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({ input, model: model(), input_type: inputType, truncation: true }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) {
      console.warn(`[casesignal] Voyage request failed (${response.status}); continuing with lexical retrieval only.`)
      return null
    }
    const payload = (await response.json()) as { data?: { embedding: number[]; index: number }[] }
    if (!payload.data) return null
    const ordered = [...payload.data].sort((a, b) => a.index - b.index)
    return ordered.map((d) => d.embedding)
  } catch (error) {
    console.warn('[casesignal] Voyage request errored; continuing with lexical retrieval only.', error)
    return null
  }
}

/** Embeds document chunks. Returns null when embeddings are unavailable. */
export async function embedDocuments(texts: string[]): Promise<number[][] | null> {
  if (!capabilities.embeddings) return null
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const batch = texts.slice(i, i + MAX_BATCH).map((t) => t.slice(0, 8000))
    const vectors = await request(batch, 'document')
    if (!vectors) return null
    out.push(...vectors)
  }
  return out
}

export async function embedQuery(text: string): Promise<number[] | null> {
  const vectors = await request([text.slice(0, 4000)], 'query')
  return vectors?.[0] ?? null
}
