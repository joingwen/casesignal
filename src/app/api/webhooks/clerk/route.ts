import crypto from 'node:crypto'
import { and, eq, inArray } from 'drizzle-orm'

import { env } from '@/lib/env'
import { getDb } from '@/server/db'
import { cases, organizationMembers, organizations, sources, userProfiles } from '@/server/db/schema'
import { deleteObject } from '@/server/storage'

/**
 * Clerk webhook.
 *
 * The Svix signature is verified here with `node:crypto` rather than by adding
 * a dependency: the scheme is a plain HMAC-SHA256 over
 * `${svix-id}.${svix-timestamp}.${raw body}` keyed with the base64 payload of
 * the `whsec_` secret. Comparison is constant-time and stale timestamps are
 * refused, so a captured delivery cannot be replayed.
 *
 * Only identity data is synced. Nothing here grants entitlements — plan state
 * comes from the Stripe webhook alone.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Deliveries older than this are treated as replays. */
const TOLERANCE_SECONDS = 5 * 60

export async function POST(request: Request) {
  if (!env.CLERK_WEBHOOK_SECRET) {
    return Response.json(
      {
        ok: false,
        error:
          'Clerk webhooks are not configured in this environment. Set CLERK_WEBHOOK_SECRET to enable identity sync.',
      },
      { status: 501 },
    )
  }

  const svixId = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ ok: false, error: 'Missing signature headers.' }, { status: 400 })
  }

  const body = await request.text()

  if (!withinTolerance(svixTimestamp)) {
    return Response.json({ ok: false, error: 'Signature timestamp is outside the accepted window.' }, { status: 400 })
  }

  if (!signatureMatches({ id: svixId, timestamp: svixTimestamp, body, header: svixSignature, secret: env.CLERK_WEBHOOK_SECRET })) {
    return Response.json({ ok: false, error: 'Invalid signature.' }, { status: 400 })
  }

  let event: ClerkEvent
  try {
    event = JSON.parse(body) as ClerkEvent
  } catch {
    return Response.json({ ok: false, error: 'Malformed payload.' }, { status: 400 })
  }

  try {
    if (event.type === 'user.updated' || event.type === 'user.created') {
      await syncProfile(event.data)
    } else if (event.type === 'user.deleted') {
      await removeProfile(event.data?.id)
    }
  } catch {
    return Response.json({ ok: false }, { status: 500 })
  }

  return Response.json({ ok: true }, { status: 200 })
}

/* -------------------------------------------------------- svix verification */

function withinTolerance(timestamp: string): boolean {
  const seconds = Number(timestamp)
  if (!Number.isFinite(seconds)) return false
  return Math.abs(Math.floor(Date.now() / 1000) - seconds) <= TOLERANCE_SECONDS
}

/**
 * `svix-signature` carries one or more space-separated `v1,<base64>` entries —
 * more than one during a secret rotation. Every candidate is compared, and the
 * comparison itself never short-circuits on content.
 */
function signatureMatches(input: {
  id: string
  timestamp: string
  body: string
  header: string
  secret: string
}): boolean {
  const key = secretKey(input.secret)
  if (!key) return false

  const expected = crypto
    .createHmac('sha256', key)
    .update(`${input.id}.${input.timestamp}.${input.body}`)
    .digest()

  let matched = false
  for (const entry of input.header.split(' ')) {
    const [version, value] = entry.split(',')
    if (version !== 'v1' || !value) continue
    let candidate: Buffer
    try {
      candidate = Buffer.from(value, 'base64')
    } catch {
      continue
    }
    if (candidate.length !== expected.length) continue
    // Evaluated for every entry: no early exit reveals which one matched.
    if (crypto.timingSafeEqual(candidate, expected)) matched = true
  }
  return matched
}

function secretKey(secret: string): Buffer | null {
  const encoded = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  if (!encoded) return null
  const key = Buffer.from(encoded, 'base64')
  return key.length > 0 ? key : null
}

/* --------------------------------------------------------------- handlers */

interface ClerkUserData {
  id?: string
  email_addresses?: { id?: string; email_address?: string }[]
  primary_email_address_id?: string | null
  first_name?: string | null
  last_name?: string | null
  username?: string | null
  image_url?: string | null
}

interface ClerkEvent {
  type?: string
  data?: ClerkUserData
}

function primaryEmail(data: ClerkUserData): string | null {
  const addresses = data.email_addresses ?? []
  const primary = addresses.find((a) => a.id && a.id === data.primary_email_address_id)
  return primary?.email_address ?? addresses[0]?.email_address ?? null
}

function displayNameOf(data: ClerkUserData, email: string | null): string {
  const full = [data.first_name, data.last_name].filter(Boolean).join(' ').trim()
  return full || data.username?.trim() || email?.split('@')[0] || 'Analyst'
}

async function syncProfile(data: ClerkUserData | undefined) {
  if (!data?.id) return
  const db = await getDb()

  const rows = await db.select().from(userProfiles).where(eq(userProfiles.clerkUserId, data.id)).limit(1)
  const profile = rows[0]
  if (!profile) return // The profile is provisioned on first sign-in, not here.

  const email = primaryEmail(data)
  await db
    .update(userProfiles)
    .set({
      email: email ?? profile.email,
      displayName: displayNameOf(data, email ?? profile.email),
      avatarUrl: data.image_url ?? null,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.id, profile.id))
}

/**
 * Soft-deletes the profile and removes the case content that belongs to nobody
 * else: cases in a personal organization this user was the only member of.
 * Stored files go first, so no orphaned bytes are left behind if the row
 * deletion fails partway.
 */
async function removeProfile(clerkUserId: string | undefined) {
  if (!clerkUserId) return
  const db = await getDb()

  const rows = await db.select().from(userProfiles).where(eq(userProfiles.clerkUserId, clerkUserId)).limit(1)
  const profile = rows[0]
  if (!profile) return

  const personalOrgs = await db
    .select({ id: organizations.id })
    .from(organizations)
    .innerJoin(organizationMembers, eq(organizationMembers.organizationId, organizations.id))
    .where(and(eq(organizationMembers.profileId, profile.id), eq(organizations.kind, 'personal')))

  for (const org of personalOrgs) {
    const members = await db
      .select({ profileId: organizationMembers.profileId })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, org.id))

    // Only when this user was the sole member is the content solely theirs.
    if (members.length !== 1 || members[0]?.profileId !== profile.id) continue

    const orgCases = await db.select({ id: cases.id }).from(cases).where(eq(cases.organizationId, org.id))
    if (orgCases.length === 0) continue
    const caseIds = orgCases.map((c) => c.id)

    const storedFiles = await db
      .select({ storageKey: sources.storageKey })
      .from(sources)
      .where(inArray(sources.caseId, caseIds))

    for (const file of storedFiles) {
      if (!file.storageKey) continue
      // A storage failure must not block the database deletion.
      await deleteObject(file.storageKey).catch(() => undefined)
    }

    await db.delete(cases).where(inArray(cases.id, caseIds))
  }

  await db
    .update(userProfiles)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(userProfiles.id, profile.id))
}
