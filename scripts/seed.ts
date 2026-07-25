/**
 * Development seed.
 *
 *   npm run db:seed            create a local analyst and an EMPTY workspace
 *   npm run db:seed -- --demo  also create the fictional Northstar County case
 *   npm run db:seed -- --force rebuild the demo case even if one exists
 *
 * The demo case is deliberately NOT created by default. A fresh install should
 * look the way it looks for a real user — an empty workspace and a considered
 * empty state — rather than shipping with fictional records already in it. The
 * demo remains one click away in onboarding and on the dashboard.
 */
import './load-env'
import { eq } from 'drizzle-orm'
import { closeDb, getDb } from '../src/server/db'
import { organizationMembers, organizations, subscriptions, userProfiles } from '../src/server/db/schema'
import { seedDemoCase } from '../src/server/demo/seed'

const SEED_EMAIL = process.env.SEED_EMAIL ?? 'analyst@casesignal.local'
const SEED_NAME = process.env.SEED_NAME ?? 'Local Analyst'

async function main() {
  const withDemo = process.argv.includes('--demo')
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

  console.log('Seed complete.')
  console.log(`  Profile:      ${profile.displayName} <${profile.email}>`)
  console.log(`  Workspace:    ${organization.name}`)

  if (withDemo) {
    const caseId = await seedDemoCase({ organizationId: organization.id, profileId: profile.id, force })
    console.log(`  Demo case:    ${caseId} (fictional demonstration data)`)
  } else {
    console.log('  Cases:        none — the workspace starts empty')
    console.log('')
    console.log('  Add the fictional demo case with:  npm run db:seed -- --demo')
    console.log('  Or open it from the dashboard:     "Open the demo case"')
  }

  console.log('')
  console.log('Sign in locally with the email above at http://localhost:3000/sign-in')

  await closeDb()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
