/**
 * The CaseSignal domain vocabulary.
 *
 * Everything that carries evidentiary meaning is declared once here: claim
 * status, review state, discrepancy types, source kinds, processing states and
 * plan limits. UI, database constraints, AI schemas and tests all read from
 * this file so a status can never mean two different things in two places.
 */

/* ------------------------------------------------------------------ claims */

export const CLAIM_STATUSES = [
  'supported',
  'partially_supported',
  'contradicted',
  'unresolved',
  'context_only',
] as const
export type ClaimStatus = (typeof CLAIM_STATUSES)[number]

export const CLAIM_STATUS_META: Record<
  ClaimStatus,
  { label: string; short: string; description: string; tone: string; symbol: string }
> = {
  supported: {
    label: 'Supported',
    short: 'Supported',
    description: 'Directly evidenced by at least one cited source excerpt, with no cited excerpt against it.',
    tone: 'supported',
    // Symbols carry the meaning alongside colour so status is never colour-only.
    symbol: '=',
  },
  partially_supported: {
    label: 'Partially supported',
    short: 'Partial',
    description: 'Some elements are evidenced; other elements are not established by the cited sources.',
    tone: 'partial',
    symbol: '≈',
  },
  contradicted: {
    label: 'Contradicted',
    short: 'Contradicted',
    description: 'At least one cited source excerpt is inconsistent with the claim as written.',
    tone: 'contradicted',
    symbol: '≠',
  },
  unresolved: {
    label: 'Unresolved',
    short: 'Unresolved',
    description: 'The case sources do not settle this point in either direction.',
    tone: 'unresolved',
    symbol: '?',
  },
  context_only: {
    label: 'Context only',
    short: 'Context',
    description: 'Background that frames the record without asserting a contested fact.',
    tone: 'context',
    symbol: '·',
  },
}

export const REVIEW_STATES = ['unreviewed', 'reviewed', 'approved', 'needs_follow_up'] as const
export type ReviewState = (typeof REVIEW_STATES)[number]

export const REVIEW_STATE_META: Record<ReviewState, { label: string; description: string }> = {
  unreviewed: { label: 'Unreviewed', description: 'No analyst has checked this item against its sources yet.' },
  reviewed: { label: 'Reviewed', description: 'An analyst has read the item and its citations.' },
  approved: { label: 'Approved', description: 'Checked and cleared for inclusion in a brief or evidence room.' },
  needs_follow_up: { label: 'Needs follow-up', description: 'Requires an additional record or a second reading.' },
}

export const CLAIM_CATEGORIES = [
  'procedure',
  'timing',
  'financial',
  'quantity',
  'attribution',
  'authorization',
  'communication',
  'compliance',
  'other',
] as const
export type ClaimCategory = (typeof CLAIM_CATEGORIES)[number]

export const CLAIM_CATEGORY_LABELS: Record<ClaimCategory, string> = {
  procedure: 'Procedure',
  timing: 'Timing',
  financial: 'Financial',
  quantity: 'Quantity',
  attribution: 'Attribution',
  authorization: 'Authorization',
  communication: 'Communication',
  compliance: 'Compliance',
  other: 'Other',
}

export const MATERIALITY_LEVELS = ['low', 'medium', 'high'] as const
export type Materiality = (typeof MATERIALITY_LEVELS)[number]

export const EVIDENCE_ROLES = ['supporting', 'contradicting', 'context'] as const
export type EvidenceRole = (typeof EVIDENCE_ROLES)[number]

export const EVIDENCE_ROLE_META: Record<EvidenceRole, { label: string; symbol: string; tone: string }> = {
  supporting: { label: 'Supporting', symbol: '+', tone: 'supported' },
  contradicting: { label: 'Conflicting', symbol: '−', tone: 'contradicted' },
  context: { label: 'Context', symbol: '·', tone: 'context' },
}

/**
 * Derive a claim status from its cited evidence. Used when evidence changes so
 * status and citations can never drift apart. Analysts may override the result;
 * an explicit override is preserved.
 */
export function deriveClaimStatus(input: {
  supporting: number
  contradicting: number
  context: number
}): ClaimStatus {
  const { supporting, contradicting, context } = input
  if (supporting === 0 && contradicting === 0) return context > 0 ? 'context_only' : 'unresolved'
  if (contradicting > 0 && supporting === 0) return 'contradicted'
  if (contradicting > 0 && supporting > 0) return 'partially_supported'
  return 'supported'
}

/* ----------------------------------------------------------- discrepancies */

export const DISCREPANCY_TYPES = [
  'date',
  'time',
  'amount',
  'count',
  'name',
  'title',
  'location',
  'procedure',
  'status',
  'sequence',
] as const
export type DiscrepancyType = (typeof DISCREPANCY_TYPES)[number]

export const DISCREPANCY_TYPE_LABELS: Record<DiscrepancyType, string> = {
  date: 'Date',
  time: 'Time',
  amount: 'Amount',
  count: 'Count',
  name: 'Name',
  title: 'Title',
  location: 'Location',
  procedure: 'Procedure',
  status: 'Status',
  sequence: 'Sequence',
}

/* ----------------------------------------------------------------- sources */

export const SOURCE_KINDS = ['file', 'url', 'note', 'paste'] as const
export type SourceKind = (typeof SOURCE_KINDS)[number]

export const SOURCE_FORMATS = [
  'pdf',
  'docx',
  'txt',
  'markdown',
  'csv',
  'xlsx',
  'image',
  'html',
  'note',
] as const
export type SourceFormat = (typeof SOURCE_FORMATS)[number]

export const SOURCE_FORMAT_LABELS: Record<SourceFormat, string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  txt: 'Text',
  markdown: 'Markdown',
  csv: 'CSV',
  xlsx: 'Spreadsheet',
  image: 'Image',
  html: 'Webpage',
  note: 'Note',
}

export const PROCESSING_STATUSES = [
  'queued',
  'extracting',
  'indexing',
  'analyzing',
  'complete',
  'needs_review',
  'failed',
] as const
export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number]

export const PROCESSING_STATUS_META: Record<
  ProcessingStatus,
  { label: string; description: string; terminal: boolean; progress: number }
> = {
  queued: { label: 'Queued', description: 'Waiting to start.', terminal: false, progress: 0.05 },
  extracting: { label: 'Extracting', description: 'Reading text and preserving page or row locations.', terminal: false, progress: 0.3 },
  indexing: { label: 'Indexing', description: 'Splitting into traceable excerpts and building the search index.', terminal: false, progress: 0.55 },
  analyzing: { label: 'Analyzing', description: 'Identifying entities, claims and events.', terminal: false, progress: 0.8 },
  complete: { label: 'Complete', description: 'Indexed and ready to cite.', terminal: true, progress: 1 },
  needs_review: { label: 'Needs review', description: 'Extracted with low confidence — check before relying on it.', terminal: true, progress: 1 },
  failed: { label: 'Failed', description: 'Could not be processed. Retry or replace the record.', terminal: true, progress: 1 },
}

/** Accepted upload types. Extension and MIME must both be recognised. */
export const ACCEPTED_UPLOADS: {
  format: SourceFormat
  extensions: string[]
  mimes: string[]
}[] = [
  { format: 'pdf', extensions: ['.pdf'], mimes: ['application/pdf'] },
  {
    format: 'docx',
    extensions: ['.docx'],
    mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  { format: 'txt', extensions: ['.txt'], mimes: ['text/plain'] },
  { format: 'markdown', extensions: ['.md', '.markdown'], mimes: ['text/markdown', 'text/x-markdown', 'text/plain'] },
  { format: 'csv', extensions: ['.csv'], mimes: ['text/csv', 'application/csv', 'text/plain'] },
  {
    format: 'xlsx',
    extensions: ['.xlsx'],
    mimes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  },
  { format: 'image', extensions: ['.png', '.jpg', '.jpeg', '.webp'], mimes: ['image/png', 'image/jpeg', 'image/webp'] },
]

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
export const MAX_PASTE_CHARS = 400_000

/* ---------------------------------------------------------------- entities */

export const ENTITY_TYPES = [
  'person',
  'organization',
  'document',
  'event',
  'location',
  'transaction',
  'asset',
  'other',
] as const
export type EntityType = (typeof ENTITY_TYPES)[number]

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  person: 'Person',
  organization: 'Organization',
  document: 'Document',
  event: 'Event',
  location: 'Location',
  transaction: 'Transaction',
  asset: 'Asset',
  other: 'Other',
}

export const RELATIONSHIP_TYPES = [
  'supports',
  'contradicts',
  'mentions',
  'authored_by',
  'sent_to',
  'paid',
  'occurred_at',
  'precedes',
  'related_to',
] as const
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number]

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  supports: 'supports',
  contradicts: 'contradicts',
  mentions: 'mentions',
  authored_by: 'authored by',
  sent_to: 'sent to',
  paid: 'paid',
  occurred_at: 'occurred at',
  precedes: 'precedes',
  related_to: 'related to',
}

/* --------------------------------------------------------------- timeline */

export const DATE_PRECISIONS = ['exact', 'estimated', 'range', 'conflicting'] as const
export type DatePrecision = (typeof DATE_PRECISIONS)[number]

export const DATE_PRECISION_META: Record<DatePrecision, { label: string; symbol: string; description: string }> = {
  exact: { label: 'Exact', symbol: '●', description: 'A specific date stated in a cited source.' },
  estimated: { label: 'Estimated', symbol: '◐', description: 'Inferred from surrounding context; not stated directly.' },
  range: { label: 'Range', symbol: '▭', description: 'Occurred somewhere inside a stated window.' },
  conflicting: { label: 'Conflicting', symbol: '⚠', description: 'Sources give different dates for the same event.' },
}

export const EVENT_CATEGORIES = [
  'filing',
  'meeting',
  'communication',
  'payment',
  'delivery',
  'decision',
  'publication',
  'other',
] as const
export type EventCategory = (typeof EVENT_CATEGORIES)[number]

/* ------------------------------------------------------------------- cases */

export const CASE_TEMPLATES = [
  {
    id: 'general',
    name: 'General Investigation',
    summary: 'A neutral starting point for any record set.',
    objective: 'Establish what the assembled records do and do not show.',
    focus: ['Key parties', 'Sequence of events', 'Internal consistency'],
  },
  {
    id: 'election_admin',
    name: 'Election Administration Review',
    summary: 'Procedural review of administrative records and reported figures.',
    objective:
      'Compare procedural records against reported administrative figures and identify unexplained differences.',
    focus: ['Chain of custody', 'Reported vs recorded counts', 'Procedure adherence', 'Certification timing'],
  },
  {
    id: 'procurement',
    name: 'Public Procurement Review',
    summary: 'Solicitation, award, invoice and delivery records.',
    objective: 'Trace a procurement from request through award, invoice and delivery.',
    focus: ['Award basis', 'Delivery dates', 'Invoiced vs received quantities', 'Approvals'],
  },
  {
    id: 'journalism',
    name: 'Investigative Journalism',
    summary: 'Mixed documents, transcripts and public pages for a story.',
    objective: 'Determine which statements are documented, which conflict and which remain unverified.',
    focus: ['Attributable statements', 'Contradictions', 'Unverified assertions', 'Follow-up records'],
  },
  {
    id: 'compliance',
    name: 'Corporate Compliance Review',
    summary: 'Internal policy, approvals and transaction records.',
    objective: 'Assess whether documented actions match documented policy.',
    focus: ['Policy text', 'Approval trail', 'Exceptions', 'Disclosure timing'],
  },
  {
    id: 'blank',
    name: 'Blank Case',
    summary: 'No template. Define the objective yourself.',
    objective: '',
    focus: [],
  },
] as const

export type CaseTemplateId = (typeof CASE_TEMPLATES)[number]['id']

export const CASE_STATUSES = ['active', 'archived'] as const
export type CaseStatus = (typeof CASE_STATUSES)[number]

/* ------------------------------------------------------------------- plans */

export type PlanId = 'free' | 'pro'

export interface PlanLimits {
  id: PlanId
  name: string
  priceMonthly: number
  activeCases: number
  processedPagesPerMonth: number
  aiOperationsPerMonth: number
  storageBytes: number
  publicEvidenceRooms: number
  pdfExport: boolean
  advancedDiscrepancy: boolean
  priorityProcessing: boolean
  blurb: string
  features: string[]
}

/**
 * Single source of truth for plan entitlements. Enforcement reads from here on
 * the server; the marketing pricing table renders from the same object.
 */
export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    activeCases: 2,
    processedPagesPerMonth: 100,
    aiOperationsPerMonth: 200,
    storageBytes: 250 * 1024 * 1024,
    publicEvidenceRooms: 0,
    pdfExport: false,
    advancedDiscrepancy: false,
    priorityProcessing: false,
    blurb: 'For a first case and a single record set.',
    features: [
      '2 active cases',
      '100 processed pages per month',
      'Core case map: claims, timeline, entities',
      'Source-backed questions',
      'Markdown export',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 24,
    activeCases: 50,
    processedPagesPerMonth: 2500,
    aiOperationsPerMonth: 5000,
    storageBytes: 20 * 1024 * 1024 * 1024,
    publicEvidenceRooms: 25,
    pdfExport: true,
    advancedDiscrepancy: true,
    priorityProcessing: true,
    blurb: 'For continuing investigations and published findings.',
    features: [
      '50 active cases',
      '2,500 processed pages per month',
      'Advanced contradiction analysis',
      'PDF dossier export',
      'Public evidence rooms',
      'Priority processing',
    ],
  },
}

export type UsageMetric = 'active_cases' | 'processed_pages' | 'ai_operations' | 'storage_bytes' | 'public_shares'

export const USAGE_METRIC_META: Record<UsageMetric, { label: string; limitKey: keyof PlanLimits; unit: 'count' | 'bytes' }> = {
  active_cases: { label: 'Active cases', limitKey: 'activeCases', unit: 'count' },
  processed_pages: { label: 'Processed pages', limitKey: 'processedPagesPerMonth', unit: 'count' },
  ai_operations: { label: 'AI operations', limitKey: 'aiOperationsPerMonth', unit: 'count' },
  storage_bytes: { label: 'Storage', limitKey: 'storageBytes', unit: 'bytes' },
  public_shares: { label: 'Evidence rooms', limitKey: 'publicEvidenceRooms', unit: 'count' },
}

/* ------------------------------------------------------------------- roles */

export const USER_ROLES = ['investigator', 'journalist', 'legal', 'researcher', 'watchdog', 'other'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  investigator: 'Public-records investigator',
  journalist: 'Journalist',
  legal: 'Legal or compliance',
  researcher: 'Researcher',
  watchdog: 'Watchdog organization',
  other: 'Other',
}

export const ORG_ROLES = ['owner', 'admin', 'member', 'viewer'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

/* ------------------------------------------------------------------ briefs */

export const BRIEF_SECTION_KEYS = [
  'objective',
  'executive_summary',
  'methodology',
  'source_inventory',
  'key_findings',
  'timeline',
  'material_claims',
  'discrepancies',
  'unresolved_questions',
  'recommended_records',
  'limitations',
  'appendix',
] as const
export type BriefSectionKey = (typeof BRIEF_SECTION_KEYS)[number]

export const BRIEF_SECTION_META: Record<BriefSectionKey, { title: string; hint: string; generated: boolean }> = {
  objective: { title: 'Case objective', hint: 'What this review set out to establish.', generated: true },
  executive_summary: { title: 'Executive summary', hint: 'What the records show, in neutral terms.', generated: true },
  methodology: { title: 'Methodology', hint: 'How the records were collected and analysed.', generated: true },
  source_inventory: { title: 'Source inventory', hint: 'Every record considered, with its identifier.', generated: false },
  key_findings: { title: 'Key findings', hint: 'Findings that the cited sources support.', generated: true },
  timeline: { title: 'Timeline', hint: 'Dated events with their citations.', generated: false },
  material_claims: { title: 'Material claims', hint: 'Claims marked material, with status.', generated: false },
  discrepancies: { title: 'Discrepancies', hint: 'Points where the records differ.', generated: false },
  unresolved_questions: { title: 'Unresolved questions', hint: 'What the records do not settle.', generated: true },
  recommended_records: { title: 'Recommended follow-up records', hint: 'Records that would resolve open questions.', generated: true },
  limitations: { title: 'Limitations', hint: 'What this analysis cannot establish.', generated: true },
  appendix: { title: 'Appendix and citations', hint: 'Full citation list.', generated: false },
}

/* ---------------------------------------------------------------- analysis */

export const ANALYSIS_OPERATIONS = [
  'source_summary',
  'entity_extraction',
  'claim_extraction',
  'timeline_extraction',
  'relationship_extraction',
  'discrepancy_analysis',
  'query_planning',
  'answer_generation',
  'brief_section',
  'missing_evidence',
] as const
export type AnalysisOperation = (typeof ANALYSIS_OPERATIONS)[number]

export const ANALYSIS_OPERATION_LABELS: Record<AnalysisOperation, string> = {
  source_summary: 'Source summary',
  entity_extraction: 'Entity extraction',
  claim_extraction: 'Claim extraction',
  timeline_extraction: 'Timeline extraction',
  relationship_extraction: 'Relationship extraction',
  discrepancy_analysis: 'Discrepancy analysis',
  query_planning: 'Query planning',
  answer_generation: 'Source-backed answer',
  brief_section: 'Brief section',
  missing_evidence: 'Missing-evidence suggestions',
}

export const ANALYSIS_RUN_STATUSES = ['running', 'complete', 'failed', 'partial'] as const
export type AnalysisRunStatus = (typeof ANALYSIS_RUN_STATUSES)[number]

/** The standing disclaimer shown wherever findings leave the workspace. */
export const NEUTRALITY_DISCLAIMER =
  'CaseSignal organises and cites records. Its outputs are research assistance, not findings of fact, legal conclusions or determinations about any person or organization. Verify every citation against the underlying record before publication.'

export const DEMO_BANNER = 'Fictional demonstration data'
