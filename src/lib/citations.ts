import type { SourceFormat } from './domain'

/**
 * Citation labels and integrity checking.
 *
 * A citation in CaseSignal is never free text. It is a marker (S3) plus a
 * locator derived from where the excerpt physically sits in the record, and it
 * always resolves to a stored chunk id. `verifyCitations` below is the gate
 * that runs before any generated answer is shown: a marker that does not map to
 * a chunk that was actually retrieved for this answer is removed, and the
 * sentence carrying it is downgraded rather than displayed as sourced.
 */

export interface ChunkLocator {
  pageNumber?: number | null
  sheetName?: string | null
  rowStart?: number | null
  rowEnd?: number | null
  sectionPath?: string | null
  timecode?: string | null
  regionLabel?: string | null
}

export interface CitableChunk extends ChunkLocator {
  id: string
  sourceId: string
  text: string
}

export interface CitableSource {
  id: string
  label: string
  title: string
  format: SourceFormat
}

export interface ResolvedCitation {
  marker: string
  chunkId: string
  sourceId: string
  sourceLabel: string
  sourceTitle: string
  locator: string
  excerpt: string
}

/**
 * Human-readable locator for a chunk, matching the format conventions used
 * throughout the product:
 *   PDF          → p. 14
 *   Spreadsheet  → Sheet "Invoices," row 221
 *   Transcript   → 00:14:22
 *   Webpage      → section "Contract Terms"
 *   Image        → extracted region 2
 *   Note         → (marker only)
 */
export function formatLocator(chunk: ChunkLocator, format: SourceFormat): string {
  if (chunk.timecode) return chunk.timecode
  if (chunk.sheetName) {
    const rows =
      chunk.rowStart != null && chunk.rowEnd != null && chunk.rowEnd !== chunk.rowStart
        ? `rows ${chunk.rowStart}–${chunk.rowEnd}`
        : chunk.rowStart != null
          ? `row ${chunk.rowStart}`
          : null
    return rows ? `Sheet “${chunk.sheetName},” ${rows}` : `Sheet “${chunk.sheetName}”`
  }
  if (chunk.regionLabel) return `extracted region ${chunk.regionLabel}`
  if (chunk.pageNumber != null && (format === 'pdf' || format === 'docx' || format === 'image')) {
    return `p. ${chunk.pageNumber}`
  }
  if (chunk.sectionPath) return `section “${chunk.sectionPath}”`
  if (chunk.pageNumber != null) return `p. ${chunk.pageNumber}`
  return ''
}

/** Full display citation, e.g. `[S2 Sheet “Invoices,” row 221]`. */
export function formatCitation(sourceLabel: string, locator: string): string {
  return locator ? `[${sourceLabel} ${locator}]` : `[${sourceLabel}]`
}

/** Matches `[S1]`, `[S1 p. 14]`, `[S2 Sheet “Invoices,” row 221]`, `[S1 p. 3; S2 p. 9]`. */
const CITATION_PATTERN = /\[((?:S\d+)(?:[^\][]*))\]/g
const MARKER_PATTERN = /S(\d+)/g

export interface CitationScanResult {
  markers: string[]
  spans: { start: number; end: number; raw: string; markers: string[] }[]
}

export function scanCitations(text: string): CitationScanResult {
  const spans: CitationScanResult['spans'] = []
  const markers = new Set<string>()
  for (const match of text.matchAll(CITATION_PATTERN)) {
    const raw = match[0]
    const inner = match[1] ?? ''
    const found = Array.from(inner.matchAll(MARKER_PATTERN)).map((m) => `S${m[1]}`)
    if (found.length === 0) continue
    found.forEach((m) => markers.add(m))
    spans.push({
      start: match.index ?? 0,
      end: (match.index ?? 0) + raw.length,
      raw,
      markers: found,
    })
  }
  return { markers: Array.from(markers), spans }
}

export interface VerificationInput {
  /** Model output to check. */
  text: string
  /** Chunks that were actually supplied to the model for this answer. */
  retrieved: CitableChunk[]
  sources: CitableSource[]
}

export interface VerificationResult {
  /** Text with unresolvable citation markers removed. */
  text: string
  citations: ResolvedCitation[]
  /** Markers the model produced that do not correspond to a retrieved source. */
  invalidMarkers: string[]
  /** Sentences that asserted something but carried no valid citation. */
  uncitedSentences: string[]
  /** True when nothing in the answer is supported by a retrieved excerpt. */
  unsupported: boolean
}

const INSUFFICIENT_EVIDENCE_PHRASES = [
  'do not establish',
  'does not establish',
  'no source in this case',
  'sources conflict',
  'not addressed by the available',
]

/**
 * Validates model output against the excerpts that were actually retrieved.
 *
 * Rules enforced here:
 *  · a marker must name a source that was part of this retrieval set;
 *  · the citation must resolve to a specific chunk of that source;
 *  · the displayed excerpt is taken from the stored chunk, never from the
 *    model, so an excerpt can never be paraphrased into something the record
 *    does not say.
 */
export function verifyCitations({ text, retrieved, sources }: VerificationInput): VerificationResult {
  const sourceByLabel = new Map(sources.map((s) => [s.label, s]))
  const chunksBySource = new Map<string, CitableChunk[]>()
  for (const chunk of retrieved) {
    const list = chunksBySource.get(chunk.sourceId) ?? []
    list.push(chunk)
    chunksBySource.set(chunk.sourceId, list)
  }

  const { spans } = scanCitations(text)
  const citations: ResolvedCitation[] = []
  const invalidMarkers: string[] = []
  const seen = new Set<string>()

  // Rewrite from the end so indices stay valid while we drop invalid markers.
  let output = text
  for (const span of [...spans].reverse()) {
    const valid: string[] = []
    for (const marker of span.markers) {
      const source = sourceByLabel.get(marker)
      const candidates = source ? (chunksBySource.get(source.id) ?? []) : []
      if (!source || candidates.length === 0) {
        invalidMarkers.push(marker)
        continue
      }
      valid.push(marker)
      const chunk = pickChunkForSpan(span.raw, candidates)
      const key = `${marker}:${chunk.id}`
      if (seen.has(key)) continue
      seen.add(key)
      citations.push({
        marker,
        chunkId: chunk.id,
        sourceId: source.id,
        sourceLabel: source.label,
        sourceTitle: source.title,
        locator: formatLocator(chunk, source.format),
        excerpt: chunk.text.trim(),
      })
    }

    if (valid.length === 0) {
      output = output.slice(0, span.start) + output.slice(span.end)
    } else if (valid.length !== span.markers.length) {
      output = output.slice(0, span.start) + `[${valid.join('; ')}]` + output.slice(span.end)
    }
  }

  const uncitedSentences = findUncitedAssertions(output)
  const lower = output.toLowerCase()
  const declaresInsufficient = INSUFFICIENT_EVIDENCE_PHRASES.some((p) => lower.includes(p))

  return {
    text: output.replace(/[ \t]+([.,;:])/g, '$1').replace(/\s{2,}/g, ' ').trim(),
    citations: citations.sort((a, b) => a.sourceLabel.localeCompare(b.sourceLabel, 'en', { numeric: true })),
    invalidMarkers: Array.from(new Set(invalidMarkers)),
    uncitedSentences,
    unsupported: citations.length === 0 && !declaresInsufficient,
  }
}

/**
 * When several chunks of one source were retrieved, prefer the one whose
 * locator matches the text inside the citation brackets (e.g. `p. 14`).
 */
function pickChunkForSpan(raw: string, candidates: CitableChunk[]): CitableChunk {
  const pageMatch = raw.match(/p\.?\s*(\d+)/i)
  if (pageMatch) {
    const page = Number(pageMatch[1])
    const byPage = candidates.find((c) => c.pageNumber === page)
    if (byPage) return byPage
  }
  const rowMatch = raw.match(/row\s*(\d+)/i)
  if (rowMatch) {
    const row = Number(rowMatch[1])
    const byRow = candidates.find((c) => (c.rowStart ?? -1) <= row && (c.rowEnd ?? c.rowStart ?? -1) >= row)
    if (byRow) return byRow
  }
  const timeMatch = raw.match(/(\d{2}:\d{2}:\d{2})/)
  if (timeMatch) {
    const byTime = candidates.find((c) => c.timecode === timeMatch[1])
    if (byTime) return byTime
  }
  const sectionMatch = raw.match(/section\s+[“"]([^”"]+)[”"]/i)
  if (sectionMatch) {
    const bySection = candidates.find((c) => c.sectionPath === sectionMatch[1])
    if (bySection) return bySection
  }
  return candidates[0]!
}

/**
 * Sentences that state a fact but carry no citation. These are surfaced to the
 * analyst as inference rather than silently presented as sourced.
 */
function findUncitedAssertions(text: string): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  return sentences.filter((sentence) => {
    if (sentence.length < 40) return false
    if (/\[S\d+/.test(sentence)) return false
    const lower = sentence.toLowerCase()
    if (INSUFFICIENT_EVIDENCE_PHRASES.some((p) => lower.includes(p))) return false
    // Questions, headings and hedged framing are not factual assertions.
    if (sentence.endsWith('?')) return false
    if (/^(the available|these records|no record|to resolve|next step|suggested)/i.test(sentence)) return false
    return /\b(is|are|was|were|shows?|states?|records?|lists?|reports?|indicates?|totals?)\b/i.test(sentence)
  })
}

/** Renders a compact citation trail used in briefs and exports. */
export function citationTrail(citations: ResolvedCitation[]): string {
  if (citations.length === 0) return ''
  return citations.map((c) => formatCitation(c.sourceLabel, c.locator)).join(' ')
}

/** Assigns the next per-case source label (S1, S2, …). */
export function nextSourceLabel(existingLabels: string[]): string {
  const numbers = existingLabels
    .map((label) => Number(/^S(\d+)$/.exec(label)?.[1] ?? NaN))
    .filter((n) => Number.isFinite(n))
  const max = numbers.length > 0 ? Math.max(...numbers) : 0
  return `S${max + 1}`
}
