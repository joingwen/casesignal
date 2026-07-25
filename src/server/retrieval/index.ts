import 'server-only'

import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { getDb } from '@/server/db'
import { sourceChunks, sources } from '@/server/db/schema'
import { formatLocator } from '@/lib/citations'
import type { SourceFormat } from '@/lib/domain'
import { bm25Score, buildIdf, cosine, focusExcerpt, tokenize } from '@/server/ai/local/text'
import { embedQuery } from './embeddings'
import { capabilities } from '@/lib/env'

export interface RetrievedChunk {
  id: string
  sourceId: string
  sourceLabel: string
  sourceTitle: string
  format: SourceFormat
  locator: string
  text: string
  excerpt: string
  pageNumber: number | null
  sheetName: string | null
  rowStart: number | null
  rowEnd: number | null
  sectionPath: string | null
  timecode: string | null
  regionLabel: string | null
  score: number
  matchedBy: ('lexical' | 'semantic' | 'exact')[]
}

export interface RetrievalOptions {
  caseId: string
  query: string
  limit?: number
  /** Restrict retrieval to specific sources (used by "compare these two records"). */
  sourceIds?: string[]
  /** Maximum excerpts drawn from any single source, so one record cannot crowd out the rest. */
  perSourceCap?: number
  /** Chunk ids to bias upward — typically what the analyst currently has open. */
  focusChunkIds?: string[]
}

/**
 * Hybrid retrieval.
 *
 * Postgres full-text search is the mandatory path and always runs. When Voyage
 * embeddings are configured, semantic similarity is blended in and the results
 * are reranked lexically. Source diversity is enforced last so an answer is
 * never built from a single record when others are relevant.
 */
export async function retrieve(options: RetrievalOptions): Promise<RetrievedChunk[]> {
  const limit = options.limit ?? 12
  const perSourceCap = options.perSourceCap ?? 4
  const db = await getDb()

  const sourceRows = await db
    .select({
      id: sources.id,
      label: sources.label,
      title: sources.title,
      format: sources.format,
    })
    .from(sources)
    .where(and(eq(sources.caseId, options.caseId), isNull(sources.deletedAt)))

  const sourceById = new Map(sourceRows.map((s) => [s.id, s]))
  if (sourceById.size === 0) return []

  const allowedSourceIds = options.sourceIds?.filter((id) => sourceById.has(id)) ?? Array.from(sourceById.keys())
  if (allowedSourceIds.length === 0) return []

  const candidates = new Map<string, { row: ChunkRow; lexical: number; semantic: number; exact: number }>()

  /* --- 1. Full-text ---------------------------------------------------- */
  const ftsQuery = options.query.trim()
  if (ftsQuery.length > 0) {
    const rows = await db.execute<ChunkRow & { rank: number }>(sql`
      select c.id, c.source_id, c.text, c.page_number, c.sheet_name, c.row_start, c.row_end,
             c.section_path, c.timecode, c.region_label, c.chunk_index,
             ts_rank_cd(c.search_vector, websearch_to_tsquery('english', ${ftsQuery})) as rank
      from source_chunks c
      where c.case_id = ${options.caseId}
        and c.source_id = any(${sql.raw(`ARRAY[${allowedSourceIds.map((id) => `'${id}'::uuid`).join(',')}]`)})
        and c.search_vector @@ websearch_to_tsquery('english', ${ftsQuery})
      order by rank desc
      limit ${Math.max(limit * 4, 40)}
    `)
    for (const row of toRows<ChunkRow & { rank: number }>(rows)) {
      candidates.set(row.id, { row, lexical: Number(row.rank) || 0.01, semantic: 0, exact: 0 })
    }
  }

  /* --- 2. Exact-token pass (dates, amounts, identifiers) --------------- */
  const exactTerms = extractExactTerms(options.query)
  if (exactTerms.length > 0) {
    const clauses = exactTerms.map((term) => sql`c.text ilike ${'%' + term + '%'}`)
    const rows = await db.execute<ChunkRow>(sql`
      select c.id, c.source_id, c.text, c.page_number, c.sheet_name, c.row_start, c.row_end,
             c.section_path, c.timecode, c.region_label, c.chunk_index
      from source_chunks c
      where c.case_id = ${options.caseId}
        and c.source_id = any(${sql.raw(`ARRAY[${allowedSourceIds.map((id) => `'${id}'::uuid`).join(',')}]`)})
        and (${sql.join(clauses, sql` or `)})
      limit 40
    `)
    for (const row of toRows<ChunkRow>(rows)) {
      const existing = candidates.get(row.id)
      if (existing) existing.exact = 1
      else candidates.set(row.id, { row, lexical: 0, semantic: 0, exact: 1 })
    }
  }

  /* --- 3. Semantic (optional) ------------------------------------------ */
  if (capabilities.embeddings && ftsQuery.length > 0) {
    const vector = await embedQuery(ftsQuery)
    if (vector) {
      const embedded = await db
        .select({
          id: sourceChunks.id,
          sourceId: sourceChunks.sourceId,
          text: sourceChunks.text,
          pageNumber: sourceChunks.pageNumber,
          sheetName: sourceChunks.sheetName,
          rowStart: sourceChunks.rowStart,
          rowEnd: sourceChunks.rowEnd,
          sectionPath: sourceChunks.sectionPath,
          timecode: sourceChunks.timecode,
          regionLabel: sourceChunks.regionLabel,
          chunkIndex: sourceChunks.chunkIndex,
          embedding: sourceChunks.embedding,
        })
        .from(sourceChunks)
        .where(and(eq(sourceChunks.caseId, options.caseId), inArray(sourceChunks.sourceId, allowedSourceIds)))
        .limit(4000)

      const scored = embedded
        .filter((r) => Array.isArray(r.embedding) && r.embedding.length > 0)
        .map((r) => ({ row: r, score: cosine(vector, r.embedding as number[]) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(limit * 3, 30))

      for (const { row, score } of scored) {
        if (score < 0.2) continue
        const normalized: ChunkRow = {
          id: row.id,
          source_id: row.sourceId,
          text: row.text,
          page_number: row.pageNumber,
          sheet_name: row.sheetName,
          row_start: row.rowStart,
          row_end: row.rowEnd,
          section_path: row.sectionPath,
          timecode: row.timecode,
          region_label: row.regionLabel,
          chunk_index: row.chunkIndex,
        }
        const existing = candidates.get(row.id)
        if (existing) existing.semantic = score
        else candidates.set(row.id, { row: normalized, lexical: 0, semantic: score, exact: 0 })
      }
    }
  }

  /* --- 4. Fallback: no match at all ------------------------------------ */
  if (candidates.size === 0) {
    const rows = await db
      .select({
        id: sourceChunks.id,
        sourceId: sourceChunks.sourceId,
        text: sourceChunks.text,
        pageNumber: sourceChunks.pageNumber,
        sheetName: sourceChunks.sheetName,
        rowStart: sourceChunks.rowStart,
        rowEnd: sourceChunks.rowEnd,
        sectionPath: sourceChunks.sectionPath,
        timecode: sourceChunks.timecode,
        regionLabel: sourceChunks.regionLabel,
        chunkIndex: sourceChunks.chunkIndex,
      })
      .from(sourceChunks)
      .where(and(eq(sourceChunks.caseId, options.caseId), inArray(sourceChunks.sourceId, allowedSourceIds)))
      .limit(200)

    const queryTokens = tokenize(options.query)
    const docs = rows.map((r) => tokenize(r.text))
    const idf = buildIdf(docs)
    const avgLen = docs.reduce((a, d) => a + d.length, 0) / Math.max(1, docs.length)
    rows.forEach((row, i) => {
      const score = bm25Score(queryTokens, docs[i]!, idf, avgLen)
      if (score <= 0) return
      candidates.set(row.id, {
        row: {
          id: row.id,
          source_id: row.sourceId,
          text: row.text,
          page_number: row.pageNumber,
          sheet_name: row.sheetName,
          row_start: row.rowStart,
          row_end: row.rowEnd,
          section_path: row.sectionPath,
          timecode: row.timecode,
          region_label: row.regionLabel,
          chunk_index: row.chunkIndex,
        },
        lexical: score / 10,
        semantic: 0,
        exact: 0,
      })
    })
  }

  /* --- 5. Blend, rerank, diversify ------------------------------------- */
  const queryTokens = tokenize(options.query)
  const focus = new Set(options.focusChunkIds ?? [])

  const ranked = Array.from(candidates.values())
    .map(({ row, lexical, semantic, exact }) => {
      const source = sourceById.get(row.source_id)!
      const overlap = rerankOverlap(queryTokens, row.text)
      const score =
        lexical * 1.0 + semantic * 1.35 + exact * 0.9 + overlap * 0.6 + (focus.has(row.id) ? 0.5 : 0)
      const matchedBy: RetrievedChunk['matchedBy'] = []
      if (lexical > 0) matchedBy.push('lexical')
      if (semantic > 0) matchedBy.push('semantic')
      if (exact > 0) matchedBy.push('exact')
      const locator = formatLocator(
        {
          pageNumber: row.page_number,
          sheetName: row.sheet_name,
          rowStart: row.row_start,
          rowEnd: row.row_end,
          sectionPath: row.section_path,
          timecode: row.timecode,
          regionLabel: row.region_label,
        },
        source.format as SourceFormat,
      )
      return {
        id: row.id,
        sourceId: row.source_id,
        sourceLabel: source.label,
        sourceTitle: source.title,
        format: source.format as SourceFormat,
        locator,
        text: row.text,
        excerpt: focusExcerpt(row.text, queryTokens),
        pageNumber: row.page_number,
        sheetName: row.sheet_name,
        rowStart: row.row_start,
        rowEnd: row.row_end,
        sectionPath: row.section_path,
        timecode: row.timecode,
        regionLabel: row.region_label,
        score,
        matchedBy,
      } satisfies RetrievedChunk
    })
    .sort((a, b) => b.score - a.score)

  const perSource = new Map<string, number>()
  const selected: RetrievedChunk[] = []
  for (const chunk of ranked) {
    const used = perSource.get(chunk.sourceId) ?? 0
    if (used >= perSourceCap) continue
    perSource.set(chunk.sourceId, used + 1)
    selected.push(chunk)
    if (selected.length >= limit) break
  }

  // If the cap left room, fill it with the next best regardless of source.
  if (selected.length < limit) {
    for (const chunk of ranked) {
      if (selected.length >= limit) break
      if (selected.some((s) => s.id === chunk.id)) continue
      selected.push(chunk)
    }
  }

  return selected
}

/** Loads specific chunks by id, verified to belong to the case. */
export async function loadChunks(caseId: string, chunkIds: string[]): Promise<RetrievedChunk[]> {
  if (chunkIds.length === 0) return []
  const db = await getDb()
  const rows = await db
    .select({
      id: sourceChunks.id,
      sourceId: sourceChunks.sourceId,
      text: sourceChunks.text,
      pageNumber: sourceChunks.pageNumber,
      sheetName: sourceChunks.sheetName,
      rowStart: sourceChunks.rowStart,
      rowEnd: sourceChunks.rowEnd,
      sectionPath: sourceChunks.sectionPath,
      timecode: sourceChunks.timecode,
      regionLabel: sourceChunks.regionLabel,
      label: sources.label,
      title: sources.title,
      format: sources.format,
    })
    .from(sourceChunks)
    .innerJoin(sources, eq(sources.id, sourceChunks.sourceId))
    .where(and(eq(sourceChunks.caseId, caseId), inArray(sourceChunks.id, chunkIds)))

  return rows.map((row) => ({
    id: row.id,
    sourceId: row.sourceId,
    sourceLabel: row.label,
    sourceTitle: row.title,
    format: row.format as SourceFormat,
    locator: formatLocator(row, row.format as SourceFormat),
    text: row.text,
    excerpt: row.text.slice(0, 400),
    pageNumber: row.pageNumber,
    sheetName: row.sheetName,
    rowStart: row.rowStart,
    rowEnd: row.rowEnd,
    sectionPath: row.sectionPath,
    timecode: row.timecode,
    regionLabel: row.regionLabel,
    score: 1,
    matchedBy: ['exact'],
  }))
}

interface ChunkRow extends Record<string, unknown> {
  id: string
  source_id: string
  text: string
  page_number: number | null
  sheet_name: string | null
  row_start: number | null
  row_end: number | null
  section_path: string | null
  timecode: string | null
  region_label: string | null
  chunk_index: number
}

function toRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[]
  const maybe = result as { rows?: T[] }
  return maybe.rows ?? []
}

/** Dates, money, quantities and identifiers are matched literally, not stemmed. */
function extractExactTerms(query: string): string[] {
  const terms = new Set<string>()
  for (const match of query.matchAll(/\$\s?[\d,]+(?:\.\d{2})?/g)) terms.add(match[0].replace(/\s/g, ''))
  for (const match of query.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)) terms.add(match[0])
  for (const match of query.matchAll(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g)) terms.add(match[0])
  for (const match of query.matchAll(/\b[A-Z]{2,}-?\d{2,}\b/g)) terms.add(match[0])
  for (const match of query.matchAll(/\b\d{3,}\b/g)) terms.add(match[0])
  return Array.from(terms).slice(0, 6)
}

function rerankOverlap(queryTokens: string[], text: string): number {
  if (queryTokens.length === 0) return 0
  const tokens = new Set(tokenize(text))
  let hits = 0
  for (const token of queryTokens) if (tokens.has(token)) hits += 1
  return hits / queryTokens.length
}
