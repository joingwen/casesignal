import { z } from 'zod'
import {
  CLAIM_CATEGORIES,
  CLAIM_STATUSES,
  DATE_PRECISIONS,
  DISCREPANCY_TYPES,
  ENTITY_TYPES,
  EVENT_CATEGORIES,
  EVIDENCE_ROLES,
  MATERIALITY_LEVELS,
  RELATIONSHIP_TYPES,
} from '@/lib/domain'

/**
 * Structured contracts shared by both analysis providers.
 *
 * The Claude services validate model output against these schemas; the local
 * services construct the same shapes directly. Downstream persistence code is
 * therefore identical regardless of which provider produced the result, and a
 * malformed model response can never reach the database.
 */

const confidence = z.number().min(0).max(1).catch(0.5)
const chunkRef = z.string().min(1)

/**
 * Enum with a conservative fallback.
 *
 * Models occasionally return a near-miss label ("estimate" for "estimated").
 * Discarding the whole extraction over a vocabulary slip loses good data, so an
 * unrecognised value falls back to the least-assertive option instead. Anything
 * correctness-critical — chunk ids, dates — stays strict and still rejects.
 */
function tolerantEnum<T extends readonly [string, ...string[]]>(values: T, fallback: T[number]) {
  return z.enum(values).catch(fallback as never)
}

export const summarySchema = z.object({
  summary: z.string().min(1).max(1200),
  keyPoints: z.array(z.string().min(1).max(300)).max(8),
  documentType: z.string().max(80).default(''),
  extractionConfidence: confidence,
})
export type SourceSummaryResult = z.infer<typeof summarySchema>

export const entitySchema = z.object({
  entities: z
    .array(
      z.object({
        name: z.string().min(2).max(120),
        type: tolerantEnum(ENTITY_TYPES, 'other'),
        role: z.string().max(160).default(''),
        aliases: z.array(z.string().max(120)).max(6).default([]),
        description: z.string().max(400).default(''),
        chunkIds: z.array(chunkRef).min(1),
      }),
    )
    .max(60),
})
export type EntityExtractionResult = z.infer<typeof entitySchema>

export const claimSchema = z.object({
  claims: z
    .array(
      z.object({
        statement: z.string().min(10).max(400),
        category: tolerantEnum(CLAIM_CATEGORIES, 'other'),
        materiality: tolerantEnum(MATERIALITY_LEVELS, 'medium'),
        confidence,
        evidence: z
          .array(
            z.object({
              chunkId: chunkRef,
              role: tolerantEnum(EVIDENCE_ROLES, 'context'),
              excerpt: z.string().max(600).default(''),
            }),
          )
          .min(1),
      }),
    )
    .max(60),
})
export type ClaimExtractionResult = z.infer<typeof claimSchema>

export const timelineSchema = z.object({
  events: z
    .array(
      z.object({
        occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        occurredEndOn: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .default(null),
        timeOfDay: z.string().max(20).nullable().default(null),
        precision: tolerantEnum(DATE_PRECISIONS, 'estimated'),
        title: z.string().min(4).max(200),
        description: z.string().max(600).default(''),
        category: tolerantEnum(EVENT_CATEGORIES, 'other'),
        confidence,
        chunkIds: z.array(chunkRef).min(1),
      }),
    )
    .max(80),
})
export type TimelineExtractionResult = z.infer<typeof timelineSchema>

export const relationshipSchema = z.object({
  relationships: z
    .array(
      z.object({
        from: z.string().min(1).max(120),
        to: z.string().min(1).max(120),
        type: tolerantEnum(RELATIONSHIP_TYPES, 'related_to'),
        description: z.string().max(240).default(''),
        confidence,
        chunkIds: z.array(chunkRef).default([]),
      }),
    )
    .max(120),
})
export type RelationshipExtractionResult = z.infer<typeof relationshipSchema>

export const discrepancySchema = z.object({
  discrepancies: z
    .array(
      z.object({
        title: z.string().min(6).max(160),
        description: z.string().min(10).max(700),
        type: tolerantEnum(DISCREPANCY_TYPES, 'status'),
        subject: z.string().max(160).default(''),
        materiality: tolerantEnum(MATERIALITY_LEVELS, 'medium'),
        confidence,
        sideA: z.object({ chunkId: chunkRef, statedValue: z.string().max(160).default(''), excerpt: z.string().max(600).default('') }),
        sideB: z.object({ chunkId: chunkRef, statedValue: z.string().max(160).default(''), excerpt: z.string().max(600).default('') }),
      }),
    )
    .max(40),
})
export type DiscrepancyAnalysisResult = z.infer<typeof discrepancySchema>

export const queryPlanSchema = z.object({
  searchQueries: z.array(z.string().min(2).max(200)).min(1).max(5),
  entityFilters: z.array(z.string().max(120)).max(8).default([]),
  intent: z.enum(['lookup', 'comparison', 'chronology', 'enumeration', 'explanation']).default('lookup'),
})
export type QueryPlanResult = z.infer<typeof queryPlanSchema>

export const missingEvidenceSchema = z.object({
  suggestions: z
    .array(
      z.object({
        record: z.string().min(4).max(200),
        reason: z.string().min(4).max(400),
        priority: z.enum(MATERIALITY_LEVELS),
      }),
    )
    .max(12),
})
export type MissingEvidenceResult = z.infer<typeof missingEvidenceSchema>

export const briefSectionSchema = z.object({
  body: z.string().min(1).max(8000),
})
export type BriefSectionResult = z.infer<typeof briefSectionSchema>

export const claimStatusSchema = z.enum(CLAIM_STATUSES)

/** Compact shape hints appended to prompts so the model knows the contract. */
export const SCHEMA_HINTS = {
  summary: `{"summary": string, "keyPoints": string[], "documentType": string, "extractionConfidence": number 0-1}`,
  entities: `{"entities": [{"name": string, "type": ${JSON.stringify(ENTITY_TYPES)}, "role": string, "aliases": string[], "description": string, "chunkIds": string[]}]}`,
  claims: `{"claims": [{"statement": string, "category": ${JSON.stringify(CLAIM_CATEGORIES)}, "materiality": "low"|"medium"|"high", "confidence": number 0-1, "evidence": [{"chunkId": string, "role": "supporting"|"contradicting"|"context", "excerpt": string}]}]}`,
  timeline: `{"events": [{"occurredOn": "YYYY-MM-DD", "occurredEndOn": "YYYY-MM-DD"|null, "timeOfDay": string|null, "precision": ${JSON.stringify(DATE_PRECISIONS)}, "title": string, "description": string, "category": ${JSON.stringify(EVENT_CATEGORIES)}, "confidence": number 0-1, "chunkIds": string[]}]}`,
  relationships: `{"relationships": [{"from": entity name, "to": entity name, "type": ${JSON.stringify(RELATIONSHIP_TYPES)}, "description": string, "confidence": number 0-1, "chunkIds": string[]}]}`,
  discrepancies: `{"discrepancies": [{"title": string, "description": string, "type": ${JSON.stringify(DISCREPANCY_TYPES)}, "subject": string, "materiality": "low"|"medium"|"high", "confidence": number 0-1, "sideA": {"chunkId": string, "statedValue": string, "excerpt": string}, "sideB": {"chunkId": string, "statedValue": string, "excerpt": string}}]}`,
  queryPlan: `{"searchQueries": string[], "entityFilters": string[], "intent": "lookup"|"comparison"|"chronology"|"enumeration"|"explanation"}`,
  missingEvidence: `{"suggestions": [{"record": string, "reason": string, "priority": "low"|"medium"|"high"}]}`,
  briefSection: `{"body": string}`,
} as const
