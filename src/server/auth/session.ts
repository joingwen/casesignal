import 'server-only'

import { cookies } from 'next/headers'
import { and, eq, isNull } from 'drizzle-orm'
import { capabilities } from '@/lib/env'
import { getDb } from '@/server/db'
import { organizationMembers, organizations, subscriptions, userProfiles } from '@/server/db/schema'
import { slugify } from '@/lib/utils'
import type { OrgRole } from '@/lib/domain'

export const DEV_SESSION_COOKIE = 'cs_local_session'

export interface SessionContext {
  profile: {
    id: string
    clerkUserId: string
    email: string
    displayName: string
    avatarUrl: string | null
    role: string
    primaryUseCase: string
    onboardedAt: Date | null
  }
  organization: {
    id: string
    name: string
    slug: string
    kind: string
  }
  membershipRole: OrgRole
  /** True when running without Clerk credentials (local development session). */
  local: boolean
}

/**
 * Resolves the Clerk (or local) identity into a CaseSignal profile plus the
 * active organization, provisioning both on first sign-in.
 *
 * Every server action and route handler starts here. Nothing downstream ever
 * accepts an organization id from the client.
 */
export async function getSession(): Promise<SessionContext | null> {
  const identity = capabilities.clerkAuth
    ? await clerkIdentity()
    : capabilities.localAuth
      ? await localIdentity()
      : null
  if (!identity) return null
  return provision(identity)
}

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession()
  if (!session) {
    const { AuthorizationError } = await import('./errors')
    throw new AuthorizationError('You must be signed in to do that.')
  }
  return session
}

interface Identity {
  externalId: string
  email: string
  displayName: string
  avatarUrl: string | null
  orgExternalId?: string | null
  orgName?: string | null
  local: boolean
}

async function clerkIdentity(): Promise<Identity | null> {
  const { auth, currentUser } = await import('@clerk/nextjs/server')
  const { userId, orgId, orgSlug } = await auth()
  if (!userId) return null
  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? ''
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.username || email.split('@')[0] || 'Analyst'
  return {
    externalId: userId,
    email: email || `${userId}@users.noreply.casesignal.pro`,
    displayName,
    avatarUrl: user?.imageUrl ?? null,
    orgExternalId: orgId ?? null,
    orgName: orgSlug ?? null,
    local: false,
  }
}

/**
 * Local development identity.
 *
 * Backed by an unsigned process-local cookie and accepting any email with no
 * password, so it is a development convenience rather than an authentication
 * system. It is never reachable when Clerk is configured, and never in a
 * production build unless ALLOW_LOCAL_AUTH=1 is set deliberately — see
 * `capabilities.localAuth`.
 */
async function localIdentity(): Promise<Identity | null> {
  const store = await cookies()
  const raw = store.get(DEV_SESSION_COOKIE)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      id?: string
      email?: string
      name?: string
    }
    if (!parsed.id || !parsed.email) return null
    return {
      externalId: `local_${parsed.id}`,
      email: parsed.email,
      displayName: parsed.name || parsed.email.split('@')[0] || 'Analyst',
      avatarUrl: null,
      local: true,
    }
  } catch {
    return null
  }
}

export function encodeLocalSession(input: { id: string; email: string; name: string }) {
  return Buffer.from(JSON.stringify(input), 'utf8').toString('base64url')
}

async function provision(identity: Identity): Promise<SessionContext> {
  const db = await getDb()

  const existing = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.clerkUserId, identity.externalId))
    .limit(1)

  let profile = existing[0]
  if (!profile) {
    const inserted = await db
      .insert(userProfiles)
      .values({
        clerkUserId: identity.externalId,
        email: identity.email,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
      })
      .returning()
    profile = inserted[0]!
  } else if (
    profile.email !== identity.email ||
    profile.displayName !== identity.displayName ||
    profile.avatarUrl !== identity.avatarUrl
  ) {
    const updated = await db
      .update(userProfiles)
      .set({
        email: identity.email,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, profile.id))
      .returning()
    profile = updated[0] ?? profile
  }

  const organization = identity.orgExternalId
    ? await ensureClerkOrganization(profile.id, identity.orgExternalId, identity.orgName ?? 'Workspace')
    : await ensurePersonalOrganization(profile.id, identity.displayName)

  const membership = await db
    .select()
    .from(organizationMembers)
    .where(
      and(eq(organizationMembers.organizationId, organization.id), eq(organizationMembers.profileId, profile.id)),
    )
    .limit(1)

  return {
    profile: {
      id: profile.id,
      clerkUserId: profile.clerkUserId,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      role: profile.role,
      primaryUseCase: profile.primaryUseCase,
      onboardedAt: profile.onboardedAt,
    },
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      kind: organization.kind,
    },
    membershipRole: (membership[0]?.role as OrgRole) ?? 'owner',
    local: identity.local,
  }
}

async function ensurePersonalOrganization(profileId: string, displayName: string) {
  const db = await getDb()
  const existing = await db
    .select()
    .from(organizations)
    .innerJoin(organizationMembers, eq(organizationMembers.organizationId, organizations.id))
    .where(
      and(
        eq(organizationMembers.profileId, profileId),
        eq(organizations.kind, 'personal'),
        isNull(organizations.deletedAt),
      ),
    )
    .limit(1)

  if (existing[0]) return existing[0].organizations

  const base = slugify(`${displayName || 'workspace'}-workspace`) || 'workspace'
  const slug = await uniqueSlug(base)
  const inserted = await db
    .insert(organizations)
    .values({
      name: displayName ? `${displayName}'s workspace` : 'Personal workspace',
      slug,
      kind: 'personal',
      createdByProfileId: profileId,
    })
    .returning()
  const organization = inserted[0]!
  await db
    .insert(organizationMembers)
    .values({ organizationId: organization.id, profileId, role: 'owner' })
    .onConflictDoNothing()
  await db.insert(subscriptions).values({ organizationId: organization.id, plan: 'free' }).onConflictDoNothing()
  return organization
}

async function ensureClerkOrganization(profileId: string, clerkOrgId: string, name: string) {
  const db = await getDb()
  const existing = await db.select().from(organizations).where(eq(organizations.clerkOrgId, clerkOrgId)).limit(1)
  let organization = existing[0]
  if (!organization) {
    const slug = await uniqueSlug(slugify(name) || 'workspace')
    const inserted = await db
      .insert(organizations)
      .values({ clerkOrgId, name, slug, kind: 'team', createdByProfileId: profileId })
      .returning()
    organization = inserted[0]!
    await db.insert(subscriptions).values({ organizationId: organization.id, plan: 'free' }).onConflictDoNothing()
  }
  await db
    .insert(organizationMembers)
    .values({ organizationId: organization.id, profileId, role: 'member' })
    .onConflictDoNothing()
  return organization
}

async function uniqueSlug(base: string) {
  const db = await getDb()
  let candidate = base || 'workspace'
  let n = 1
  // Slugs are workspace-visible identifiers; keep them short and stable.
  while (true) {
    const clash = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, candidate)).limit(1)
    if (!clash[0]) return candidate
    n += 1
    candidate = `${base}-${n}`
  }
}
