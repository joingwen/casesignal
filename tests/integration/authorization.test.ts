import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { closeDb, getDb } from '@/server/db'
import {
  cases,
  claims,
  organizationMembers,
  organizations,
  publicShares,
  sourceChunks,
  sources,
  subscriptions,
  userProfiles,
} from '@/server/db/schema'
import { seedDemoCase } from '@/server/demo/seed'
import { retrieve } from '@/server/retrieval'
import { getClaims, getDiscrepancies, getSources, getTimeline } from '@/server/queries/case-detail'
import { hashSharePassword, verifySharePassword } from '@/server/share/password'
import { getPlanState, getUsageSnapshot } from '@/server/billing/limits'
import { PlanLimitError } from '@/server/auth/errors'
import { assertWithinLimit } from '@/server/billing/limits'
import { recordUsage } from '@/server/ai/ledger'
import { PLANS } from '@/lib/domain'

/**
 * Integration coverage runs against a real embedded Postgres with the real
 * migrations applied, so schema constraints, cascades and SQL are all exercised.
 */

let orgA: string
let orgB: string
let profileA: string
let profileB: string
let caseA: string

beforeAll(async () => {
  const db = await getDb()

  const [pa] = await db
    .insert(userProfiles)
    .values({ clerkUserId: 'test_user_a', email: 'a@example.test', displayName: 'Analyst A' })
    .returning()
  const [pb] = await db
    .insert(userProfiles)
    .values({ clerkUserId: 'test_user_b', email: 'b@example.test', displayName: 'Analyst B' })
    .returning()
  profileA = pa!.id
  profileB = pb!.id

  const [oa] = await db
    .insert(organizations)
    .values({ name: 'Workspace A', slug: 'workspace-a', kind: 'personal', createdByProfileId: profileA })
    .returning()
  const [ob] = await db
    .insert(organizations)
    .values({ name: 'Workspace B', slug: 'workspace-b', kind: 'personal', createdByProfileId: profileB })
    .returning()
  orgA = oa!.id
  orgB = ob!.id

  await db.insert(organizationMembers).values([
    { organizationId: orgA, profileId: profileA, role: 'owner' },
    { organizationId: orgB, profileId: profileB, role: 'owner' },
  ])
  await db.insert(subscriptions).values([
    { organizationId: orgA, plan: 'free' },
    { organizationId: orgB, plan: 'free' },
  ])

  caseA = await seedDemoCase({ organizationId: orgA, profileId: profileA })
})

afterAll(async () => {
  await closeDb()
})

describe('organization ownership', () => {
  it('scopes a seeded case to the organization that created it', async () => {
    const db = await getDb()
    const owned = await db.select({ id: cases.id }).from(cases).where(eq(cases.organizationId, orgA))
    expect(owned.map((c) => c.id)).toContain(caseA)

    const otherOrg = await db.select({ id: cases.id }).from(cases).where(eq(cases.organizationId, orgB))
    expect(otherOrg).toHaveLength(0)
  })

  it('does not grant a non-member any membership row for the case organization', async () => {
    const db = await getDb()
    const membership = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, orgA), eq(organizationMembers.profileId, profileB)))
    expect(membership).toHaveLength(0)
  })
})

describe('database constraints', () => {
  it('refuses an invalid claim status', async () => {
    const db = await getDb()
    await expect(
      db.insert(claims).values({ caseId: caseA, statement: 'An invalid status.', status: 'probably_true' }),
    ).rejects.toThrow()
  })

  it('refuses an invalid processing status', async () => {
    const db = await getDb()
    await expect(
      db.insert(sources).values({ caseId: caseA, label: 'S99', title: 'Bad', kind: 'note', format: 'note', status: 'pending' }),
    ).rejects.toThrow()
  })

  it('refuses a confidence value outside 0–1', async () => {
    const db = await getDb()
    await expect(
      db.insert(claims).values({ caseId: caseA, statement: 'Out of range confidence.', confidence: 4 }),
    ).rejects.toThrow()
  })

  it('cascades deletion from case to sources, chunks and claims', async () => {
    const db = await getDb()
    const throwaway = await seedDemoCase({ organizationId: orgB, profileId: profileB, force: true })

    const before = await db.select({ id: sourceChunks.id }).from(sourceChunks).where(eq(sourceChunks.caseId, throwaway))
    expect(before.length).toBeGreaterThan(0)

    await db.delete(cases).where(eq(cases.id, throwaway))

    const afterChunks = await db.select({ id: sourceChunks.id }).from(sourceChunks).where(eq(sourceChunks.caseId, throwaway))
    const afterSources = await db.select({ id: sources.id }).from(sources).where(eq(sources.caseId, throwaway))
    const afterClaims = await db.select({ id: claims.id }).from(claims).where(eq(claims.caseId, throwaway))
    expect(afterChunks).toHaveLength(0)
    expect(afterSources).toHaveLength(0)
    expect(afterClaims).toHaveLength(0)
  })
})

describe('seeded demo case', () => {
  it('creates the full evidence set with stable citation labels', async () => {
    const sourceList = await getSources(caseA)
    expect(sourceList.length).toBe(7)
    expect(sourceList.map((s) => s.label)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'])
    expect(sourceList.every((s) => s.status === 'complete')).toBe(true)
  })

  it('links every claim to at least one stored excerpt', async () => {
    const claimList = await getClaims(caseA)
    expect(claimList.length).toBeGreaterThanOrEqual(10)
    for (const claim of claimList) {
      expect(claim.evidence.length).toBeGreaterThan(0)
      for (const evidence of claim.evidence) {
        expect(evidence.excerpt.trim().length).toBeGreaterThan(0)
        expect(evidence.sourceLabel).toMatch(/^S\d+$/)
      }
    }
  })

  it('resolves the page-14 minutes citation to the exact page', async () => {
    const claimList = await getClaims(caseA)
    const evidence = claimList.flatMap((c) => c.evidence).find((e) => e.locator === 'p. 14')
    expect(evidence).toBeDefined()
    expect(evidence!.sourceLabel).toBe('S4')
    expect(evidence!.excerpt).toContain('September 18, 2024')
  })

  it('resolves the spreadsheet citation to sheet and row', async () => {
    const claimList = await getClaims(caseA)
    const evidence = claimList.flatMap((c) => c.evidence).find((e) => e.locator.includes('row 221'))
    expect(evidence).toBeDefined()
    expect(evidence!.locator).toBe('Sheet “Invoices,” row 221')
    expect(evidence!.excerpt).toContain('240')
  })

  it('records both sides of every discrepancy from different sources', async () => {
    const list = await getDiscrepancies(caseA)
    expect(list.length).toBe(4)
    for (const discrepancy of list) {
      expect(discrepancy.sides).toHaveLength(2)
      expect(discrepancy.sides[0]!.sourceId).not.toBe(discrepancy.sides[1]!.sourceId)
      expect(discrepancy.sides.every((s) => s.statedValue.length > 0)).toBe(true)
      // Discrepancy language must stay descriptive, never accusatory.
      expect(discrepancy.description.toLowerCase()).not.toMatch(/\b(lied|fraud|corrupt|criminal|guilty)\b/)
    }
  })

  it('marks conflicting timeline dates as conflicting rather than exact', async () => {
    const events = await getTimeline(caseA)
    const conflicting = events.filter((e) => e.precision === 'conflicting')
    expect(conflicting.length).toBeGreaterThanOrEqual(2)
    for (const event of events) expect(event.citations.length).toBeGreaterThan(0)
  })
})

describe('retrieval', () => {
  it('returns excerpts that belong to the queried case only', async () => {
    const results = await retrieve({ caseId: caseA, query: 'delivery date September', limit: 8 })
    expect(results.length).toBeGreaterThan(0)

    const db = await getDb()
    const caseSourceIds = new Set(
      (await db.select({ id: sources.id }).from(sources).where(eq(sources.caseId, caseA))).map((s) => s.id),
    )
    for (const chunk of results) expect(caseSourceIds.has(chunk.sourceId)).toBe(true)
  })

  it('finds the invoice row by an exact numeric term', async () => {
    const results = await retrieve({ caseId: caseA, query: 'INV-4471 240 units', limit: 10 })
    expect(results.some((r) => r.locator.includes('row 221'))).toBe(true)
  })

  it('spreads results across sources rather than one record', async () => {
    const results = await retrieve({ caseId: caseA, query: 'delivery workstations September 2024', limit: 10 })
    expect(new Set(results.map((r) => r.sourceId)).size).toBeGreaterThan(1)
  })

  it('returns nothing for a case with no sources', async () => {
    const db = await getDb()
    const [empty] = await db
      .insert(cases)
      .values({ organizationId: orgB, title: 'Empty case', createdByProfileId: profileB })
      .returning()
    const results = await retrieve({ caseId: empty!.id, query: 'anything at all' })
    expect(results).toEqual([])
  })
})

describe('public share permissions', () => {
  it('hashes and verifies a share password without storing it', () => {
    const stored = hashSharePassword('correct horse battery staple')
    expect(stored).not.toContain('correct horse')
    expect(stored.startsWith('scrypt$')).toBe(true)
    expect(verifySharePassword('correct horse battery staple', stored)).toBe(true)
    expect(verifySharePassword('wrong password', stored)).toBe(false)
  })

  it('rejects a malformed stored hash rather than throwing', () => {
    expect(verifySharePassword('anything', 'not-a-hash')).toBe(false)
  })

  it('defaults a new share to disabled and to hiding analyst notes', async () => {
    const db = await getDb()
    const [share] = await db.insert(publicShares).values({ caseId: caseA, slug: 'default-share-test' }).returning()
    expect(share!.enabled).toBe(false)
    expect(share!.showAnalystNotes).toBe(false)
    expect(share!.allowDownloads).toBe(false)
  })

  it('keeps low-materiality claims out of the shared set by default', async () => {
    const claimList = await getClaims(caseA)
    const lowMateriality = claimList.filter((c) => c.materiality === 'low')
    expect(lowMateriality.length).toBeGreaterThan(0)
    expect(lowMateriality.every((c) => c.includedInShare === false)).toBe(true)
  })
})

describe('plan limits', () => {
  it('starts a new organization on the free plan', async () => {
    const state = await getPlanState(orgB)
    expect(state.planId).toBe('free')
    expect(state.plan.activeCases).toBe(PLANS.free.activeCases)
  })

  it('reports usage against the plan limits', async () => {
    const snapshot = await getUsageSnapshot(orgA)
    const activeCases = snapshot.find((s) => s.metric === 'active_cases')!
    expect(activeCases.limit).toBe(PLANS.free.activeCases)
    expect(activeCases.used).toBeGreaterThanOrEqual(1)
  })

  it('refuses a metric that is not on the plan at all', async () => {
    await expect(assertWithinLimit(orgA, 'public_shares')).rejects.toThrow(PlanLimitError)
  })

  it('refuses work once a metered limit is exhausted, naming the limit', async () => {
    const db = await getDb()
    const [org] = await db
      .insert(organizations)
      .values({ name: 'Limit test', slug: 'limit-test', kind: 'personal' })
      .returning()
    await db.insert(subscriptions).values({ organizationId: org!.id, plan: 'free' })

    await recordUsage({
      organizationId: org!.id,
      metric: 'processed_pages',
      quantity: PLANS.free.processedPagesPerMonth,
    })

    await expect(assertWithinLimit(org!.id, 'processed_pages')).rejects.toThrow(PlanLimitError)
    await expect(assertWithinLimit(org!.id, 'processed_pages')).rejects.toThrow(/processed pages/i)
  })

  it('allows work while under the limit', async () => {
    const db = await getDb()
    const [org] = await db
      .insert(organizations)
      .values({ name: 'Under limit', slug: 'under-limit', kind: 'personal' })
      .returning()
    await db.insert(subscriptions).values({ organizationId: org!.id, plan: 'free' })
    await expect(assertWithinLimit(org!.id, 'processed_pages')).resolves.toBeUndefined()
  })
})
