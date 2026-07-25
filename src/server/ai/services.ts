import 'server-only'

import { capabilities } from '@/lib/env'
import type { AnalysisOperation } from '@/lib/domain'
import type { RetrievedChunk } from '@/server/retrieval'
import { recordAnalysisRun } from './ledger'
import {
  localAnswer,
  localClaims,
  localDiscrepancies,
  localEntities,
  localMissingEvidence,
  localRelationships,
  localSummary,
  localTimeline,
  type LocalChunk,
} from './local/analyzers'
import { ANSWER_PRINCIPLES, CORE_PRINCIPLES, PROMPTS, excerptBlock } from './prompts'
import { activeModel, complete, providerName, structured } from './provider'
import {
  SCHEMA_HINTS,
  claimSchema,
  discrepancySchema,
  entitySchema,
  missingEvidenceSchema,
  queryPlanSchema,
  relationshipSchema,
  summarySchema,
  timelineSchema,
  type ClaimExtractionResult,
  type DiscrepancyAnalysisResult,
  type EntityExtractionResult,
  type MissingEvidenceResult,
  type QueryPlanResult,
  type RelationshipExtractionResult,
  type SourceSummaryResult,
  type TimelineExtractionResult,
} from './types'

/**
 * The ten analysis services.
 *
 * Each is a thin dispatcher: with Anthropic configured it runs a focused,
 * schema-validated prompt; without it, the deterministic local analyzer runs
 * against the same excerpts. Both return the same validated shape, and both
 * write to the usage ledger, so the rest of the application never branches on
 * which provider produced a result.
 */

export type ServiceChunk = Pick<
  RetrievedChunk,
  'id' | 'sourceId' | 'sourceLabel' | 'sourceTitle' | 'format' | 'locator' | 'text' | 'pageNumber'
>

function toLocal(chunks: ServiceChunk[]): LocalChunk[] {
  return chunks.map((c) => ({
    id: c.id,
    sourceId: c.sourceId,
    sourceLabel: c.sourceLabel,
    sourceTitle: c.sourceTitle,
    format: c.format,
    locator: c.locator,
    text: c.text,
    pageNumber: c.pageNumber,
  }))
}

async function runLocal<T>(
  operation: AnalysisOperation,
  caseId: string | null,
  sourceId: string | null,
  fn: () => T,
  summarize?: (result: T) => Record<string, unknown>,
): Promise<T> {
  const started = Date.now()
  const result = fn()
  await recordAnalysisRun({
    caseId,
    sourceId,
    operation,
    status: 'complete',
    provider: 'local',
    model: 'local-deterministic',
    usage: { inputTokens: 0, outputTokens: 0 },
    durationMs: Date.now() - started,
    resultSummary: summarize?.(result) ?? {},
  })
  return result
}

/** Only chunk ids that were actually supplied may appear in a structured result. */
function pruneToKnownChunks<T extends { chunkIds?: string[] }>(items: T[], known: Set<string>): T[] {
  return items
    .map((item) => ({ ...item, chunkIds: (item.chunkIds ?? []).filter((id) => known.has(id)) }))
    .filter((item) => (item.chunkIds ?? []).length > 0)
}

/* -------------------------------------------------------------- 1. summary */

export async function summarizeSource(input: {
  caseId: string
  sourceId: string
  title: string
  format: string
  chunks: ServiceChunk[]
}): Promise<SourceSummaryResult> {
  if (!capabilities.anthropic) {
    return runLocal('source_summary', input.caseId, input.sourceId, () =>
      localSummary(input.title, input.format, toLocal(input.chunks)),
    )
  }
  const { data } = await structured({
    operation: 'source_summary',
    caseId: input.caseId,
    sourceId: input.sourceId,
    system: CORE_PRINCIPLES,
    prompt: PROMPTS.sourceSummary(input.title, input.format, excerptBlock(input.chunks.slice(0, 24))),
    schema: summarySchema,
    schemaHint: SCHEMA_HINTS.summary,
    maxTokens: 1200,
  })
  return data
}

/* ------------------------------------------------------------- 2. entities */

export async function extractEntities(input: {
  caseId: string
  sourceId?: string | null
  chunks: ServiceChunk[]
}): Promise<EntityExtractionResult> {
  if (!capabilities.anthropic) {
    return runLocal('entity_extraction', input.caseId, input.sourceId ?? null, () => localEntities(toLocal(input.chunks)), (r) => ({
      count: r.entities.length,
    }))
  }
  const known = new Set(input.chunks.map((c) => c.id))
  const { data } = await structured({
    operation: 'entity_extraction',
    caseId: input.caseId,
    sourceId: input.sourceId ?? null,
    system: CORE_PRINCIPLES,
    prompt: PROMPTS.entities(excerptBlock(input.chunks.slice(0, 30))),
    schema: entitySchema,
    schemaHint: SCHEMA_HINTS.entities,
  })
  return { entities: pruneToKnownChunks(data.entities, known) }
}

/* --------------------------------------------------------------- 3. claims */

export async function extractClaims(input: {
  caseId: string
  sourceId?: string | null
  objective: string
  chunks: ServiceChunk[]
}): Promise<ClaimExtractionResult> {
  if (!capabilities.anthropic) {
    return runLocal('claim_extraction', input.caseId, input.sourceId ?? null, () =>
      localClaims(input.objective, toLocal(input.chunks)),
      (r) => ({ count: r.claims.length }),
    )
  }
  const known = new Set(input.chunks.map((c) => c.id))
  const { data } = await structured({
    operation: 'claim_extraction',
    caseId: input.caseId,
    sourceId: input.sourceId ?? null,
    system: CORE_PRINCIPLES,
    prompt: PROMPTS.claims(input.objective, excerptBlock(input.chunks.slice(0, 30))),
    schema: claimSchema,
    schemaHint: SCHEMA_HINTS.claims,
  })
  const claims = data.claims
    .map((claim) => ({ ...claim, evidence: claim.evidence.filter((e) => known.has(e.chunkId)) }))
    .filter((claim) => claim.evidence.length > 0)
  return { claims }
}

/* ------------------------------------------------------------- 4. timeline */

export async function extractTimeline(input: {
  caseId: string
  sourceId?: string | null
  chunks: ServiceChunk[]
}): Promise<TimelineExtractionResult> {
  if (!capabilities.anthropic) {
    return runLocal('timeline_extraction', input.caseId, input.sourceId ?? null, () => localTimeline(toLocal(input.chunks)), (r) => ({
      count: r.events.length,
    }))
  }
  const known = new Set(input.chunks.map((c) => c.id))
  const { data } = await structured({
    operation: 'timeline_extraction',
    caseId: input.caseId,
    sourceId: input.sourceId ?? null,
    system: CORE_PRINCIPLES,
    prompt: PROMPTS.timeline(excerptBlock(input.chunks.slice(0, 30))),
    schema: timelineSchema,
    schemaHint: SCHEMA_HINTS.timeline,
  })
  return { events: pruneToKnownChunks(data.events, known) }
}

/* -------------------------------------------------------- 5. relationships */

export async function extractRelationships(input: {
  caseId: string
  entities: { name: string; type: string }[]
  chunks: ServiceChunk[]
}): Promise<RelationshipExtractionResult> {
  if (input.entities.length < 2) return { relationships: [] }
  if (!capabilities.anthropic) {
    return runLocal('relationship_extraction', input.caseId, null, () =>
      localRelationships(input.entities, toLocal(input.chunks)),
      (r) => ({ count: r.relationships.length }),
    )
  }
  const known = new Set(input.chunks.map((c) => c.id))
  const names = new Set(input.entities.map((e) => e.name))
  const { data } = await structured({
    operation: 'relationship_extraction',
    caseId: input.caseId,
    system: CORE_PRINCIPLES,
    prompt: PROMPTS.relationships(
      input.entities.map((e) => `· ${e.name} (${e.type})`).join('\n'),
      excerptBlock(input.chunks.slice(0, 26)),
    ),
    schema: relationshipSchema,
    schemaHint: SCHEMA_HINTS.relationships,
  })
  return {
    relationships: data.relationships
      .filter((r) => names.has(r.from) && names.has(r.to) && r.from !== r.to)
      .map((r) => ({ ...r, chunkIds: r.chunkIds.filter((id) => known.has(id)) })),
  }
}

/* --------------------------------------------------------- 6. discrepancies */

export async function analyzeDiscrepancies(input: {
  caseId: string
  chunks: ServiceChunk[]
}): Promise<DiscrepancyAnalysisResult> {
  if (!capabilities.anthropic) {
    return runLocal('discrepancy_analysis', input.caseId, null, () => localDiscrepancies(toLocal(input.chunks)), (r) => ({
      count: r.discrepancies.length,
    }))
  }
  const known = new Set(input.chunks.map((c) => c.id))
  const { data } = await structured({
    operation: 'discrepancy_analysis',
    caseId: input.caseId,
    system: CORE_PRINCIPLES,
    prompt: PROMPTS.discrepancies(excerptBlock(input.chunks.slice(0, 36))),
    schema: discrepancySchema,
    schemaHint: SCHEMA_HINTS.discrepancies,
  })
  return {
    discrepancies: data.discrepancies.filter((d) => known.has(d.sideA.chunkId) && known.has(d.sideB.chunkId)),
  }
}

/* ------------------------------------------------------- 7. query planning */

export async function planQuery(input: {
  caseId: string
  question: string
  sourceInventory: string
}): Promise<QueryPlanResult> {
  if (!capabilities.anthropic) {
    return runLocal('query_planning', input.caseId, null, () => localQueryPlan(input.question))
  }
  try {
    const { data } = await structured({
      operation: 'query_planning',
      caseId: input.caseId,
      system: CORE_PRINCIPLES,
      prompt: PROMPTS.queryPlan(input.question, input.sourceInventory),
      schema: queryPlanSchema,
      schemaHint: SCHEMA_HINTS.queryPlan,
      maxTokens: 700,
    })
    return data
  } catch {
    // Planning is an optimisation; a failure must not block the answer.
    return localQueryPlan(input.question)
  }
}

function localQueryPlan(question: string): QueryPlanResult {
  const intent: QueryPlanResult['intent'] = /compare|differ|conflict|versus|vs\b/i.test(question)
    ? 'comparison'
    : /when|timeline|chronolog|sequence|order of/i.test(question)
      ? 'chronology'
      : /list|every|all mentions|which|who all/i.test(question)
        ? 'enumeration'
        : /why|how|explain/i.test(question)
          ? 'explanation'
          : 'lookup'
  return { searchQueries: [question], entityFilters: [], intent }
}

/* ------------------------------------------------------- 8. answers (RAG) */

export interface AnswerResult {
  text: string
  usedChunkIds: string[]
  insufficient: boolean
  provider: 'anthropic' | 'local'
}

export async function generateAnswer(input: {
  caseId: string
  question: string
  objective: string
  chunks: ServiceChunk[]
}): Promise<AnswerResult> {
  if (!capabilities.anthropic) {
    const result = await runLocal('answer_generation', input.caseId, null, () =>
      localAnswer(input.question, toLocal(input.chunks)),
    )
    return { ...result, provider: 'local' }
  }

  const started = Date.now()
  const { text, usage } = await complete({
    system: ANSWER_PRINCIPLES,
    prompt: PROMPTS.answer(input.question, input.objective, excerptBlock(input.chunks)),
    maxTokens: 1600,
  })
  await recordAnalysisRun({
    caseId: input.caseId,
    operation: 'answer_generation',
    status: 'complete',
    provider: 'anthropic',
    model: activeModel(),
    usage,
    durationMs: Date.now() - started,
  })
  return {
    text,
    usedChunkIds: input.chunks.map((c) => c.id),
    insufficient: /do not establish|does not establish/i.test(text),
    provider: 'anthropic',
  }
}

/** Prompt text for the streaming copilot route (Claude mode only). */
export function answerPrompt(input: { question: string; objective: string; chunks: ServiceChunk[] }) {
  return {
    system: ANSWER_PRINCIPLES,
    prompt: PROMPTS.answer(input.question, input.objective, excerptBlock(input.chunks)),
  }
}

/* -------------------------------------------------------- 9. brief writing */

export async function writeBriefSection(input: {
  caseId: string
  sectionTitle: string
  guidance: string
  context: string
  fallback: string
}): Promise<string> {
  if (!capabilities.anthropic) {
    await runLocal('brief_section', input.caseId, null, () => input.fallback)
    return input.fallback
  }
  const started = Date.now()
  try {
    const { text, usage } = await complete({
      system: CORE_PRINCIPLES,
      prompt: PROMPTS.briefSection(input.sectionTitle, input.guidance, input.context),
      maxTokens: 2000,
    })
    await recordAnalysisRun({
      caseId: input.caseId,
      operation: 'brief_section',
      status: 'complete',
      provider: 'anthropic',
      model: activeModel(),
      usage,
      durationMs: Date.now() - started,
    })
    return text.trim() || input.fallback
  } catch {
    return input.fallback
  }
}

/* ---------------------------------------------------- 10. missing evidence */

export async function suggestMissingEvidence(input: {
  caseId: string
  objective: string
  sourceTitles: string[]
  openQuestions: string[]
  discrepancySubjects: string[]
  context: string
}): Promise<MissingEvidenceResult> {
  if (!capabilities.anthropic) {
    return runLocal('missing_evidence', input.caseId, null, () =>
      localMissingEvidence({
        objective: input.objective,
        sourceTitles: input.sourceTitles,
        openQuestions: input.openQuestions,
        discrepancySubjects: input.discrepancySubjects,
      }),
    )
  }
  try {
    const { data } = await structured({
      operation: 'missing_evidence',
      caseId: input.caseId,
      system: CORE_PRINCIPLES,
      prompt: PROMPTS.missingEvidence(input.objective, input.context),
      schema: missingEvidenceSchema,
      schemaHint: SCHEMA_HINTS.missingEvidence,
      maxTokens: 1200,
    })
    return data
  } catch {
    return localMissingEvidence({
      objective: input.objective,
      sourceTitles: input.sourceTitles,
      openQuestions: input.openQuestions,
      discrepancySubjects: input.discrepancySubjects,
    })
  }
}

export { providerName }
