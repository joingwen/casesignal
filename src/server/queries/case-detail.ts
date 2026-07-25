import 'server-only'

import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { getDb } from '@/server/db'
import {
  analysisRuns,
  auditLogs,
  briefSections,
  briefs,
  caseConversations,
  caseMessages,
  claimEvidence,
  claims,
  discrepancies,
  discrepancyEvidence,
  entities,
  entityRelationships,
  publicShares,
  sourceChunks,
  sourcePages,
  sourceSheets,
  sources,
  timelineEventSources,
  timelineEvents,
  userProfiles,
} from '@/server/db/schema'
import { formatLocator } from '@/lib/citations'
import {
  BRIEF_SECTION_META,
  type BriefSectionKey,
  type ClaimStatus,
  type DatePrecision,
  type DiscrepancyType,
  type EntityType,
  type EvidenceRole,
  type Materiality,
  type ProcessingStatus,
  type RelationshipType,
  type ReviewState,
  type SourceFormat,
  type SourceKind,
} from '@/lib/domain'

/* --------------------------------------------------------------- sources */

export interface SourceListItem {
  id: string
  label: string
  title: string
  kind: SourceKind
  format: SourceFormat
  status: ProcessingStatus
  statusDetail: string
  pageCount: number
  wordCount: number
  byteSize: number
  extractionConfidence: number | null
  summary: string
  keyPoints: string[]
  sourceUrl: string | null
  evidenceCount: number
  includedInShare: boolean
  createdAt: string
  updatedAt: string
}

export async function getSources(caseId: string): Promise<SourceListItem[]> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(sources)
    .where(and(eq(sources.caseId, caseId), isNull(sources.deletedAt)))
    .orderBy(asc(sources.sortOrder), asc(sources.createdAt))

  if (rows.length === 0) return []

  const evidence = await db
    .select({ sourceId: claimEvidence.sourceId, claimId: claimEvidence.claimId })
    .from(claimEvidence)
    .where(inArray(claimEvidence.sourceId, rows.map((r) => r.id)))

  const counts = new Map<string, number>()
  for (const row of evidence) counts.set(row.sourceId, (counts.get(row.sourceId) ?? 0) + 1)

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    title: row.title,
    kind: row.kind as SourceKind,
    format: row.format as SourceFormat,
    status: row.status as ProcessingStatus,
    statusDetail: row.statusDetail,
    pageCount: row.pageCount,
    wordCount: row.wordCount,
    byteSize: row.byteSize,
    extractionConfidence: row.extractionConfidence,
    summary: row.summary,
    keyPoints: row.keyPoints,
    sourceUrl: row.sourceUrl,
    evidenceCount: counts.get(row.id) ?? 0,
    includedInShare: row.includedInShare,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))
}

export interface SourceChunkView {
  id: string
  chunkIndex: number
  text: string
  pageNumber: number | null
  sheetName: string | null
  rowStart: number | null
  rowEnd: number | null
  sectionPath: string | null
  timecode: string | null
  regionLabel: string | null
  locator: string
}

export interface SourceDetail extends SourceListItem {
  chunks: SourceChunkView[]
  pages: { pageNumber: number; text: string }[]
  sheets: { name: string; index: number; headers: string[]; rows: string[][]; rowCount: number; rowOffset: number }[]
  hasFile: boolean
  metadata: Record<string, unknown>
}

export async function getSourceDetail(caseId: string, sourceId: string): Promise<SourceDetail | null> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.caseId, caseId), isNull(sources.deletedAt)))
    .limit(1)
  const source = rows[0]
  if (!source) return null

  const [chunkRows, pageRows, sheetRows, evidenceRows] = await Promise.all([
    db.select().from(sourceChunks).where(eq(sourceChunks.sourceId, sourceId)).orderBy(asc(sourceChunks.chunkIndex)),
    db.select().from(sourcePages).where(eq(sourcePages.sourceId, sourceId)).orderBy(asc(sourcePages.pageNumber)),
    db.select().from(sourceSheets).where(eq(sourceSheets.sourceId, sourceId)).orderBy(asc(sourceSheets.sheetIndex)),
    db.select({ id: claimEvidence.id }).from(claimEvidence).where(eq(claimEvidence.sourceId, sourceId)),
  ])

  const format = source.format as SourceFormat

  return {
    id: source.id,
    label: source.label,
    title: source.title,
    kind: source.kind as SourceKind,
    format,
    status: source.status as ProcessingStatus,
    statusDetail: source.statusDetail,
    pageCount: source.pageCount,
    wordCount: source.wordCount,
    byteSize: source.byteSize,
    extractionConfidence: source.extractionConfidence,
    summary: source.summary,
    keyPoints: source.keyPoints,
    sourceUrl: source.sourceUrl,
    evidenceCount: evidenceRows.length,
    includedInShare: source.includedInShare,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
    hasFile: Boolean(source.storageKey),
    metadata: source.metadata,
    chunks: chunkRows.map((chunk) => ({
      id: chunk.id,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      pageNumber: chunk.pageNumber,
      sheetName: chunk.sheetName,
      rowStart: chunk.rowStart,
      rowEnd: chunk.rowEnd,
      sectionPath: chunk.sectionPath,
      timecode: chunk.timecode,
      regionLabel: chunk.regionLabel,
      locator: formatLocator(chunk, format),
    })),
    pages: pageRows.map((p) => ({ pageNumber: p.pageNumber, text: p.text })),
    sheets: sheetRows.map((s) => ({
      name: s.name,
      index: s.sheetIndex,
      headers: s.headers,
      rows: s.rows,
      rowCount: s.rowCount,
      rowOffset: s.rowOffset,
    })),
  }
}

/* ---------------------------------------------------------------- claims */

export interface EvidenceView {
  id: string
  chunkId: string
  sourceId: string
  sourceLabel: string
  sourceTitle: string
  format: SourceFormat
  locator: string
  role: EvidenceRole
  excerpt: string
  note: string
  confidence: number
}

export interface ClaimView {
  id: string
  statement: string
  category: string
  status: ClaimStatus
  statusOverridden: boolean
  confidence: number
  materiality: Materiality
  origin: string
  reviewState: ReviewState
  analystNotes: string
  includedInBrief: boolean
  includedInShare: boolean
  createdAt: string
  updatedAt: string
  evidence: EvidenceView[]
  counts: { supporting: number; contradicting: number; context: number }
}

export async function getClaims(caseId: string): Promise<ClaimView[]> {
  const db = await getDb()
  const claimRows = await db
    .select()
    .from(claims)
    .where(and(eq(claims.caseId, caseId), isNull(claims.archivedAt)))
    .orderBy(desc(claims.materiality), desc(claims.confidence), asc(claims.createdAt))

  if (claimRows.length === 0) return []

  const evidenceRows = await db
    .select({
      id: claimEvidence.id,
      claimId: claimEvidence.claimId,
      chunkId: claimEvidence.chunkId,
      sourceId: claimEvidence.sourceId,
      role: claimEvidence.role,
      excerpt: claimEvidence.excerpt,
      note: claimEvidence.note,
      confidence: claimEvidence.confidence,
      label: sources.label,
      title: sources.title,
      format: sources.format,
      pageNumber: sourceChunks.pageNumber,
      sheetName: sourceChunks.sheetName,
      rowStart: sourceChunks.rowStart,
      rowEnd: sourceChunks.rowEnd,
      sectionPath: sourceChunks.sectionPath,
      timecode: sourceChunks.timecode,
      regionLabel: sourceChunks.regionLabel,
      chunkText: sourceChunks.text,
    })
    .from(claimEvidence)
    .innerJoin(sources, eq(sources.id, claimEvidence.sourceId))
    .innerJoin(sourceChunks, eq(sourceChunks.id, claimEvidence.chunkId))
    .where(inArray(claimEvidence.claimId, claimRows.map((c) => c.id)))

  const byClaim = new Map<string, EvidenceView[]>()
  for (const row of evidenceRows) {
    const list = byClaim.get(row.claimId) ?? []
    list.push({
      id: row.id,
      chunkId: row.chunkId,
      sourceId: row.sourceId,
      sourceLabel: row.label,
      sourceTitle: row.title,
      format: row.format as SourceFormat,
      locator: formatLocator(row, row.format as SourceFormat),
      role: row.role as EvidenceRole,
      // The stored chunk text is authoritative; the excerpt never diverges from the record.
      excerpt: row.excerpt || row.chunkText.slice(0, 400),
      note: row.note,
      confidence: row.confidence,
    })
    byClaim.set(row.claimId, list)
  }

  return claimRows.map((claim) => {
    const evidence = (byClaim.get(claim.id) ?? []).sort((a, b) => roleOrder(a.role) - roleOrder(b.role))
    return {
      id: claim.id,
      statement: claim.statement,
      category: claim.category,
      status: claim.status as ClaimStatus,
      statusOverridden: claim.statusOverridden,
      confidence: claim.confidence,
      materiality: claim.materiality as Materiality,
      origin: claim.origin,
      reviewState: claim.reviewState as ReviewState,
      analystNotes: claim.analystNotes,
      includedInBrief: claim.includedInBrief,
      includedInShare: claim.includedInShare,
      createdAt: claim.createdAt.toISOString(),
      updatedAt: claim.updatedAt.toISOString(),
      evidence,
      counts: {
        supporting: evidence.filter((e) => e.role === 'supporting').length,
        contradicting: evidence.filter((e) => e.role === 'contradicting').length,
        context: evidence.filter((e) => e.role === 'context').length,
      },
    }
  })
}

function roleOrder(role: EvidenceRole) {
  return role === 'supporting' ? 0 : role === 'contradicting' ? 1 : 2
}

/* -------------------------------------------------------------- timeline */

export interface TimelineEventView {
  id: string
  occurredOn: string
  occurredEndOn: string | null
  timeOfDay: string | null
  precision: DatePrecision
  title: string
  description: string
  category: string
  confidence: number
  entityIds: string[]
  analystNotes: string
  reviewState: ReviewState
  includedInShare: boolean
  citations: { chunkId: string; sourceId: string; sourceLabel: string; sourceTitle: string; locator: string; excerpt: string }[]
}

export async function getTimeline(caseId: string): Promise<TimelineEventView[]> {
  const db = await getDb()
  const eventRows = await db
    .select()
    .from(timelineEvents)
    .where(eq(timelineEvents.caseId, caseId))
    .orderBy(asc(timelineEvents.occurredOn))

  if (eventRows.length === 0) return []

  const citationRows = await db
    .select({
      eventId: timelineEventSources.eventId,
      chunkId: timelineEventSources.chunkId,
      sourceId: timelineEventSources.sourceId,
      excerpt: timelineEventSources.excerpt,
      label: sources.label,
      title: sources.title,
      format: sources.format,
      pageNumber: sourceChunks.pageNumber,
      sheetName: sourceChunks.sheetName,
      rowStart: sourceChunks.rowStart,
      rowEnd: sourceChunks.rowEnd,
      sectionPath: sourceChunks.sectionPath,
      timecode: sourceChunks.timecode,
      regionLabel: sourceChunks.regionLabel,
    })
    .from(timelineEventSources)
    .innerJoin(sources, eq(sources.id, timelineEventSources.sourceId))
    .innerJoin(sourceChunks, eq(sourceChunks.id, timelineEventSources.chunkId))
    .where(inArray(timelineEventSources.eventId, eventRows.map((e) => e.id)))

  const byEvent = new Map<string, TimelineEventView['citations']>()
  for (const row of citationRows) {
    const list = byEvent.get(row.eventId) ?? []
    list.push({
      chunkId: row.chunkId,
      sourceId: row.sourceId,
      sourceLabel: row.label,
      sourceTitle: row.title,
      locator: formatLocator(row, row.format as SourceFormat),
      excerpt: row.excerpt,
    })
    byEvent.set(row.eventId, list)
  }

  return eventRows.map((event) => ({
    id: event.id,
    occurredOn: event.occurredOn,
    occurredEndOn: event.occurredEndOn,
    timeOfDay: event.timeOfDay,
    precision: event.precision as DatePrecision,
    title: event.title,
    description: event.description,
    category: event.category,
    confidence: event.confidence,
    entityIds: event.entityIds,
    analystNotes: event.analystNotes,
    reviewState: event.reviewState as ReviewState,
    includedInShare: event.includedInShare,
    citations: byEvent.get(event.id) ?? [],
  }))
}

/* --------------------------------------------------------- discrepancies */

export interface DiscrepancyView {
  id: string
  title: string
  description: string
  type: DiscrepancyType
  subject: string
  confidence: number
  materiality: Materiality
  reviewState: ReviewState
  analystNotes: string
  resolvedAt: string | null
  includedInShare: boolean
  sides: {
    side: 'a' | 'b'
    chunkId: string
    sourceId: string
    sourceLabel: string
    sourceTitle: string
    locator: string
    statedValue: string
    excerpt: string
  }[]
}

export async function getDiscrepancies(caseId: string): Promise<DiscrepancyView[]> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(discrepancies)
    .where(eq(discrepancies.caseId, caseId))
    .orderBy(desc(discrepancies.materiality), desc(discrepancies.confidence))

  if (rows.length === 0) return []

  const evidenceRows = await db
    .select({
      discrepancyId: discrepancyEvidence.discrepancyId,
      side: discrepancyEvidence.side,
      chunkId: discrepancyEvidence.chunkId,
      sourceId: discrepancyEvidence.sourceId,
      statedValue: discrepancyEvidence.statedValue,
      excerpt: discrepancyEvidence.excerpt,
      label: sources.label,
      title: sources.title,
      format: sources.format,
      pageNumber: sourceChunks.pageNumber,
      sheetName: sourceChunks.sheetName,
      rowStart: sourceChunks.rowStart,
      rowEnd: sourceChunks.rowEnd,
      sectionPath: sourceChunks.sectionPath,
      timecode: sourceChunks.timecode,
      regionLabel: sourceChunks.regionLabel,
    })
    .from(discrepancyEvidence)
    .innerJoin(sources, eq(sources.id, discrepancyEvidence.sourceId))
    .innerJoin(sourceChunks, eq(sourceChunks.id, discrepancyEvidence.chunkId))
    .where(inArray(discrepancyEvidence.discrepancyId, rows.map((r) => r.id)))

  const bySide = new Map<string, DiscrepancyView['sides']>()
  for (const row of evidenceRows) {
    const list = bySide.get(row.discrepancyId) ?? []
    list.push({
      side: row.side as 'a' | 'b',
      chunkId: row.chunkId,
      sourceId: row.sourceId,
      sourceLabel: row.label,
      sourceTitle: row.title,
      locator: formatLocator(row, row.format as SourceFormat),
      statedValue: row.statedValue,
      excerpt: row.excerpt,
    })
    bySide.set(row.discrepancyId, list)
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type as DiscrepancyType,
    subject: row.subject,
    confidence: row.confidence,
    materiality: row.materiality as Materiality,
    reviewState: row.reviewState as ReviewState,
    analystNotes: row.analystNotes,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    includedInShare: row.includedInShare,
    sides: (bySide.get(row.id) ?? []).sort((a, b) => a.side.localeCompare(b.side)),
  }))
}

/* ----------------------------------------------------------------- graph */

export interface GraphNodeView {
  id: string
  name: string
  type: EntityType | 'claim' | 'document' | 'event'
  role: string
  description: string
  mentionCount: number
  x: number | null
  y: number | null
  kind: 'entity' | 'claim' | 'source' | 'event'
  status?: ClaimStatus
}

export interface GraphEdgeView {
  id: string
  source: string
  target: string
  type: RelationshipType
  description: string
  confidence: number
  chunkIds: string[]
}

export interface GraphView {
  nodes: GraphNodeView[]
  edges: GraphEdgeView[]
}

/**
 * The evidence graph combines entities, the sources that mention them, and the
 * claims those sources support or contradict. Claim→source edges carry the
 * supports/contradicts relationship that makes the graph evidentiary rather
 * than merely associative.
 */
export async function getGraph(caseId: string): Promise<GraphView> {
  const db = await getDb()
  const [entityRows, relationshipRows, sourceRows, claimRows, evidenceRows] = await Promise.all([
    db.select().from(entities).where(eq(entities.caseId, caseId)).orderBy(desc(entities.mentionCount)).limit(120),
    db.select().from(entityRelationships).where(eq(entityRelationships.caseId, caseId)).limit(400),
    db
      .select({ id: sources.id, label: sources.label, title: sources.title, format: sources.format })
      .from(sources)
      .where(and(eq(sources.caseId, caseId), isNull(sources.deletedAt))),
    db
      .select({ id: claims.id, statement: claims.statement, status: claims.status, materiality: claims.materiality })
      .from(claims)
      .where(and(eq(claims.caseId, caseId), isNull(claims.archivedAt)))
      .orderBy(desc(claims.materiality))
      .limit(60),
    db
      .select({ claimId: claimEvidence.claimId, sourceId: claimEvidence.sourceId, role: claimEvidence.role, chunkId: claimEvidence.chunkId })
      .from(claimEvidence)
      .innerJoin(claims, eq(claims.id, claimEvidence.claimId))
      .where(eq(claims.caseId, caseId)),
  ])

  const nodes: GraphNodeView[] = []
  const edges: GraphEdgeView[] = []

  for (const entity of entityRows) {
    nodes.push({
      id: `entity:${entity.id}`,
      name: entity.name,
      type: entity.type as EntityType,
      role: entity.role,
      description: entity.description,
      mentionCount: entity.mentionCount,
      x: entity.graphX,
      y: entity.graphY,
      kind: 'entity',
    })
  }

  for (const source of sourceRows) {
    nodes.push({
      id: `source:${source.id}`,
      name: `${source.label} · ${source.title}`,
      type: 'document',
      role: source.format.toUpperCase(),
      description: '',
      mentionCount: 0,
      x: null,
      y: null,
      kind: 'source',
    })
  }

  const claimIds = new Set(claimRows.map((c) => c.id))
  for (const claim of claimRows) {
    nodes.push({
      id: `claim:${claim.id}`,
      name: claim.statement,
      type: 'claim',
      role: claim.materiality,
      description: '',
      mentionCount: 0,
      x: null,
      y: null,
      kind: 'claim',
      status: claim.status as ClaimStatus,
    })
  }

  const nodeIds = new Set(nodes.map((n) => n.id))

  for (const relationship of relationshipRows) {
    const from = `entity:${relationship.fromEntityId}`
    const to = `entity:${relationship.toEntityId}`
    if (!nodeIds.has(from) || !nodeIds.has(to)) continue
    edges.push({
      id: relationship.id,
      source: from,
      target: to,
      type: relationship.type as RelationshipType,
      description: relationship.description,
      confidence: relationship.confidence,
      chunkIds: relationship.chunkIds,
    })
  }

  const seenEvidenceEdges = new Set<string>()
  for (const evidence of evidenceRows) {
    if (!claimIds.has(evidence.claimId)) continue
    const from = `claim:${evidence.claimId}`
    const to = `source:${evidence.sourceId}`
    const key = `${from}->${to}:${evidence.role}`
    if (seenEvidenceEdges.has(key) || !nodeIds.has(to)) continue
    seenEvidenceEdges.add(key)
    edges.push({
      id: key,
      source: from,
      target: to,
      type: evidence.role === 'contradicting' ? 'contradicts' : evidence.role === 'supporting' ? 'supports' : 'mentions',
      description: evidence.role === 'contradicting' ? 'Conflicting citation' : 'Supporting citation',
      confidence: 0.9,
      chunkIds: [evidence.chunkId],
    })
  }

  return { nodes, edges }
}

/* --------------------------------------------------------------- copilot */

export interface MessageView {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  citations: { marker: string; chunkId: string; sourceId: string; sourceLabel: string; locator: string; excerpt: string }[]
  insufficientEvidence: boolean
  createdAt: string
}

export async function getConversation(caseId: string, profileId: string) {
  const db = await getDb()
  const existing = await db
    .select()
    .from(caseConversations)
    .where(and(eq(caseConversations.caseId, caseId), eq(caseConversations.profileId, profileId)))
    .orderBy(desc(caseConversations.updatedAt))
    .limit(1)

  let conversation = existing[0]
  if (!conversation) {
    const inserted = await db.insert(caseConversations).values({ caseId, profileId }).returning()
    conversation = inserted[0]!
  }

  const messages = await db
    .select()
    .from(caseMessages)
    .where(eq(caseMessages.conversationId, conversation.id))
    .orderBy(asc(caseMessages.createdAt))
    .limit(200)

  return {
    conversationId: conversation.id,
    messages: messages.map<MessageView>((message) => ({
      id: message.id,
      role: message.role as MessageView['role'],
      content: message.content,
      citations: message.citations,
      insufficientEvidence: message.insufficientEvidence,
      createdAt: message.createdAt.toISOString(),
    })),
  }
}

/* ----------------------------------------------------------------- brief */

export interface BriefSectionView {
  id: string
  key: BriefSectionKey
  title: string
  body: string
  position: number
  included: boolean
  generated: boolean
  hint: string
  updatedAt: string
}

export interface BriefView {
  id: string
  title: string
  status: string
  generatedAt: string | null
  sections: BriefSectionView[]
}

export async function getBrief(caseId: string, caseTitle: string): Promise<BriefView> {
  const db = await getDb()
  const existing = await db.select().from(briefs).where(eq(briefs.caseId, caseId)).limit(1)
  let brief = existing[0]
  if (!brief) {
    const inserted = await db.insert(briefs).values({ caseId, title: `${caseTitle} — investigation brief` }).returning()
    brief = inserted[0]!
    await db.insert(briefSections).values(
      (Object.keys(BRIEF_SECTION_META) as BriefSectionKey[]).map((key, index) => ({
        briefId: brief!.id,
        caseId,
        key,
        title: BRIEF_SECTION_META[key].title,
        body: '',
        position: index,
        included: true,
        generated: false,
      })),
    )
  }

  const sectionRows = await db
    .select()
    .from(briefSections)
    .where(eq(briefSections.briefId, brief.id))
    .orderBy(asc(briefSections.position))

  return {
    id: brief.id,
    title: brief.title,
    status: brief.status,
    generatedAt: brief.generatedAt?.toISOString() ?? null,
    sections: sectionRows.map((section) => ({
      id: section.id,
      key: section.key as BriefSectionKey,
      title: section.title,
      body: section.body,
      position: section.position,
      included: section.included,
      generated: section.generated,
      hint: BRIEF_SECTION_META[section.key as BriefSectionKey]?.hint ?? '',
      updatedAt: section.updatedAt.toISOString(),
    })),
  }
}

/* ---------------------------------------------------------------- share */

export interface ShareView {
  id: string
  slug: string
  enabled: boolean
  hasPassword: boolean
  expiresAt: string | null
  showSources: boolean
  showAnalystNotes: boolean
  allowDownloads: boolean
  showTimeline: boolean
  showClaims: boolean
  showDiscrepancies: boolean
  viewCount: number
  url: string
}

export async function getShare(caseId: string, appUrl: string): Promise<ShareView | null> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(publicShares)
    .where(and(eq(publicShares.caseId, caseId), isNull(publicShares.revokedAt)))
    .limit(1)
  const share = rows[0]
  if (!share) return null
  return {
    id: share.id,
    slug: share.slug,
    enabled: share.enabled,
    hasPassword: Boolean(share.passwordHash),
    expiresAt: share.expiresAt?.toISOString() ?? null,
    showSources: share.showSources,
    showAnalystNotes: share.showAnalystNotes,
    allowDownloads: share.allowDownloads,
    showTimeline: share.showTimeline,
    showClaims: share.showClaims,
    showDiscrepancies: share.showDiscrepancies,
    viewCount: share.viewCount,
    url: `${appUrl}/evidence/${share.slug}`,
  }
}

/* -------------------------------------------------------------- activity */

export interface ActivityItem {
  id: string
  kind: 'analysis' | 'audit'
  title: string
  detail: string
  actor: string
  status: string
  createdAt: string
}

export async function getActivity(caseId: string): Promise<ActivityItem[]> {
  const db = await getDb()
  const [runs, logs] = await Promise.all([
    db.select().from(analysisRuns).where(eq(analysisRuns.caseId, caseId)).orderBy(desc(analysisRuns.createdAt)).limit(80),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        detail: auditLogs.detail,
        createdAt: auditLogs.createdAt,
        actor: userProfiles.displayName,
      })
      .from(auditLogs)
      .leftJoin(userProfiles, eq(userProfiles.id, auditLogs.profileId))
      .where(eq(auditLogs.caseId, caseId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(80),
  ])

  const items: ActivityItem[] = [
    ...runs.map<ActivityItem>((run) => ({
      id: run.id,
      kind: 'analysis',
      title: run.operation,
      detail:
        run.status === 'failed'
          ? (run.error ?? 'Analysis failed.')
          : `${run.provider === 'anthropic' ? run.model : 'local analysis'} · ${run.durationMs} ms · ${run.inputTokens + run.outputTokens} tokens`,
      actor: run.provider === 'anthropic' ? 'CaseSignal analysis' : 'Local analysis',
      status: run.status,
      createdAt: run.createdAt.toISOString(),
    })),
    ...logs.map<ActivityItem>((log) => ({
      id: log.id,
      kind: 'audit',
      title: log.action,
      detail: typeof log.detail.summary === 'string' ? log.detail.summary : log.targetType,
      actor: log.actor ?? 'System',
      status: 'complete',
      createdAt: log.createdAt.toISOString(),
    })),
  ]

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 120)
}

/* -------------------------------------------------------------- overview */

export interface CaseOverview {
  id: string
  title: string
  description: string
  objective: string
  templateId: string
  status: string
  isDemo: boolean
  summary: string
  lastAnalyzedAt: string | null
  createdAt: string
  updatedAt: string
  counts: {
    sources: number
    processing: number
    claims: number
    supported: number
    contradicted: number
    unresolved: number
    events: number
    discrepancies: number
    entities: number
    openDiscrepancies: number
  }
}

export async function getCaseOverview(caseId: string, caseRow: {
  id: string; title: string; description: string; objective: string; templateId: string; status: string;
  isDemo: boolean; summary: string; lastAnalyzedAt: Date | null; createdAt: Date; updatedAt: Date
}): Promise<CaseOverview> {
  const db = await getDb()
  const [sourceRows, claimRows, eventRows, discrepancyRows, entityRows] = await Promise.all([
    db.select({ status: sources.status }).from(sources).where(and(eq(sources.caseId, caseId), isNull(sources.deletedAt))),
    db.select({ status: claims.status }).from(claims).where(and(eq(claims.caseId, caseId), isNull(claims.archivedAt))),
    db.select({ id: timelineEvents.id }).from(timelineEvents).where(eq(timelineEvents.caseId, caseId)),
    db.select({ reviewState: discrepancies.reviewState }).from(discrepancies).where(eq(discrepancies.caseId, caseId)),
    db.select({ id: entities.id }).from(entities).where(eq(entities.caseId, caseId)),
  ])

  return {
    id: caseRow.id,
    title: caseRow.title,
    description: caseRow.description,
    objective: caseRow.objective,
    templateId: caseRow.templateId,
    status: caseRow.status,
    isDemo: caseRow.isDemo,
    summary: caseRow.summary,
    lastAnalyzedAt: caseRow.lastAnalyzedAt?.toISOString() ?? null,
    createdAt: caseRow.createdAt.toISOString(),
    updatedAt: caseRow.updatedAt.toISOString(),
    counts: {
      sources: sourceRows.length,
      processing: sourceRows.filter((s) => !['complete', 'needs_review', 'failed'].includes(s.status)).length,
      claims: claimRows.length,
      supported: claimRows.filter((c) => c.status === 'supported').length,
      contradicted: claimRows.filter((c) => c.status === 'contradicted').length,
      unresolved: claimRows.filter((c) => c.status === 'unresolved').length,
      events: eventRows.length,
      discrepancies: discrepancyRows.length,
      openDiscrepancies: discrepancyRows.filter((d) => d.reviewState === 'unreviewed' || d.reviewState === 'needs_follow_up').length,
      entities: entityRows.length,
    },
  }
}
