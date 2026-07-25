'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '@/server/db'
import { cases, organizations, userProfiles } from '@/server/db/schema'
import { requireSession, DEV_SESSION_COOKIE, encodeLocalSession } from '@/server/auth/session'
import { recordAudit } from '@/server/auth/guard'
import { USER_ROLES } from '@/lib/domain'
import { capabilities } from '@/lib/env'
import { deleteObject } from '@/server/storage'
import { sources } from '@/server/db/schema'
import { and, isNull } from 'drizzle-orm'
import { actionResult, type ActionResult } from './result'

const onboardingSchema = z.object({
  role: z.enum(USER_ROLES),
  primaryUseCase: z.string().trim().max(400).default(''),
  displayName: z.string().trim().min(1).max(120).optional(),
})

export async function completeOnboarding(input: z.infer<typeof onboardingSchema>): Promise<ActionResult<null>> {
  return actionResult(async () => {
    const parsed = onboardingSchema.parse(input)
    const session = await requireSession()
    const db = await getDb()
    await db
      .update(userProfiles)
      .set({
        role: parsed.role,
        primaryUseCase: parsed.primaryUseCase,
        ...(parsed.displayName ? { displayName: parsed.displayName } : {}),
        onboardedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, session.profile.id))
    revalidatePath('/app', 'layout')
    return null
  })
}

const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter a name.').max(120),
  role: z.enum(USER_ROLES),
  primaryUseCase: z.string().trim().max(400).default(''),
})

export async function updateProfile(input: z.infer<typeof profileSchema>): Promise<ActionResult<null>> {
  return actionResult(async () => {
    const parsed = profileSchema.parse(input)
    const session = await requireSession()
    const db = await getDb()
    await db
      .update(userProfiles)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(userProfiles.id, session.profile.id))
    revalidatePath('/app', 'layout')
    return null
  })
}

const workspaceSchema = z.object({ name: z.string().trim().min(2, 'Enter a workspace name.').max(120) })

export async function updateWorkspace(input: z.infer<typeof workspaceSchema>): Promise<ActionResult<null>> {
  return actionResult(async () => {
    const parsed = workspaceSchema.parse(input)
    const session = await requireSession()
    if (session.membershipRole === 'viewer') throw new Error('You have read-only access to this workspace.')
    const db = await getDb()
    await db
      .update(organizations)
      .set({ name: parsed.name, updatedAt: new Date() })
      .where(eq(organizations.id, session.organization.id))
    revalidatePath('/app', 'layout')
    return null
  })
}

/**
 * Deletes every case in the workspace along with its stored files.
 *
 * Provided so an analyst can remove sensitive material without contacting
 * support. Audited before the rows disappear.
 */
export async function deleteAllCases(confirmation: string): Promise<ActionResult<{ deleted: number }>> {
  return actionResult(async () => {
    const session = await requireSession()
    if (confirmation !== 'DELETE') throw new Error('Type DELETE to confirm.')
    const db = await getDb()

    const caseRows = await db
      .select({ id: cases.id, title: cases.title })
      .from(cases)
      .where(and(eq(cases.organizationId, session.organization.id), isNull(cases.deletedAt)))

    for (const caseRow of caseRows) {
      const fileRows = await db.select({ storageKey: sources.storageKey }).from(sources).where(eq(sources.caseId, caseRow.id))
      for (const file of fileRows) {
        if (file.storageKey) await deleteObject(file.storageKey).catch(() => undefined)
      }
    }

    await recordAudit({
      organizationId: session.organization.id,
      profileId: session.profile.id,
      action: 'workspace.cases_deleted',
      targetType: 'organization',
      targetId: session.organization.id,
      detail: { summary: `Deleted all ${caseRows.length} cases in this workspace` },
    })

    for (const caseRow of caseRows) {
      await db.delete(cases).where(eq(cases.id, caseRow.id))
    }

    revalidatePath('/app', 'layout')
    return { deleted: caseRows.length }
  })
}

/* ----------------------------------------------------- local dev sessions */

const localSignInSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  name: z.string().trim().min(1, 'Enter your name.').max(120),
})

/**
 * Local development sign-in. Only reachable when Clerk is not configured; the
 * sign-in screen says so explicitly so this can never be mistaken for the real
 * authentication path.
 */
export async function localSignIn(input: z.infer<typeof localSignInSchema>): Promise<ActionResult<null>> {
  return actionResult(async () => {
    if (capabilities.clerkAuth) throw new Error('Clerk is configured — use the hosted sign-in.')
    const parsed = localSignInSchema.parse(input)
    const store = await cookies()
    const id = Buffer.from(parsed.email.toLowerCase()).toString('hex').slice(0, 24)
    store.set(DEV_SESSION_COOKIE, encodeLocalSession({ id, email: parsed.email.toLowerCase(), name: parsed.name }), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    return null
  })
}

export async function signOutLocal() {
  const store = await cookies()
  store.delete(DEV_SESSION_COOKIE)
  redirect('/')
}
