import 'server-only'

import { and, desc, eq, isNull } from 'drizzle-orm'
import { getDb } from '@/server/db'
import {
  cases,
  claimEvidence,
  claims,
  entities,
  sourceChunks,
  sourcePages,
  sourceSheets,
  sources,
  timelineEventSources,
  timelineEvents,
} from '@/server/db/schema'
import { nextSourceLabel } from '@/lib/citations'
import { PROCESSING_STATUS_META, type ProcessingStatus, type SourceFormat, type SourceKind } from '@/lib/domain'
import { embedDocuments } from '@/server/retrieval/embeddings'
import { capabilities } from '@/lib/env'
import { extractClaims, extractEntities, extractTimeline, summarizeSource, type ServiceChunk } from '@/server/ai/services'
import { normalizeEntityName } from '@/server/ai/local/text'
import { recordUsage } from '@/server/ai/ledger'
import { activeModel, activeProvider, describeImage } from '@/server/ai/provider'
import { parseBuffer, parseHtmlDocument, parsePlainText, type ParseResult } from './parsers'

/**
 * Source ingestion.
 *
 * Extract → chunk with locators → index → analyse. Each stage updates the
 * source's processing status so the workspace can show real progress, and a
 * failure at any stage leaves the source in an inspectable state with a message
 * an analyst can act on, rather than silently discarding the record.
 */

const TARGET_CHUNK_CHARS = 900
const MAX_CHUNK_CHARS = 1500

export interface CreateSourceInput {
  caseId: string
  title: string
  kind: SourceKind
  format: SourceFormat
  originalFilename?: string | null
  mimeType?: string | null
  byteSize?: number
  storageKey?: string | null
  sourceUrl?: string | null
}

export async function createSourceRecord(input: CreateSourceInput) {
  const db = await getDb()
  const existing = await db
    .select({ label: sources.label })
    .from(sources)
    .where(eq(sources.caseId, input.caseId))
  const label = nextSourceLabel(existing.map((r) => r.label))

  const order = await db
    .select({ sortOrder: sources.sortOrder })
    .from(sources)
    .where(eq(sources.caseId, input.caseId))
    .orderBy(desc(sources.sortOrder))
    .limit(1)

  const inserted = await db
    .insert(sources)
    .values({
      caseId: input.caseId,
      label,
      title: input.title.slice(0, 200),
      kind: input.kind,
      format: input.format,
      originalFilename: input.originalFilename ?? null,
      mimeType: input.mimeType ?? null,
      byteSize: input.byteSize ?? 0,
      storageKey: input.storageKey ?? null,
      sourceUrl: input.sourceUrl ?? null,
      status: 'queued',
      statusDetail: PROCESSING_STATUS_META.queued.description,
      sortOrder: (order[0]?.sortOrder ?? 0) + 1,
    })
    .returning()

  return inserted[0]!
}

async function setStatus(sourceId: string, status: ProcessingStatus, detail?: string) {
  const db = await getDb()
  await db
    .update(sources)
    .set({
      status,
      statusDetail: detail ?? PROCESSING_STATUS_META[status].description,
      updatedAt: new Date(),
    })
    .where(eq(sources.id, sourceId))
}

export interface ProcessInput {
  sourceId: string
  caseId: string
  organizationId: string
  /** Raw bytes for file sources. */
  buffer?: Buffer
  /** Raw text for pasted notes. */
  text?: string
  /** Fetched HTML for URL sources. */
  html?: string
}

/**
 * Runs the full pipeline for one source. Safe to re-run: existing derived rows
 * for the source are replaced, so "Retry" is always a clean re-processing.
 */
export async function processSource(input: ProcessInput): Promise<{ status: ProcessingStatus; warnings: string[] }> {
  const db = await getDb()
  const sourceRows = await db.select().from(sources).where(eq(sources.id, input.sourceId)).limit(1)
  const source = sourceRows[0]
  if (!source) throw new Error('Source not found.')

  try {
    await setStatus(source.id, 'extracting')

    let parsed: ParseResult
    if (source.format === 'html' && input.html) {
      parsed = await parseHtmlDocument({ html: input.html, url: source.sourceUrl ?? '' })
    } else if (input.text != null) {
      parsed = parsePlainText({ text: input.text, title: source.title, format: source.format as SourceFormat })
    } else if (input.buffer) {
      parsed = await parseBuffer({
        buffer: input.buffer,
        filename: source.originalFilename ?? source.title,
        mimeType: source.mimeType ?? 'application/octet-stream',
        format: source.format as SourceFormat,
      })
      if (source.format === 'image') {
        parsed = await extractImageText(parsed, input.buffer, source.mimeType ?? 'image/png')
      }
    } else {
      throw new Error('No content was supplied for this source.')
    }

    const warnings = [...parsed.warnings]

    // Clear anything derived from a previous run of this source.
    await clearDerived(source.id)

    if (parsed.pages.length > 0) {
      await db.insert(sourcePages).values(
        parsed.pages.map((page) => ({
          sourceId: source.id,
          pageNumber: page.pageNumber,
          text: page.text,
        })),
      )
    }

    if (parsed.sheets.length > 0) {
      await db.insert(sourceSheets).values(
        parsed.sheets.map((sheet) => ({
          sourceId: source.id,
          name: sheet.name,
          sheetIndex: sheet.index,
          headers: sheet.headers,
          rows: sheet.rows.slice(0, 5000),
          rowCount: sheet.rows.length,
        })),
      )
    }

    await setStatus(source.id, 'indexing')

    const chunkInputs = buildChunks(parsed)
    if (chunkInputs.length === 0) {
      await db
        .update(sources)
        .set({
          status: 'needs_review',
          statusDetail:
            'No machine-readable text could be extracted from this record. It can still be cited manually, but it will not appear in search or analysis.',
          pageCount: parsed.pageCount,
          wordCount: parsed.wordCount,
          extractionConfidence: parsed.confidence,
          metadata: parsed.metadata,
          updatedAt: new Date(),
        })
        .where(eq(sources.id, source.id))
      return { status: 'needs_review', warnings }
    }

    const embeddings = capabilities.embeddings ? await embedDocuments(chunkInputs.map((c) => c.text)) : null

    const insertedChunks = await db
      .insert(sourceChunks)
      .values(
        chunkInputs.map((chunk, index) => ({
          sourceId: source.id,
          caseId: source.caseId,
          chunkIndex: index,
          text: chunk.text,
          pageNumber: chunk.pageNumber ?? null,
          sheetName: chunk.sheetName ?? null,
          rowStart: chunk.rowStart ?? null,
          rowEnd: chunk.rowEnd ?? null,
          sectionPath: chunk.sectionPath ?? null,
          timecode: chunk.timecode ?? null,
          regionLabel: chunk.regionLabel ?? null,
          charStart: chunk.charStart,
          charEnd: chunk.charEnd,
          tokenEstimate: Math.ceil(chunk.text.length / 4),
          embedding: embeddings?.[index] ?? null,
        })),
      )
      .returning()

    await setStatus(source.id, 'analyzing')

    const serviceChunks: ServiceChunk[] = insertedChunks.map((chunk) => ({
      id: chunk.id,
      sourceId: source.id,
      sourceLabel: source.label,
      sourceTitle: source.title,
      format: source.format as SourceFormat,
      locator: '',
      text: chunk.text,
      pageNumber: chunk.pageNumber,
    }))

    const caseRow = await db.select({ objective: cases.objective }).from(cases).where(eq(cases.id, source.caseId)).limit(1)
    const objective = caseRow[0]?.objective ?? ''

    const summary = await summarizeSource({
      caseId: source.caseId,
      sourceId: source.id,
      title: source.title,
      format: source.format,
      chunks: serviceChunks,
    })

    /*
     * The three extractors run independently. A model that fumbles one schema
     * must not discard the work the others completed: previously a single
     * malformed field marked the whole source `failed` and threw away its
     * claims, entities and index. Partial failure now degrades to
     * `needs_review` with the specific step named.
     */
    const extractors: [string, Promise<unknown>][] = [
      ['entities', persistEntities(source.caseId, serviceChunks)],
      ['claims', persistClaims(source.caseId, objective, serviceChunks)],
      ['timeline', persistTimeline(source.caseId, source.id, serviceChunks)],
    ]
    const settled = await Promise.allSettled(extractors.map(([, promise]) => promise))
    const failedSteps = settled
      .map((result, index) => (result.status === 'rejected' ? extractors[index]![0] : null))
      .filter((name): name is string => name !== null)

    for (const [index, result] of settled.entries()) {
      if (result.status === 'rejected') {
        console.warn(`[casesignal] ${extractors[index]![0]} extraction failed for source ${source.id}`, result.reason)
      }
    }

    if (failedSteps.length > 0) warnings.push(`Some analysis steps did not complete: ${failedSteps.join(', ')}.`)

    const finalStatus: ProcessingStatus =
      failedSteps.length > 0 || parsed.confidence < 0.4 ? 'needs_review' : 'complete'

    await db
      .update(sources)
      .set({
        status: finalStatus,
        statusDetail:
          failedSteps.length > 0
            ? `Indexed and citable, but ${failedSteps.join(' and ')} extraction did not complete. Retry to run the missing steps.`
            : finalStatus === 'needs_review'
              ? 'Extracted with low confidence — read the original before relying on excerpts from this record.'
              : PROCESSING_STATUS_META.complete.description,
        summary: summary.summary,
        keyPoints: summary.keyPoints,
        pageCount: parsed.pageCount,
        wordCount: parsed.wordCount,
        extractionConfidence: parsed.confidence,
        metadata: { ...parsed.metadata, documentType: summary.documentType },
        updatedAt: new Date(),
      })
      .where(eq(sources.id, source.id))

    await recordUsage({
      organizationId: input.organizationId,
      caseId: source.caseId,
      metric: 'processed_pages',
      quantity: Math.max(1, parsed.pageCount),
      metadata: { sourceId: source.id, format: source.format },
    })
    if (source.byteSize > 0) {
      await recordUsage({
        organizationId: input.organizationId,
        caseId: source.caseId,
        metric: 'storage_bytes',
        quantity: source.byteSize,
        metadata: { sourceId: source.id },
      })
    }

    return { status: finalStatus, warnings }
  } catch (error) {
    const message =
      error instanceof Error && error.message.length < 400
        ? error.message
        : 'This record could not be processed. Try re-uploading it, or add the text directly as a note.'
    await setStatus(input.sourceId, 'failed', message)
    return { status: 'failed', warnings: [message] }
  }
}

async function clearDerived(sourceId: string) {
  const db = await getDb()
  const existingChunks = await db.select({ id: sourceChunks.id }).from(sourceChunks).where(eq(sourceChunks.sourceId, sourceId))
  const chunkIds = existingChunks.map((c) => c.id)
  if (chunkIds.length > 0) {
    // Evidence rows cascade from chunks; timeline links do too.
    await db.delete(claimEvidence).where(eq(claimEvidence.sourceId, sourceId))
    await db.delete(timelineEventSources).where(eq(timelineEventSources.sourceId, sourceId))
  }
  await db.delete(sourceChunks).where(eq(sourceChunks.sourceId, sourceId))
  await db.delete(sourcePages).where(eq(sourcePages.sourceId, sourceId))
  await db.delete(sourceSheets).where(eq(sourceSheets.sourceId, sourceId))
}

interface ChunkInput {
  text: string
  pageNumber?: number | null
  sheetName?: string | null
  rowStart?: number | null
  rowEnd?: number | null
  sectionPath?: string | null
  timecode?: string | null
  regionLabel?: string | null
  charStart: number
  charEnd: number
}

/**
 * Groups parsed segments into retrieval-sized chunks without ever merging
 * across a locator boundary — a chunk must be citable to one exact location.
 */
function buildChunks(parsed: ParseResult): ChunkInput[] {
  const chunks: ChunkInput[] = []
  let buffer: ChunkInput | null = null
  let cursor = 0

  const locatorKey = (s: (typeof parsed.segments)[number]) =>
    [s.pageNumber, s.sheetName, s.sectionPath, s.timecode, s.regionLabel].join('|')

  for (const segment of parsed.segments) {
    const text = segment.text.trim()
    if (!text) continue
    const start = cursor
    cursor += text.length + 1

    if (buffer && locatorKey(segment) === locatorKey(buffer as never) && buffer.text.length + text.length <= MAX_CHUNK_CHARS) {
      buffer.text = `${buffer.text}\n${text}`
      buffer.charEnd = start + text.length
      buffer.rowEnd = segment.rowEnd ?? buffer.rowEnd
      if (buffer.text.length >= TARGET_CHUNK_CHARS) {
        chunks.push(buffer)
        buffer = null
      }
      continue
    }

    if (buffer) chunks.push(buffer)
    buffer = {
      text,
      pageNumber: segment.pageNumber ?? null,
      sheetName: segment.sheetName ?? null,
      rowStart: segment.rowStart ?? null,
      rowEnd: segment.rowEnd ?? null,
      sectionPath: segment.sectionPath ?? null,
      timecode: segment.timecode ?? null,
      regionLabel: segment.regionLabel ?? null,
      charStart: start,
      charEnd: start + text.length,
    }
    if (buffer.text.length >= TARGET_CHUNK_CHARS) {
      chunks.push(buffer)
      buffer = null
    }
  }
  if (buffer) chunks.push(buffer)
  return chunks.filter((c) => c.text.trim().length > 0)
}

const VISION_SYSTEM =
  'You transcribe document images for an evidence workspace. Transcribe visible text verbatim, preserving reading order and table structure. Do not summarise, correct, complete or interpret anything. If a passage is illegible write [illegible]. Divide the transcription into numbered regions with a line "## Region N" where N starts at 1, one region per visually distinct block (header, table, paragraph, signature block).'

/**
 * Reads text out of an image using whichever vision-capable provider is
 * configured. Without one the image is kept as a source and flagged for manual
 * review rather than being given invented content.
 */
async function extractImageText(parsed: ParseResult, buffer: Buffer, mimeType: string): Promise<ParseResult> {
  if (!capabilities.ai) {
    return {
      ...parsed,
      warnings: [
        ...parsed.warnings,
        'Text was not read from this image because vision extraction requires an AI provider key (OPENAI_API_KEY or ANTHROPIC_API_KEY). The image is stored and can be cited manually.',
      ],
      confidence: 0,
    }
  }

  const { text: raw } = await describeImage({
    buffer,
    mimeType,
    system: VISION_SYSTEM,
    prompt: 'Transcribe this document image.',
    maxTokens: 3000,
  })
  const text = raw.trim()

  if (!text) return { ...parsed, warnings: [...parsed.warnings, 'No text was legible in this image.'], confidence: 0 }

  const regions = text.split(/^##\s*Region\s*(\d+)\s*$/im)
  const segments: ParseResult['segments'] = []
  for (let i = 1; i < regions.length; i += 2) {
    const label = regions[i]!.trim()
    const body = (regions[i + 1] ?? '').trim()
    if (body) segments.push({ text: body, pageNumber: 1, regionLabel: label })
  }
  if (segments.length === 0) segments.push({ text, pageNumber: 1, regionLabel: '1' })

  const illegible = (text.match(/\[illegible\]/gi) ?? []).length
  return {
    ...parsed,
    text,
    segments,
    pages: [{ pageNumber: 1, text }],
    pageCount: 1,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    confidence: illegible > 3 ? 0.45 : 0.82,
    metadata: {
      ...parsed.metadata,
      visionExtracted: true,
      visionProvider: activeProvider(),
      visionModel: activeModel(),
      illegibleMarkers: illegible,
    },
  }
}

/* --------------------------------------------------------- persistence */

async function persistEntities(caseId: string, chunks: ServiceChunk[]) {
  const db = await getDb()
  const result = await extractEntities({ caseId, chunks })
  for (const entity of result.entities) {
    const normalized = normalizeEntityName(entity.name)
    if (!normalized) continue
    const existing = await db
      .select()
      .from(entities)
      .where(and(eq(entities.caseId, caseId), eq(entities.normalizedName, normalized)))
      .limit(1)

    if (existing[0]) {
      await db
        .update(entities)
        .set({
          mentionCount: existing[0].mentionCount + entity.chunkIds.length,
          aliases: Array.from(new Set([...existing[0].aliases, ...entity.aliases])).slice(0, 8),
          updatedAt: new Date(),
        })
        .where(eq(entities.id, existing[0].id))
    } else {
      await db.insert(entities).values({
        caseId,
        name: entity.name,
        normalizedName: normalized,
        type: entity.type,
        role: entity.role,
        aliases: entity.aliases,
        description: entity.description,
        mentionCount: entity.chunkIds.length,
        firstSeenChunkId: entity.chunkIds[0] ?? null,
      })
    }
  }
}

async function persistClaims(caseId: string, objective: string, chunks: ServiceChunk[]) {
  const db = await getDb()
  const result = await extractClaims({ caseId, objective, chunks })
  const chunkToSource = new Map(chunks.map((c) => [c.id, c.sourceId]))

  for (const claim of result.claims) {
    const inserted = await db
      .insert(claims)
      .values({
        caseId,
        statement: claim.statement,
        category: claim.category,
        status: claim.evidence.some((e) => e.role === 'contradicting') ? 'partially_supported' : 'supported',
        confidence: claim.confidence,
        materiality: claim.materiality,
        origin: 'extracted',
      })
      .returning()
    const claimId = inserted[0]!.id

    for (const evidence of claim.evidence) {
      const sourceId = chunkToSource.get(evidence.chunkId)
      if (!sourceId) continue
      await db
        .insert(claimEvidence)
        .values({
          claimId,
          chunkId: evidence.chunkId,
          sourceId,
          role: evidence.role,
          excerpt: evidence.excerpt,
          confidence: claim.confidence,
        })
        .onConflictDoNothing()
    }
  }
}

async function persistTimeline(caseId: string, sourceId: string, chunks: ServiceChunk[]) {
  const db = await getDb()
  const result = await extractTimeline({ caseId, sourceId, chunks })

  for (const event of result.events) {
    const inserted = await db
      .insert(timelineEvents)
      .values({
        caseId,
        occurredOn: event.occurredOn,
        occurredEndOn: event.occurredEndOn,
        timeOfDay: event.timeOfDay,
        precision: event.precision,
        title: event.title,
        description: event.description,
        category: event.category,
        confidence: event.confidence,
      })
      .returning()
    const eventId = inserted[0]!.id

    for (const chunkId of event.chunkIds) {
      const chunk = chunks.find((c) => c.id === chunkId)
      if (!chunk) continue
      await db
        .insert(timelineEventSources)
        .values({ eventId, chunkId, sourceId: chunk.sourceId, excerpt: chunk.text.slice(0, 400) })
        .onConflictDoNothing()
    }
  }
}

/** Sources currently mid-pipeline, used to drive the workspace progress state. */
export async function activeProcessingCount(caseId: string) {
  const db = await getDb()
  const rows = await db
    .select({ status: sources.status })
    .from(sources)
    .where(and(eq(sources.caseId, caseId), isNull(sources.deletedAt)))
  return rows.filter((r) => !PROCESSING_STATUS_META[r.status as ProcessingStatus].terminal).length
}
