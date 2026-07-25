/**
 * Development seed.
 *
 *   npm run db:seed
 *
 * Creates a local analyst profile, a personal workspace and the fictional
 * Northstar County demonstration case. Safe to re-run: the demo case is only
 * created once per workspace unless --force is passed.
 */
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { closeDb, getDb } from '../src/server/db'
import { organizationMembers, organizations, subscriptions, userProfiles } from '../src/server/db/schema'
import { seedDemoCase } from '../src/server/demo/seed'

const SEED_EMAIL = process.env.SEED_EMAIL ?? 'analyst@casesignal.local'
const SEED_NAME = process.env.SEED_NAME ?? 'Local Analyst'

async function main() {
  const force = process.argv.includes('--force')
  const db = await getDb()

  const clerkUserId = `local_${Buffer.from(SEED_EMAIL.toLowerCase()).toString('hex').slice(0, 24)}`

  const existingProfile = await db.select().from(userProfiles).where(eq(userProfiles.clerkUserId, clerkUserId)).limit(1)
  const profile =
    existingProfile[0] ??
    (
      await db
        .insert(userProfiles)
        .values({
          clerkUserId,
          email: SEED_EMAIL,
          displayName: SEED_NAME,
          role: 'investigator',
          primaryUseCase: 'Public records review',
          onboardedAt: new Date(),
        })
        .returning()
    )[0]!

  const existingOrg = await db.select().from(organizations).where(eq(organizations.slug, 'local-workspace')).limit(1)
  const organization =
    existingOrg[0] ??
    (
      await db
        .insert(organizations)
        .values({
          name: `${SEED_NAME}'s workspace`,
          slug: 'local-workspace',
          kind: 'personal',
          createdByProfileId: profile.id,
        })
        .returning()
    )[0]!

  await db
    .insert(organizationMembers)
    .values({ organizationId: organization.id, profileId: profile.id, role: 'owner' })
    .onConflictDoNothing()
  await db.insert(subscriptions).values({ organizationId: organization.id, plan: 'free' }).onConflictDoNothing()

  const caseId = await seedDemoCase({ organizationId: organization.id, profileId: profile.id, force })

  console.log('Seed complete.')
  console.log(`  Profile:      ${profile.displayName} <${profile.email}>`)
  console.log(`  Workspace:    ${organization.name}`)
  console.log(`  Demo case:    ${caseId}`)
  console.log('')
  console.log('Sign in locally with the email above at http://localhost:3000/sign-in')

  await closeDb()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
