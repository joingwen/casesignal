import type {
  ClaimExtractionResult,
  DiscrepancyAnalysisResult,
  EntityExtractionResult,
  MissingEvidenceResult,
  RelationshipExtractionResult,
  SourceSummaryResult,
  TimelineExtractionResult,
} from '../types'
import {
  findAmounts,
  findDates,
  findEntities,
  normalizeEntityName,
  splitSentences,
  tokenize,
} from './text'

/**
 * Local analysis mode.
 *
 * Every function here reads the real text of the case sources and produces the
 * same structured result as the Claude-backed service. Nothing is invented: a
 * claim is a sentence that exists in a record, an event's date is a date that
 * literally appears next to it, and a discrepancy requires two excerpts that
 * state different values for the same subject.
 *
 * This mode is intentionally more conservative than the model: it finds less,
 * but what it finds is always directly quotable.
 */

export interface LocalChunk {
  id: string
  sourceId: string
  sourceLabel: string
  sourceTitle: string
  format: string
  locator: string
  text: string
  pageNumber?: number | null
}

/* ---------------------------------------------------------------- summary */

export function localSummary(title: string, format: string, chunks: LocalChunk[]): SourceSummaryResult {
  const full = chunks.map((c) => c.text).join('\n')
  const sentences = splitSentences(full)
  const dates = findDates(full)
  const amounts = findAmounts(full)

  const lead = sentences.slice(0, 2).map((s) => s.text)
  const descriptor = documentDescriptor(title, full)

  const summaryParts = [
    `${title} is ${descriptor}.`,
    lead[0] ? `It opens: “${truncateWords(lead[0], 26)}”` : '',
    dates.length > 0
      ? `The record references ${dates.length === 1 ? 'one date' : `${new Set(dates.map((d) => d.iso)).size} distinct dates`}, beginning ${dates[0]!.raw}.`
      : '',
    amounts.length > 0 ? `It states ${amounts.length} numeric value${amounts.length === 1 ? '' : 's'}.` : '',
  ].filter(Boolean)

  const keyPoints = sentences
    .filter((s) => /\b(shall|will|must|approved|awarded|delivered|received|invoiced|scheduled|submitted|recorded|total)\b/i.test(s.text))
    .slice(0, 6)
    .map((s) => truncateWords(s.text, 30))

  const density = full.replace(/\s/g, '').length / Math.max(1, full.length)
  const confidence = clamp01(0.55 + density * 0.35 + (sentences.length > 4 ? 0.1 : 0))

  return {
    summary: summaryParts.join(' ').slice(0, 1000),
    keyPoints: keyPoints.length > 0 ? keyPoints : sentences.slice(0, 3).map((s) => truncateWords(s.text, 30)),
    documentType: descriptor,
    extractionConfidence: Number(confidence.toFixed(2)),
  }
}

function documentDescriptor(title: string, text: string): string {
  const haystack = `${title} ${text.slice(0, 600)}`.toLowerCase()
  const table: [RegExp, string][] = [
    [/invoice|remittance|billing/, 'an invoice or billing record'],
    [/minutes|agenda|attendees/, 'a set of meeting minutes'],
    [/proposal|quotation|bid|tender/, 'a vendor proposal'],
    [/purchase request|requisition|procurement request/, 'a procurement request'],
    [/award|notice of award|selected vendor/, 'an award notice'],
    [/delivery|receipt|packing|shipment/, 'a delivery or receiving record'],
    [/memo|memorandum/, 'an internal memorandum'],
    [/transcript|speaker|interview/, 'a transcript'],
    [/policy|procedure|manual/, 'a policy or procedure document'],
    [/spreadsheet|register|ledger|row/, 'a tabular register'],
  ]
  for (const [re, label] of table) if (re.test(haystack)) return label
  return 'a case record'
}

/* --------------------------------------------------------------- entities */

export function localEntities(chunks: LocalChunk[]): EntityExtractionResult {
  const byKey = new Map<
    string,
    { name: string; type: string; count: number; chunkIds: Set<string>; aliases: Set<string>; context: string }
  >()

  for (const chunk of chunks) {
    for (const mention of findEntities(chunk.text)) {
      const key = normalizeEntityName(mention.name)
      if (key.length < 3) continue
      const existing = byKey.get(key)
      if (existing) {
        existing.count += 1
        existing.chunkIds.add(chunk.id)
        if (existing.name !== mention.name) existing.aliases.add(mention.name)
        if (mention.type !== 'other' && existing.type === 'other') existing.type = mention.type
      } else {
        byKey.set(key, {
          name: mention.name,
          type: mention.type,
          count: 1,
          chunkIds: new Set([chunk.id]),
          aliases: new Set(),
          context: chunk.text.slice(Math.max(0, mention.index - 60), mention.index + 120).replace(/\s+/g, ' '),
        })
      }
    }
  }

  const entities = Array.from(byKey.values())
    .filter((e) => e.count >= 1 && e.name.length >= 4)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 40)
    .map((e) => ({
      name: e.name,
      type: (['person', 'organization', 'document', 'event', 'location', 'transaction', 'asset', 'other'] as const).includes(
        e.type as never,
      )
        ? (e.type as EntityExtractionResult['entities'][number]['type'])
        : ('other' as const),
      role: inferRole(e.context, e.name),
      aliases: Array.from(e.aliases).slice(0, 4),
      description: `Appears in ${e.chunkIds.size} excerpt${e.chunkIds.size === 1 ? '' : 's'} across the case record.`,
      chunkIds: Array.from(e.chunkIds),
    }))

  return { entities }
}

function inferRole(context: string, name: string): string {
  const window = context.replace(name, '').toLowerCase()
  const roles: [RegExp, string][] = [
    [/vendor|supplier|contractor|bidder/, 'Named as a vendor in the record'],
    [/purchas|procure|requisition/, 'Named in the procurement record'],
    [/approv|authoris|authoriz|sign/, 'Named in an approval step'],
    [/deliver|ship|receiv/, 'Named in a delivery record'],
    [/invoice|paid|payment|billed/, 'Named in a billing record'],
    [/attend|present|chair|minutes/, 'Recorded as attending a meeting'],
    [/director|manager|clerk|officer|administrator/, 'Holds a role named in the record'],
  ]
  for (const [re, label] of roles) if (re.test(window)) return label
  return 'Named in the case record'
}

/* ----------------------------------------------------------------- claims */

const CLAIM_CUES =
  /\b(shall|will|must|is required|was required|approved|awarded|selected|delivered|received|invoiced|billed|scheduled|submitted|recorded|reported|states?|totals?|amounts? to|authoris|authoriz|confirmed|noted|resolved)\b/i

const CATEGORY_CUES: [RegExp, ClaimExtractionResult['claims'][number]['category']][] = [
  [/\$|invoice|payment|paid|cost|price|budget|billed/i, 'financial'],
  [/\b\d+\s*(units?|items?|copies|chairs?|scanners?)\b|quantity|count/i, 'quantity'],
  [/deadline|schedule|deliver|date|on or about|by \w+ \d/i, 'timing'],
  [/approv|authoriz|authoris|sign-?off|delegat/i, 'authorization'],
  [/policy|procedure|process|requirement|complian|regulation/i, 'compliance'],
  [/email|memo|letter|call|notified|informed|circulated/i, 'communication'],
  [/stated|according to|attributed|said|wrote/i, 'attribution'],
  [/procedure|step|process|protocol/i, 'procedure'],
]

export function localClaims(objective: string, chunks: LocalChunk[]): ClaimExtractionResult {
  const claims: ClaimExtractionResult['claims'] = []
  const seen = new Set<string>()
  const objectiveTokens = new Set(tokenize(objective))

  for (const chunk of chunks) {
    for (const sentence of splitSentences(chunk.text)) {
      const text = sentence.text
      if (text.length < 30 || text.length > 320) continue
      if (!CLAIM_CUES.test(text) && findDates(text).length === 0 && findAmounts(text).length === 0) continue
      if (/^(page|section|attachment|table of contents|appendix|figure)\b/i.test(text)) continue

      const statement = normalizeStatement(text, chunk.sourceTitle)
      const dedupeKey = statement.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 90)
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)

      const category = CATEGORY_CUES.find(([re]) => re.test(text))?.[1] ?? 'other'
      const specificity =
        (findDates(text).length > 0 ? 0.18 : 0) + (findAmounts(text).length > 0 ? 0.18 : 0) + (CLAIM_CUES.test(text) ? 0.14 : 0)
      const relevance = objectiveTokens.size
        ? tokenize(text).filter((t) => objectiveTokens.has(t)).length / Math.max(4, objectiveTokens.size)
        : 0

      claims.push({
        statement,
        category,
        materiality: specificity >= 0.3 ? 'high' : specificity >= 0.18 ? 'medium' : 'low',
        confidence: Number(clamp01(0.48 + specificity + relevance * 0.15).toFixed(2)),
        evidence: [{ chunkId: chunk.id, role: 'supporting', excerpt: text.slice(0, 560) }],
      })
    }
  }

  return {
    claims: claims
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 40),
  }
}

function normalizeStatement(sentence: string, sourceTitle: string): string {
  const trimmed = sentence.replace(/\s+/g, ' ').trim().replace(/^[-•*\d.)\s]+/, '')
  const withPeriod = /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
  // Attribute to the record so a claim is never presented as an established fact.
  if (/^(the record|the document|per |according to)/i.test(withPeriod)) return withPeriod
  return `${sourceTitle} records: ${withPeriod}`.slice(0, 380)
}

/* --------------------------------------------------------------- timeline */

const EVENT_CATEGORY_CUES: [RegExp, TimelineExtractionResult['events'][number]['category']][] = [
  [/meeting|minutes|convened|session/i, 'meeting'],
  [/invoice|payment|paid|remit/i, 'payment'],
  [/deliver|shipment|received|installed/i, 'delivery'],
  [/filed|submitted|filing|application/i, 'filing'],
  [/email|memo|letter|notified|circulated/i, 'communication'],
  [/approved|awarded|decided|resolved|selected/i, 'decision'],
  [/published|posted|released/i, 'publication'],
]

export function localTimeline(chunks: LocalChunk[]): TimelineExtractionResult {
  const events: TimelineExtractionResult['events'] = []
  const seen = new Map<string, number>()

  for (const chunk of chunks) {
    for (const sentence of splitSentences(chunk.text)) {
      const dates = findDates(sentence.text)
      if (dates.length === 0) continue
      const date = dates[0]!
      const title = truncateWords(
        sentence.text
          .replace(date.raw, '')
          .replace(/\s+/g, ' ')
          .replace(/^[\s,;:–-]+/, '')
          .trim(),
        11,
      )
      if (title.length < 6) continue

      const key = `${date.iso}|${title.toLowerCase().slice(0, 40)}`
      const existingIndex = seen.get(key)
      if (existingIndex !== undefined) {
        const existing = events[existingIndex]!
        if (!existing.chunkIds.includes(chunk.id)) existing.chunkIds.push(chunk.id)
        continue
      }

      const category = EVENT_CATEGORY_CUES.find(([re]) => re.test(sentence.text))?.[1] ?? 'other'
      const timeMatch = sentence.text.match(/\b(\d{1,2}:\d{2}\s?(?:a\.?m\.?|p\.?m\.?)?)/i)

      seen.set(key, events.length)
      events.push({
        occurredOn: date.iso,
        occurredEndOn: dates[1] && dates[1].iso !== date.iso && /through|to|until|–|-/.test(sentence.text) ? dates[1].iso : null,
        timeOfDay: timeMatch ? timeMatch[1]!.trim() : null,
        precision: date.precision,
        title: title.charAt(0).toUpperCase() + title.slice(1),
        description: sentence.text.slice(0, 560),
        category,
        confidence: date.precision === 'exact' ? 0.78 : 0.6,
        chunkIds: [chunk.id],
      })
    }
  }

  return { events: events.sort((a, b) => a.occurredOn.localeCompare(b.occurredOn)).slice(0, 60) }
}

/* ---------------------------------------------------------- relationships */

export function localRelationships(
  entities: { name: string; type: string }[],
  chunks: LocalChunk[],
): RelationshipExtractionResult {
  const relationships: RelationshipExtractionResult['relationships'] = []
  const seen = new Set<string>()

  const cues: [RegExp, RelationshipExtractionResult['relationships'][number]['type']][] = [
    [/\b(paid|invoiced|billed|remitted)\b/i, 'paid'],
    [/\b(sent|emailed|addressed|forwarded|notified)\b/i, 'sent_to'],
    [/\b(prepared|authored|signed|submitted)\s+by\b/i, 'authored_by'],
    [/\b(held at|located at|delivered to|received at)\b/i, 'occurred_at'],
    [/\b(before|prior to|followed by|then)\b/i, 'precedes'],
  ]

  for (const chunk of chunks) {
    for (const sentence of splitSentences(chunk.text)) {
      const present = entities.filter((e) => sentence.text.includes(e.name))
      if (present.length < 2) continue
      const type = cues.find(([re]) => re.test(sentence.text))?.[1] ?? 'mentions'
      for (let i = 0; i < present.length - 1; i += 1) {
        const from = present[i]!
        const to = present[i + 1]!
        if (from.name === to.name) continue
        const key = `${from.name}|${to.name}|${type}`
        if (seen.has(key)) continue
        seen.add(key)
        relationships.push({
          from: from.name,
          to: to.name,
          type,
          description: truncateWords(sentence.text, 22),
          confidence: type === 'mentions' ? 0.45 : 0.68,
          chunkIds: [chunk.id],
        })
      }
    }
  }

  return { relationships: relationships.slice(0, 90) }
}

/* --------------------------------------------------------- discrepancies */

/** Topics that give a comparable "same subject" key across different records. */
const SUBJECT_TOPICS: [RegExp, string][] = [
  [/deliver|shipment|arriv|receiv(?!ed by)/i, 'delivery'],
  [/invoice|billed|billing/i, 'invoice'],
  [/payment|paid|remit/i, 'payment'],
  [/award|selected|awarded/i, 'award'],
  [/proposal|quotation|bid/i, 'proposal'],
  [/meeting|minutes|convened/i, 'meeting'],
  [/install|deploy/i, 'installation'],
  [/approv|authoriz|authoris/i, 'approval'],
  [/request|requisition/i, 'request'],
  [/quantity|units|items|count/i, 'quantity'],
]

interface Assertion {
  chunkId: string
  sourceId: string
  sourceLabel: string
  topic: string
  kind: 'date' | 'amount' | 'count'
  value: string
  numeric: number | null
  excerpt: string
}

export function localDiscrepancies(chunks: LocalChunk[]): DiscrepancyAnalysisResult {
  const assertions: Assertion[] = []

  for (const chunk of chunks) {
    for (const sentence of splitSentences(chunk.text)) {
      const topic = SUBJECT_TOPICS.find(([re]) => re.test(sentence.text))?.[1]
      if (!topic) continue
      for (const date of findDates(sentence.text)) {
        assertions.push({
          chunkId: chunk.id,
          sourceId: chunk.sourceId,
          sourceLabel: chunk.sourceLabel,
          topic,
          kind: 'date',
          value: date.iso,
          numeric: null,
          excerpt: sentence.text.slice(0, 560),
        })
      }
      for (const amount of findAmounts(sentence.text)) {
        assertions.push({
          chunkId: chunk.id,
          sourceId: chunk.sourceId,
          sourceLabel: chunk.sourceLabel,
          topic: amount.currency ? topic : 'quantity',
          kind: amount.currency ? 'amount' : 'count',
          value: amount.raw,
          numeric: amount.value,
          excerpt: sentence.text.slice(0, 560),
        })
      }
    }
  }

  const discrepancies: DiscrepancyAnalysisResult['discrepancies'] = []
  const groups = new Map<string, Assertion[]>()
  for (const assertion of assertions) {
    const key = `${assertion.topic}|${assertion.kind}`
    const list = groups.get(key) ?? []
    list.push(assertion)
    groups.set(key, list)
  }

  for (const [key, list] of groups) {
    const [topic, kind] = key.split('|') as [string, Assertion['kind']]
    // A difference only counts when two *different* records state different values.
    const byValue = new Map<string, Assertion[]>()
    for (const a of list) {
      const bucket = byValue.get(a.value) ?? []
      bucket.push(a)
      byValue.set(a.value, bucket)
    }
    if (byValue.size < 2) continue

    const distinct = Array.from(byValue.entries()).sort((a, b) => b[1].length - a[1].length)
    for (let i = 0; i < distinct.length - 1; i += 1) {
      for (let j = i + 1; j < distinct.length; j += 1) {
        const a = distinct[i]![1][0]!
        const b = distinct[j]![1][0]!
        if (a.sourceId === b.sourceId) continue
        if (kind !== 'date' && a.numeric != null && b.numeric != null) {
          const spread = Math.abs(a.numeric - b.numeric) / Math.max(a.numeric, b.numeric)
          if (spread < 0.005) continue
        }
        if (discrepancies.length >= 24) break

        discrepancies.push({
          title: `${capitalize(topic)} ${kind === 'date' ? 'date' : kind === 'amount' ? 'amount' : 'quantity'} differs between records`,
          description: `These records appear inconsistent regarding the ${topic} ${kind === 'date' ? 'date' : kind === 'amount' ? 'amount' : 'quantity'}. ${a.sourceLabel} states ${formatValue(a)}, while ${b.sourceLabel} states ${formatValue(b)}. The excerpts are reproduced below; the difference is described without any conclusion about its cause.`,
          type: kind === 'date' ? 'date' : kind === 'amount' ? 'amount' : 'count',
          subject: topic,
          materiality: kind === 'date' ? 'high' : 'medium',
          confidence: 0.72,
          sideA: { chunkId: a.chunkId, statedValue: formatValue(a), excerpt: a.excerpt },
          sideB: { chunkId: b.chunkId, statedValue: formatValue(b), excerpt: b.excerpt },
        })
      }
    }
  }

  discrepancies.push(...nameDiscrepancies(chunks))
  return { discrepancies: discrepancies.slice(0, 30) }
}

/**
 * Near-identical organization names across records — e.g. a record still using
 * a prior trading name. Reported as a naming difference, never as a finding
 * about the organization itself.
 */
function nameDiscrepancies(chunks: LocalChunk[]): DiscrepancyAnalysisResult['discrepancies'] {
  const orgs = new Map<string, { name: string; chunkId: string; sourceId: string; sourceLabel: string; excerpt: string }>()
  for (const chunk of chunks) {
    for (const mention of findEntities(chunk.text)) {
      if (mention.type !== 'organization') continue
      const key = mention.name.toLowerCase()
      if (orgs.has(key)) continue
      const sentence = splitSentences(chunk.text).find((s) => s.text.includes(mention.name))
      orgs.set(key, {
        name: mention.name,
        chunkId: chunk.id,
        sourceId: chunk.sourceId,
        sourceLabel: chunk.sourceLabel,
        excerpt: (sentence?.text ?? chunk.text).slice(0, 560),
      })
    }
  }

  const list = Array.from(orgs.values())
  const out: DiscrepancyAnalysisResult['discrepancies'] = []
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i]!
      const b = list[j]!
      if (a.sourceId === b.sourceId) continue
      const similarity = tokenOverlap(a.name, b.name)
      if (similarity < 0.5 || similarity >= 1) continue
      out.push({
        title: 'Organization name differs between records',
        description: `These records refer to what appears to be the same organization using different names. ${a.sourceLabel} uses “${a.name}”; ${b.sourceLabel} uses “${b.name}”. This may reflect a renaming, an abbreviation or a clerical difference — the records alone do not establish which.`,
        type: 'name',
        subject: a.name,
        materiality: 'low',
        confidence: 0.55,
        sideA: { chunkId: a.chunkId, statedValue: a.name, excerpt: a.excerpt },
        sideB: { chunkId: b.chunkId, statedValue: b.name, excerpt: b.excerpt },
      })
      if (out.length >= 4) return out
    }
  }
  return out
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(normalizeEntityName(a).split(' ').filter(Boolean))
  const tb = new Set(normalizeEntityName(b).split(' ').filter(Boolean))
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const token of ta) if (tb.has(token)) shared += 1
  return shared / Math.max(ta.size, tb.size)
}

function formatValue(a: Assertion): string {
  if (a.kind === 'date') {
    const [y, m, d] = a.value.split('-').map(Number)
    return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1)).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }
  return a.value
}

/* ----------------------------------------------------------------- answer */

export interface LocalAnswer {
  text: string
  usedChunkIds: string[]
  insufficient: boolean
}

/**
 * Extractive answering. Sentences are selected from retrieved excerpts and
 * quoted with their citation, so every statement is literally present in a
 * record. When nothing relevant is retrieved the answer says so.
 */
export function localAnswer(question: string, chunks: LocalChunk[]): LocalAnswer {
  if (chunks.length === 0) {
    return {
      text: 'The available case sources do not establish this. No excerpt in this case matched the question — adding a record that covers this point would allow it to be answered.',
      usedChunkIds: [],
      insufficient: true,
    }
  }

  const queryTokens = tokenize(question)
  const scored: { chunk: LocalChunk; sentence: string; score: number }[] = []

  for (const chunk of chunks) {
    for (const sentence of splitSentences(chunk.text)) {
      const tokens = new Set(tokenize(sentence.text))
      let score = queryTokens.reduce((acc, token) => acc + (tokens.has(token) ? 1 : 0), 0)
      if (findDates(sentence.text).length > 0 && /when|date|schedul|deadline/i.test(question)) score += 1.5
      if (findAmounts(sentence.text).length > 0 && /how (much|many)|amount|cost|total|quantity|units/i.test(question)) score += 1.5
      if (score <= 0) continue
      scored.push({ chunk, sentence: sentence.text, score: score / Math.sqrt(sentence.text.length / 60 + 1) })
    }
  }

  if (scored.length === 0) {
    const fallback = chunks.slice(0, 2)
    return {
      text: `The available case sources do not establish this directly. The closest material in the case is ${fallback
        .map((c) => `${c.sourceTitle} [${c.sourceLabel}${c.locator ? ` ${c.locator}` : ''}]`)
        .join(' and ')}, which does not address the question as asked.`,
      usedChunkIds: fallback.map((c) => c.id),
      insufficient: true,
    }
  }

  scored.sort((a, b) => b.score - a.score)

  const picked: typeof scored = []
  const usedSources = new Set<string>()
  for (const candidate of scored) {
    if (picked.length >= 4) break
    // Prefer breadth across sources before depth within one.
    if (usedSources.has(candidate.chunk.sourceId) && picked.length < 2) continue
    if (picked.some((p) => p.sentence === candidate.sentence)) continue
    picked.push(candidate)
    usedSources.add(candidate.chunk.sourceId)
  }
  if (picked.length === 0) picked.push(scored[0]!)

  const conflicting = detectConflict(picked.map((p) => p.sentence))
  const lines = picked.map((p) => {
    const citation = `[${p.chunk.sourceLabel}${p.chunk.locator ? ` ${p.chunk.locator}` : ''}]`
    return `${p.chunk.sourceTitle} states: “${truncateWords(p.sentence, 42)}” ${citation}`
  })

  const opening = conflicting
    ? 'The available sources conflict on this point.'
    : `Drawn from ${usedSources.size} source${usedSources.size === 1 ? '' : 's'} in this case:`

  const closing = conflicting
    ? 'The records above state different values; CaseSignal does not resolve which is correct.'
    : ''

  return {
    text: [opening, ...lines, closing].filter(Boolean).join('\n\n'),
    usedChunkIds: picked.map((p) => p.chunk.id),
    insufficient: false,
  }
}

function detectConflict(sentences: string[]): boolean {
  const dates = new Set(sentences.flatMap((s) => findDates(s).map((d) => d.iso)))
  if (dates.size > 1) return true
  const amounts = new Set(sentences.flatMap((s) => findAmounts(s).map((a) => String(a.value))))
  return amounts.size > 1
}

/* -------------------------------------------------------- missing records */

export function localMissingEvidence(input: {
  objective: string
  sourceTitles: string[]
  openQuestions: string[]
  discrepancySubjects: string[]
}): MissingEvidenceResult {
  const have = input.sourceTitles.join(' ').toLowerCase()
  const suggestions: MissingEvidenceResult['suggestions'] = []

  const candidates: { record: string; reason: string; priority: 'low' | 'medium' | 'high'; unless: RegExp }[] = [
    {
      record: 'Signed delivery receipt or bill of lading',
      reason: 'Would establish the date and quantity actually received, which the current records state differently.',
      priority: 'high',
      unless: /receipt|bill of lading|packing/,
    },
    {
      record: 'Executed contract or purchase order',
      reason: 'Would fix the agreed terms, quantities and delivery dates against which the other records can be read.',
      priority: 'high',
      unless: /contract|purchase order|\bpo\b/,
    },
    {
      record: 'Payment remittance or bank record',
      reason: 'Would show what was paid and when, separately from what was invoiced.',
      priority: 'medium',
      unless: /remittance|bank|payment record/,
    },
    {
      record: 'Complete meeting minutes for the surrounding period',
      reason: 'Would place the recorded decisions in sequence and show any amendment.',
      priority: 'medium',
      unless: /minutes/,
    },
    {
      record: 'Vendor correspondence covering the schedule change',
      reason: 'Would document how and when the schedule was revised, which no current record states.',
      priority: 'medium',
      unless: /email|correspondence|letter/,
    },
    {
      record: 'Vendor registration or business filing',
      reason: 'Would confirm the organization’s legal name and resolve the naming difference between records.',
      priority: 'low',
      unless: /registration|filing|certificate/,
    },
  ]

  for (const candidate of candidates) {
    if (candidate.unless.test(have)) continue
    suggestions.push({ record: candidate.record, reason: candidate.reason, priority: candidate.priority })
  }

  for (const subject of input.discrepancySubjects.slice(0, 2)) {
    suggestions.push({
      record: `Any additional record documenting the ${subject}`,
      reason: `The current records state different values for the ${subject}; a further record would show which is authoritative.`,
      priority: 'medium',
    })
  }

  return { suggestions: suggestions.slice(0, 8) }
}

/* ----------------------------------------------------------------- utils */

function truncateWords(text: string, words: number): string {
  const parts = text.split(/\s+/)
  if (parts.length <= words) return text
  return `${parts.slice(0, words).join(' ')}…`
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}
