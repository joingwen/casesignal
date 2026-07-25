import 'server-only'

import { and, eq, isNull } from 'drizzle-orm'
import { getDb } from '@/server/db'
import { auditLogs, caseMembers, cases, organizationMembers, sources } from '@/server/db/schema'
import { AuthorizationError, NotFoundError } from './errors'
import { getSession, requireSession, type SessionContext } from './session'

export interface CaseAccess {
  session: SessionContext
  caseRecord: typeof cases.$inferSelect
  /** Whether the actor may mutate the case. Viewers get read-only access. */
  canWrite: boolean
}

/**
 * The single authorization gate for case content.
 *
 * A case id from a URL is never trusted: we load the case, then verify the
 * signed-in profile is a member of the organization that owns it. Every read
 * and write path in the application funnels through this function, which is
 * what prevents cross-organization access (IDOR) at the data layer rather than
 * at the routing layer.
 */
export async function requireCaseAccess(caseId: string, options: { write?: boolean } = {}): Promise<CaseAccess> {
  const session = await requireSession()
  const db = await getDb()

  if (!isUuid(caseId)) throw new NotFoundError('That case does not exist.')

  const rows = await db
    .select()
    .from(cases)
    .where(and(eq(cases.id, caseId), isNull(cases.deletedAt)))
    .limit(1)

  const caseRecord = rows[0]
  if (!caseRecord) throw new NotFoundError('That case does not exist.')

  const membership = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, caseRecord.organizationId),
        eq(organizationMembers.profileId, session.profile.id),
      ),
    )
    .limit(1)

  if (!membership[0]) {
    // Fall back to an explicit per-case grant before refusing.
    const direct = await db
      .select({ role: caseMembers.role })
      .from(caseMembers)
      .where(and(eq(caseMembers.caseId, caseId), eq(caseMembers.profileId, session.profile.id)))
      .limit(1)
    if (!direct[0]) throw new AuthorizationError()
    const canWrite = direct[0].role !== 'viewer'
    if (options.write && !canWrite) throw new AuthorizationError('You have read-only access to this case.')
    return { session, caseRecord, canWrite }
  }

  const canWrite = membership[0].role !== 'viewer'
  if (options.write && !canWrite) throw new AuthorizationError('You have read-only access to this case.')
  return { session, caseRecord, canWrite }
}

/**
 * Verifies a source belongs to a case the actor can access.
 *
 * The session is established *before* the source is loaded: otherwise an
 * unauthenticated caller could distinguish a real source id (403) from a
 * non-existent one (404) and enumerate ids.
 */
export async function requireSourceAccess(sourceId: string, options: { write?: boolean } = {}) {
  await requireSession()
  if (!isUuid(sourceId)) throw new NotFoundError('That source does not exist.')
  const db = await getDb()
  const rows = await db
    .select()
    .from(sources)
    .where(and(eq(sources.id, sourceId), isNull(sources.deletedAt)))
    .limit(1)
  const source = rows[0]
  if (!source) throw new NotFoundError('That source does not exist.')
  const access = await requireCaseAccess(source.caseId, options)
  return { ...access, source }
}

export async function optionalSession() {
  return getSession()
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Appends an audit entry. Used for actions with evidentiary or privacy weight:
 * exports, share-link changes, deletions and source removal.
 */
export async function recordAudit(input: {
  organizationId?: string | null
  caseId?: string | null
  profileId?: string | null
  action: string
  targetType?: string
  targetId?: string | null
  detail?: Record<string, unknown>
}) {
  const db = await getDb()
  await db.insert(auditLogs).values({
    organizationId: input.organizationId ?? null,
    caseId: input.caseId ?? null,
    profileId: input.profileId ?? null,
    action: input.action,
    targetType: input.targetType ?? '',
    targetId: input.targetId ?? null,
    detail: input.detail ?? {},
  })
}
