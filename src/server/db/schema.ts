import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

/**
 * CaseSignal schema.
 *
 * Ownership model: every row that carries case content is reachable from a
 * case, and every case belongs to exactly one organization. Authorization is
 * therefore always "does this Clerk user belong to the organization that owns
 * this case" — see src/server/auth/guard.ts. No query in the application ever
 * accepts a client-supplied organization id without that check.
 *
 * Statuses are constrained by CHECK constraints emitted in the migration so the
 * database cannot hold a value the domain vocabulary does not define.
 */

const id = () => uuid('id').primaryKey().defaultRandom()
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

/* ------------------------------------------------------------- identities */

export const userProfiles = pgTable(
  'user_profiles',
  {
    id: id(),
    clerkUserId: text('clerk_user_id').notNull(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull().default(''),
    avatarUrl: text('avatar_url'),
    role: text('role').notNull().default('other'),
    primaryUseCase: text('primary_use_case').notNull().default(''),
    onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('user_profiles_clerk_user_id_key').on(t.clerkUserId)],
)

export const organizations = pgTable(
  'organizations',
  {
    id: id(),
    clerkOrgId: text('clerk_org_id'),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    kind: text('kind').notNull().default('personal'),
    createdByProfileId: uuid('created_by_profile_id').references(() => userProfiles.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('organizations_slug_key').on(t.slug), index('organizations_clerk_org_id_idx').on(t.clerkOrgId)],
)

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: id(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => userProfiles.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('organization_members_unique').on(t.organizationId, t.profileId),
    index('organization_members_profile_idx').on(t.profileId),
  ],
)

/* ------------------------------------------------------------------ cases */

export const cases = pgTable(
  'cases',
  {
    id: id(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    createdByProfileId: uuid('created_by_profile_id').references(() => userProfiles.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    objective: text('objective').notNull().default(''),
    templateId: text('template_id').notNull().default('general'),
    status: text('status').notNull().default('active'),
    isDemo: boolean('is_demo').notNull().default(false),
    summary: text('summary').notNull().default(''),
    lastAnalyzedAt: timestamp('last_analyzed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('cases_organization_idx').on(t.organizationId),
    index('cases_updated_idx').on(t.updatedAt),
  ],
)

export const caseMembers = pgTable(
  'case_members',
  {
    id: id(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => userProfiles.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('case_members_unique').on(t.caseId, t.profileId)],
)

/* ---------------------------------------------------------------- sources */

export const sources = pgTable(
  'sources',
  {
    id: id(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    /** Stable per-case citation label: S1, S2, … */
    label: text('label').notNull(),
    title: text('title').notNull(),
    kind: text('kind').notNull(),
    format: text('format').notNull(),
    originalFilename: text('original_filename'),
    mimeType: text('mime_type'),
    byteSize: integer('byte_size').notNull().default(0),
    storageKey: text('storage_key'),
    sourceUrl: text('source_url'),
    author: text('author'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    pageCount: integer('page_count').notNull().default(0),
    wordCount: integer('word_count').notNull().default(0),
    status: text('status').notNull().default('queued'),
    statusDetail: text('status_detail').notNull().default(''),
    extractionConfidence: real('extraction_confidence'),
    summary: text('summary').notNull().default(''),
    keyPoints: jsonb('key_points').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    includedInShare: boolean('included_in_share').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('sources_case_idx').on(t.caseId),
    uniqueIndex('sources_case_label_key').on(t.caseId, t.label),
  ],
)

export const sourcePages = pgTable(
  'source_pages',
  {
    id: id(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    pageNumber: integer('page_number').notNull(),
    text: text('text').notNull().default(''),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('source_pages_unique').on(t.sourceId, t.pageNumber)],
)

export const sourceSheets = pgTable(
  'source_sheets',
  {
    id: id(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sheetIndex: integer('sheet_index').notNull().default(0),
    headers: jsonb('headers').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    rows: jsonb('rows').$type<string[][]>().notNull().default(sql`'[]'::jsonb`),
    rowCount: integer('row_count').notNull().default(0),
    /** Register row number of the first stored row, so viewer numbering matches citations. */
    rowOffset: integer('row_offset').notNull().default(1),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('source_sheets_unique').on(t.sourceId, t.sheetIndex)],
)

/**
 * The atomic unit of traceability. Every citation in the product points at a
 * chunk, and every chunk records exactly where in the original record it came
 * from (page, sheet + row range, heading path, or transcript timestamp).
 */
export const sourceChunks = pgTable(
  'source_chunks',
  {
    id: id(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    text: text('text').notNull(),
    /** Locator components — only the ones relevant to the format are set. */
    pageNumber: integer('page_number'),
    sheetName: text('sheet_name'),
    rowStart: integer('row_start'),
    rowEnd: integer('row_end'),
    sectionPath: text('section_path'),
    timecode: text('timecode'),
    regionLabel: text('region_label'),
    charStart: integer('char_start').notNull().default(0),
    charEnd: integer('char_end').notNull().default(0),
    tokenEstimate: integer('token_estimate').notNull().default(0),
    embedding: jsonb('embedding').$type<number[] | null>(),
    createdAt: createdAt(),
  },
  (t) => [
    index('source_chunks_source_idx').on(t.sourceId),
    index('source_chunks_case_idx').on(t.caseId),
    uniqueIndex('source_chunks_unique').on(t.sourceId, t.chunkIndex),
  ],
)

/* --------------------------------------------------------------- entities */

export const entities = pgTable(
  'entities',
  {
    id: id(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    type: text('type').notNull().default('other'),
    role: text('role').notNull().default(''),
    aliases: jsonb('aliases').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    description: text('description').notNull().default(''),
    mentionCount: integer('mention_count').notNull().default(0),
    firstSeenChunkId: uuid('first_seen_chunk_id').references(() => sourceChunks.id, { onDelete: 'set null' }),
    graphX: real('graph_x'),
    graphY: real('graph_y'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('entities_case_idx').on(t.caseId),
    uniqueIndex('entities_case_normalized_key').on(t.caseId, t.normalizedName),
  ],
)

export const entityRelationships = pgTable(
  'entity_relationships',
  {
    id: id(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    fromEntityId: uuid('from_entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    toEntityId: uuid('to_entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    type: text('type').notNull().default('related_to'),
    description: text('description').notNull().default(''),
    confidence: real('confidence').notNull().default(0.5),
    chunkIds: jsonb('chunk_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt: createdAt(),
  },
  (t) => [index('entity_relationships_case_idx').on(t.caseId)],
)

/* ----------------------------------------------------------------- claims */

export const claims = pgTable(
  'claims',
  {
    id: id(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    statement: text('statement').notNull(),
    category: text('category').notNull().default('other'),
    status: text('status').notNull().default('unresolved'),
    statusOverridden: boolean('status_overridden').notNull().default(false),
    confidence: real('confidence').notNull().default(0.5),
    materiality: text('materiality').notNull().default('medium'),
    origin: text('origin').notNull().default('extracted'),
    reviewState: text('review_state').notNull().default('unreviewed'),
    analystNotes: text('analyst_notes').notNull().default(''),
    includedInBrief: boolean('included_in_brief').notNull().default(true),
    includedInShare: boolean('included_in_share').notNull().default(false),
    mergedIntoClaimId: uuid('merged_into_claim_id'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdByProfileId: uuid('created_by_profile_id').references(() => userProfiles.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('claims_case_idx').on(t.caseId),
    index('claims_status_idx').on(t.caseId, t.status),
  ],
)

export const claimEvidence = pgTable(
  'claim_evidence',
  {
    id: id(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'cascade' }),
    chunkId: uuid('chunk_id')
      .notNull()
      .references(() => sourceChunks.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('supporting'),
    excerpt: text('excerpt').notNull().default(''),
    note: text('note').notNull().default(''),
    confidence: real('confidence').notNull().default(0.6),
    createdAt: createdAt(),
  },
  (t) => [
    index('claim_evidence_claim_idx').on(t.claimId),
    uniqueIndex('claim_evidence_unique').on(t.claimId, t.chunkId, t.role),
  ],
)

/* --------------------------------------------------------------- timeline */

export const timelineEvents = pgTable(
  'timeline_events',
  {
    id: id(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    occurredOn: text('occurred_on').notNull(),
    occurredEndOn: text('occurred_end_on'),
    timeOfDay: text('time_of_day'),
    precision: text('precision').notNull().default('exact'),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    category: text('category').notNull().default('other'),
    confidence: real('confidence').notNull().default(0.6),
    entityIds: jsonb('entity_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    analystNotes: text('analyst_notes').notNull().default(''),
    reviewState: text('review_state').notNull().default('unreviewed'),
    includedInShare: boolean('included_in_share').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('timeline_events_case_idx').on(t.caseId, t.occurredOn)],
)

export const timelineEventSources = pgTable(
  'timeline_event_sources',
  {
    id: id(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => timelineEvents.id, { onDelete: 'cascade' }),
    chunkId: uuid('chunk_id')
      .notNull()
      .references(() => sourceChunks.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    excerpt: text('excerpt').notNull().default(''),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('timeline_event_sources_unique').on(t.eventId, t.chunkId)],
)

/* ---------------------------------------------------------- discrepancies */

export const discrepancies = pgTable(
  'discrepancies',
  {
    id: id(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    type: text('type').notNull().default('date'),
    subject: text('subject').notNull().default(''),
    confidence: real('confidence').notNull().default(0.6),
    materiality: text('materiality').notNull().default('medium'),
    reviewState: text('review_state').notNull().default('unreviewed'),
    analystNotes: text('analyst_notes').notNull().default(''),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    includedInShare: boolean('included_in_share').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('discrepancies_case_idx').on(t.caseId)],
)

export const discrepancyEvidence = pgTable(
  'discrepancy_evidence',
  {
    id: id(),
    discrepancyId: uuid('discrepancy_id')
      .notNull()
      .references(() => discrepancies.id, { onDelete: 'cascade' }),
    chunkId: uuid('chunk_id')
      .notNull()
      .references(() => sourceChunks.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    side: text('side').notNull().default('a'),
    excerpt: text('excerpt').notNull().default(''),
    statedValue: text('stated_value').notNull().default(''),
    createdAt: createdAt(),
  },
  (t) => [index('discrepancy_evidence_idx').on(t.discrepancyId)],
)

/* -------------------------------------------------------------- copilot */

export const caseConversations = pgTable(
  'case_conversations',
  {
    id: id(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id').references(() => userProfiles.id, { onDelete: 'set null' }),
    title: text('title').notNull().default('Case questions'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('case_conversations_case_idx').on(t.caseId)],
)

export const caseMessages = pgTable(
  'case_messages',
  {
    id: id(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => caseConversations.id, { onDelete: 'cascade' }),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    /** Citation markers resolved against real chunks at answer time. */
    citations: jsonb('citations')
      .$type<{ marker: string; chunkId: string; sourceId: string; sourceLabel: string; locator: string; excerpt: string }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    retrievedChunkIds: jsonb('retrieved_chunk_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    insufficientEvidence: boolean('insufficient_evidence').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('case_messages_conversation_idx').on(t.conversationId, t.createdAt)],
)

/* -------------------------------------------------------------- analysis */

export const analysisRuns = pgTable(
  'analysis_runs',
  {
    id: id(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id').references(() => sources.id, { onDelete: 'cascade' }),
    operation: text('operation').notNull(),
    status: text('status').notNull().default('running'),
    provider: text('provider').notNull().default('local'),
    model: text('model').notNull().default(''),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    estimatedCostUsd: numeric('estimated_cost_usd', { precision: 10, scale: 6 }),
    durationMs: integer('duration_ms').notNull().default(0),
    error: text('error'),
    resultSummary: jsonb('result_summary').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
  },
  (t) => [index('analysis_runs_case_idx').on(t.caseId, t.createdAt)],
)

/* ----------------------------------------------------------------- briefs */

export const briefs = pgTable(
  'briefs',
  {
    id: id(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    status: text('status').notNull().default('draft'),
    generatedAt: timestamp('generated_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('briefs_case_key').on(t.caseId)],
)

export const briefSections = pgTable(
  'brief_sections',
  {
    id: id(),
    briefId: uuid('brief_id')
      .notNull()
      .references(() => briefs.id, { onDelete: 'cascade' }),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    position: integer('position').notNull().default(0),
    included: boolean('included').notNull().default(true),
    generated: boolean('generated').notNull().default(false),
    updatedAt: updatedAt(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('brief_sections_unique').on(t.briefId, t.key)],
)

/* --------------------------------------------------------------- sharing */

export const publicShares = pgTable(
  'public_shares',
  {
    id: id(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    enabled: boolean('enabled').notNull().default(false),
    passwordHash: text('password_hash'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    showSources: boolean('show_sources').notNull().default(true),
    showAnalystNotes: boolean('show_analyst_notes').notNull().default(false),
    allowDownloads: boolean('allow_downloads').notNull().default(false),
    showTimeline: boolean('show_timeline').notNull().default(true),
    showClaims: boolean('show_claims').notNull().default(true),
    showDiscrepancies: boolean('show_discrepancies').notNull().default(true),
    viewCount: integer('view_count').notNull().default(0),
    createdByProfileId: uuid('created_by_profile_id').references(() => userProfiles.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('public_shares_slug_key').on(t.slug), index('public_shares_case_idx').on(t.caseId)],
)

export const exports = pgTable(
  'exports',
  {
    id: id(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id').references(() => userProfiles.id, { onDelete: 'set null' }),
    format: text('format').notNull(),
    scope: text('scope').notNull().default('brief'),
    byteSize: integer('byte_size').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index('exports_case_idx').on(t.caseId)],
)

/* ------------------------------------------------------- usage & billing */

export const usageEvents = pgTable(
  'usage_events',
  {
    id: id(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
    metric: text('metric').notNull(),
    quantity: integer('quantity').notNull().default(1),
    periodMonth: text('period_month').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
  },
  (t) => [index('usage_events_org_period_idx').on(t.organizationId, t.periodMonth, t.metric)],
)

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: id(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    plan: text('plan').notNull().default('free'),
    status: text('status').notNull().default('active'),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('subscriptions_org_key').on(t.organizationId)],
)

/* ------------------------------------------------------------------ audit */

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id(),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
    profileId: uuid('profile_id').references(() => userProfiles.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    targetType: text('target_type').notNull().default(''),
    targetId: text('target_id'),
    detail: jsonb('detail').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    ipHash: text('ip_hash'),
    createdAt: createdAt(),
  },
  (t) => [index('audit_logs_case_idx').on(t.caseId, t.createdAt), index('audit_logs_org_idx').on(t.organizationId, t.createdAt)],
)

/* -------------------------------------------------- onboarding checklists */

export const caseChecklists = pgTable(
  'case_checklists',
  {
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.caseId, t.key] })],
)

export type UserProfileRow = typeof userProfiles.$inferSelect
export type OrganizationRow = typeof organizations.$inferSelect
export type CaseRow = typeof cases.$inferSelect
export type SourceRow = typeof sources.$inferSelect
export type SourceChunkRow = typeof sourceChunks.$inferSelect
export type SourceSheetRow = typeof sourceSheets.$inferSelect
export type SourcePageRow = typeof sourcePages.$inferSelect
export type ClaimRow = typeof claims.$inferSelect
export type ClaimEvidenceRow = typeof claimEvidence.$inferSelect
export type EntityRow = typeof entities.$inferSelect
export type EntityRelationshipRow = typeof entityRelationships.$inferSelect
export type TimelineEventRow = typeof timelineEvents.$inferSelect
export type TimelineEventSourceRow = typeof timelineEventSources.$inferSelect
export type DiscrepancyRow = typeof discrepancies.$inferSelect
export type DiscrepancyEvidenceRow = typeof discrepancyEvidence.$inferSelect
export type CaseMessageRow = typeof caseMessages.$inferSelect
export type BriefRow = typeof briefs.$inferSelect
export type BriefSectionRow = typeof briefSections.$inferSelect
export type PublicShareRow = typeof publicShares.$inferSelect
export type SubscriptionRow = typeof subscriptions.$inferSelect
export type AnalysisRunRow = typeof analysisRuns.$inferSelect
export type AuditLogRow = typeof auditLogs.$inferSelect
export type UsageEventRow = typeof usageEvents.$inferSelect
