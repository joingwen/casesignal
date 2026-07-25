import { describe, expect, it } from 'vitest'
import {
  CLAIM_STATUSES,
  CLAIM_STATUS_META,
  PLANS,
  PROCESSING_STATUSES,
  PROCESSING_STATUS_META,
  REVIEW_STATES,
  REVIEW_STATE_META,
  deriveClaimStatus,
} from '@/lib/domain'
import {
  claimSchema,
  discrepancySchema,
  entitySchema,
  summarySchema,
  timelineSchema,
} from '@/server/ai/types'
import { extractJson } from '@/server/ai/provider'

describe('claim status derivation', () => {
  it('is supported when only supporting citations exist', () => {
    expect(deriveClaimStatus({ supporting: 2, contradicting: 0, context: 0 })).toBe('supported')
  })

  it('is contradicted when only conflicting citations exist', () => {
    expect(deriveClaimStatus({ supporting: 0, contradicting: 1, context: 3 })).toBe('contradicted')
  })

  it('is partially supported when evidence points both ways', () => {
    expect(deriveClaimStatus({ supporting: 3, contradicting: 1, context: 0 })).toBe('partially_supported')
  })

  it('is context only when nothing supports or contradicts but context exists', () => {
    expect(deriveClaimStatus({ supporting: 0, contradicting: 0, context: 2 })).toBe('context_only')
  })

  it('is unresolved when there is no evidence at all', () => {
    expect(deriveClaimStatus({ supporting: 0, contradicting: 0, context: 0 })).toBe('unresolved')
  })
})

describe('status vocabularies', () => {
  it('describes every claim status with a non-colour symbol', () => {
    for (const status of CLAIM_STATUSES) {
      const meta = CLAIM_STATUS_META[status]
      expect(meta.label.length).toBeGreaterThan(0)
      expect(meta.symbol.length).toBeGreaterThan(0)
      expect(meta.description.length).toBeGreaterThan(10)
    }
  })

  it('describes every review state', () => {
    for (const state of REVIEW_STATES) expect(REVIEW_STATE_META[state].label.length).toBeGreaterThan(0)
  })

  it('marks exactly the terminal processing statuses as terminal', () => {
    const terminal = PROCESSING_STATUSES.filter((s) => PROCESSING_STATUS_META[s].terminal)
    expect(terminal.sort()).toEqual(['complete', 'failed', 'needs_review'])
  })
})

describe('plan definitions', () => {
  it('gives Pro strictly higher limits than Free', () => {
    expect(PLANS.pro.activeCases).toBeGreaterThan(PLANS.free.activeCases)
    expect(PLANS.pro.processedPagesPerMonth).toBeGreaterThan(PLANS.free.processedPagesPerMonth)
    expect(PLANS.pro.storageBytes).toBeGreaterThan(PLANS.free.storageBytes)
  })

  it('keeps evidence rooms and PDF export off the free plan', () => {
    expect(PLANS.free.publicEvidenceRooms).toBe(0)
    expect(PLANS.free.pdfExport).toBe(false)
    expect(PLANS.pro.pdfExport).toBe(true)
  })

  it('prices the free plan at zero', () => {
    expect(PLANS.free.priceMonthly).toBe(0)
    expect(PLANS.pro.priceMonthly).toBeGreaterThan(0)
  })
})

describe('structured AI output validation', () => {
  it('accepts a well-formed claim payload', () => {
    const result = claimSchema.safeParse({
      claims: [
        {
          statement: 'The proposal commits to delivery on September 10, 2024.',
          category: 'timing',
          materiality: 'high',
          confidence: 0.9,
          evidence: [{ chunkId: 'chunk-1', role: 'supporting', excerpt: 'commits to delivery' }],
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects a claim with no evidence', () => {
    const result = claimSchema.safeParse({
      claims: [{ statement: 'A claim with no citation at all.', category: 'other', materiality: 'low', confidence: 0.5, evidence: [] }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects an out-of-range confidence', () => {
    const result = summarySchema.safeParse({ summary: 'x', keyPoints: [], documentType: '', extractionConfidence: 1.4 })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown status vocabulary value', () => {
    const result = entitySchema.safeParse({
      entities: [{ name: 'Acme', type: 'spaceship', role: '', aliases: [], description: '', chunkIds: ['c1'] }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a timeline event with a malformed date', () => {
    const result = timelineSchema.safeParse({
      events: [
        {
          occurredOn: 'September 2024',
          occurredEndOn: null,
          timeOfDay: null,
          precision: 'exact',
          title: 'An event',
          description: '',
          category: 'other',
          confidence: 0.5,
          chunkIds: ['c1'],
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('requires both sides of a discrepancy', () => {
    const result = discrepancySchema.safeParse({
      discrepancies: [
        {
          title: 'Dates differ',
          description: 'These records appear inconsistent.',
          type: 'date',
          subject: 'delivery',
          materiality: 'high',
          confidence: 0.8,
          sideA: { chunkId: 'c1', statedValue: 'Sept 10', excerpt: '' },
        },
      ],
    })
    expect(result.success).toBe(false)
  })
})

describe('extractJson', () => {
  it('reads a bare JSON object', () => {
    expect(extractJson('{"a":1}')).toBe('{"a":1}')
  })

  it('reads JSON out of a fenced block', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}')
  })

  it('reads JSON preceded by prose', () => {
    expect(extractJson('Here is the result:\n{"a": {"b": 2}}')).toBe('{"a": {"b": 2}}')
  })

  it('is not confused by braces inside strings', () => {
    expect(extractJson('{"a":"}{"}')).toBe('{"a":"}{"}')
  })

  it('returns null when there is no object', () => {
    expect(extractJson('no json here')).toBeNull()
  })
})
