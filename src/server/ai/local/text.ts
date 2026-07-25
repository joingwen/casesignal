/**
 * Deterministic text analysis used by the local (no-API-key) analysis mode and
 * by the retrieval layer in every mode.
 *
 * These helpers are intentionally conservative: they surface what the text
 * literally contains — dates, amounts, quantities, named parties, statements —
 * and never infer intent, motive or wrongdoing.
 */

export const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

const MONTH_INDEX = new Map(MONTHS.map((m, i) => [m, i]))
MONTHS.forEach((m, i) => MONTH_INDEX.set(m.slice(0, 3), i))

export interface DateMention {
  iso: string
  raw: string
  index: number
  precision: 'exact' | 'estimated'
}

const DATE_PATTERNS: { re: RegExp; build: (m: RegExpMatchArray) => string | null }[] = [
  {
    // September 10, 2024 / Sept 10 2024
    re: /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi,
    build: (m) => {
      const month = MONTH_INDEX.get(m[1]!.toLowerCase().slice(0, 3))
      if (month === undefined) return null
      return isoDate(Number(m[3]), month, Number(m[2]))
    },
  },
  {
    // 10 September 2024
    re: /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?,?\s+(\d{4})\b/gi,
    build: (m) => {
      const month = MONTH_INDEX.get(m[2]!.toLowerCase().slice(0, 3))
      if (month === undefined) return null
      return isoDate(Number(m[3]), month, Number(m[1]))
    },
  },
  {
    // 2024-09-10
    re: /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    build: (m) => isoDate(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
  },
  {
    // 09/10/2024 (US convention, the convention used across the demo records)
    re: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
    build: (m) => isoDate(Number(m[3]), Number(m[1]) - 1, Number(m[2])),
  },
]

function isoDate(year: number, monthIndex: number, day: number): string | null {
  if (!Number.isFinite(year) || year < 1900 || year > 2200) return null
  if (monthIndex < 0 || monthIndex > 11) return null
  if (day < 1 || day > 31) return null
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function findDates(text: string): DateMention[] {
  const found: DateMention[] = []
  for (const pattern of DATE_PATTERNS) {
    for (const match of text.matchAll(pattern.re)) {
      const iso = pattern.build(match)
      if (!iso) continue
      found.push({
        iso,
        raw: match[0],
        index: match.index ?? 0,
        precision: /\b(around|approximately|on or about|circa|est\.?)\b/i.test(
          text.slice(Math.max(0, (match.index ?? 0) - 24), match.index ?? 0),
        )
          ? 'estimated'
          : 'exact',
      })
    }
  }
  return found.sort((a, b) => a.index - b.index)
}

export interface AmountMention {
  value: number
  raw: string
  index: number
  currency: boolean
}

export function findAmounts(text: string): AmountMention[] {
  const out: AmountMention[] = []
  for (const match of text.matchAll(/\$\s?([\d,]+(?:\.\d{1,2})?)/g)) {
    const value = Number(match[1]!.replace(/,/g, ''))
    if (Number.isFinite(value)) out.push({ value, raw: match[0], index: match.index ?? 0, currency: true })
  }
  for (const match of text.matchAll(/\b(\d{1,3}(?:,\d{3})+|\d+)\s+(units?|items?|chairs?|tables?|devices?|scanners?|machines?|copies)\b/gi)) {
    const value = Number(match[1]!.replace(/,/g, ''))
    if (Number.isFinite(value)) out.push({ value, raw: match[0], index: match.index ?? 0, currency: false })
  }
  return out.sort((a, b) => a.index - b.index)
}

const ORG_SUFFIXES =
  /(inc\.?|llc|l\.l\.c\.|ltd\.?|corp\.?|corporation|company|co\.|supply|solutions|systems|partners|group|associates|department|dept\.?|office|board|commission|county|city|district|authority|agency|committee|council)/i

const TITLE_WORDS =
  /(director|manager|clerk|officer|administrator|coordinator|supervisor|chair|chairperson|analyst|auditor|counsel|attorney|secretary|treasurer|president|principal|deputy|assistant)/i

const STOPWORD_STARTS = new Set([
  'The',
  'This',
  'That',
  'These',
  'Those',
  'A',
  'An',
  'It',
  'They',
  'We',
  'I',
  'In',
  'On',
  'At',
  'For',
  'From',
  'To',
  'By',
  'With',
  'As',
  'If',
  'When',
  'While',
  'After',
  'Before',
  'During',
  'Per',
  'Note',
  'Subject',
  'Date',
  'Page',
  'Section',
  'Item',
  'Total',
  'Attachment',
  'Attendees',
  'Prepared',
  'Reference',
])

export interface EntityMention {
  name: string
  type: 'person' | 'organization' | 'location' | 'document' | 'other'
  index: number
}

/** Proper-noun sequences with light type inference from surrounding cues. */
export function findEntities(text: string): EntityMention[] {
  const out: EntityMention[] = []
  const pattern = /\b([A-Z][A-Za-z&.'-]*(?:\s+(?:of|for|and|de|the)\s+)?(?:\s+[A-Z][A-Za-z&.'-]*){0,4})\b/g
  for (const match of text.matchAll(pattern)) {
    let name = match[1]!.trim().replace(/[.,;:]+$/, '')
    if (name.length < 4) continue
    const first = name.split(/\s+/)[0]!
    if (STOPWORD_STARTS.has(first) && name.split(/\s+/).length < 3) continue
    if (STOPWORD_STARTS.has(first)) name = name.split(/\s+/).slice(1).join(' ')
    if (name.split(/\s+/).length < 2 && !ORG_SUFFIXES.test(name)) continue
    if (name.length > 70) continue

    const before = text.slice(Math.max(0, (match.index ?? 0) - 40), match.index ?? 0)
    let type: EntityMention['type'] = 'other'
    if (ORG_SUFFIXES.test(name)) type = 'organization'
    else if (TITLE_WORDS.test(before) || TITLE_WORDS.test(text.slice((match.index ?? 0) + name.length, (match.index ?? 0) + name.length + 40)))
      type = 'person'
    else if (/\b(County|City|District|Building|Room|Warehouse|Facility)\b/.test(name)) type = 'location'
    else if (/\.(pdf|docx|xlsx|csv)$/i.test(name)) type = 'document'
    else if (name.split(/\s+/).length === 2 && /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(name)) type = 'person'

    out.push({ name, type, index: match.index ?? 0 })
  }
  return out
}

export function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|co|the)\b\.?/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function splitSentences(text: string): { text: string; index: number }[] {
  const out: { text: string; index: number }[] = []
  const normalized = text.replace(/\r/g, '')
  let cursor = 0
  for (const raw of normalized.split(/(?<=[.!?])\s+|\n{2,}|\n(?=[-•*•])/)) {
    const trimmed = raw.trim()
    const index = normalized.indexOf(raw, cursor)
    cursor = index >= 0 ? index + raw.length : cursor
    if (trimmed.length < 12) continue
    out.push({ text: trimmed.replace(/\s+/g, ' '), index: Math.max(0, index) })
  }
  return out
}

const STOP_WORDS = new Set(
  `a an the and or but if then than that this those these of in on at to for from by with as is are was were be been being it its their our your his her they we you i not no do does did have has had will would can could should may might must about into over under between during per each other more most some such only own same so also there here when where which who whom what how`.split(
    /\s+/,
  ),
)

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9$/.\- ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
}

/** Lexical scoring used for local retrieval and reranking (BM25-style idf). */
export function bm25Score(queryTokens: string[], docTokens: string[], idf: Map<string, number>, avgLen: number): number {
  const k1 = 1.4
  const b = 0.72
  const counts = new Map<string, number>()
  for (const token of docTokens) counts.set(token, (counts.get(token) ?? 0) + 1)
  let score = 0
  for (const token of queryTokens) {
    const tf = counts.get(token)
    if (!tf) continue
    const weight = idf.get(token) ?? 0.4
    score += weight * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * docTokens.length) / Math.max(1, avgLen))))
  }
  return score
}

export function buildIdf(documents: string[][]): Map<string, number> {
  const df = new Map<string, number>()
  for (const doc of documents) {
    for (const token of new Set(doc)) df.set(token, (df.get(token) ?? 0) + 1)
  }
  const n = Math.max(1, documents.length)
  const idf = new Map<string, number>()
  for (const [token, count] of df) idf.set(token, Math.log(1 + (n - count + 0.5) / (count + 0.5)))
  return idf
}

/** Cosine similarity for embedding vectors. */
export function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i += 1) {
    dot += a[i]! * b[i]!
    na += a[i]! * a[i]!
    nb += b[i]! * b[i]!
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

/** Trims an excerpt to a readable window around the most relevant sentence. */
export function focusExcerpt(text: string, queryTokens: string[], maxChars = 320): string {
  const sentences = splitSentences(text)
  if (sentences.length === 0) return text.slice(0, maxChars)
  let best = sentences[0]!
  let bestScore = -1
  for (const sentence of sentences) {
    const tokens = new Set(tokenize(sentence.text))
    const score = queryTokens.reduce((acc, t) => acc + (tokens.has(t) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      best = sentence
    }
  }
  if (best.text.length <= maxChars) {
    // Pad with neighbouring context when there is room.
    const idx = sentences.indexOf(best)
    let result = best.text
    let after = idx + 1
    while (after < sentences.length && result.length + sentences[after]!.text.length + 1 <= maxChars) {
      result += ` ${sentences[after]!.text}`
      after += 1
    }
    return result
  }
  return `${best.text.slice(0, maxChars - 1)}…`
}
