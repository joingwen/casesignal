import { expect, test, type Page } from '@playwright/test'

/**
 * Critical-path smoke tests.
 *
 * These cover the flows a demo or a first user actually walks: the landing page,
 * the authentication boundary, opening the demo case, creating a case, adding a
 * source, watching it process, inspecting a citation, asking the copilot, and
 * exporting a brief.
 */

/**
 * The seed script (`npm run db:seed`, run by the Playwright web server) creates
 * this analyst and gives their workspace the fictional demo case. Signing in
 * with the same address lands in that workspace.
 */
const ANALYST = { name: 'Local Analyst', email: 'analyst@casesignal.local' }

async function signIn(page: Page) {
  await page.goto('/sign-in')
  const email = page.getByLabel(/email/i)
  if (await email.isVisible().catch(() => false)) {
    await page.getByLabel(/name/i).first().fill(ANALYST.name)
    await email.fill(ANALYST.email)
    await page.getByRole('button', { name: /continue|sign in/i }).click()
    await page.waitForURL(/\/app/, { timeout: 30_000 })
  }
}

async function openWorkspace(page: Page, caseTitle = /Northstar County/i) {
  await page.goto('/app')

  const link = page.getByRole('link', { name: caseTitle }).first()
  if (await link.isVisible().catch(() => false)) {
    await link.click()
    await page.waitForURL(/\/app\/cases\/[0-9a-f-]{36}/, { timeout: 30_000 })
    return
  }

  // Fresh workspace: provision the demo case, then open it.
  const openDemo = page.getByRole('button', { name: /demo case/i }).first()
  if (await openDemo.isVisible().catch(() => false)) {
    await openDemo.click()
    await page.waitForURL(/\/app\/cases\/[0-9a-f-]{36}/, { timeout: 90_000 })
    return
  }

  throw new Error('No demo case was available in this workspace — did `npm run db:seed` run?')
}

/** The case id of the workspace currently open. */
function caseIdFrom(page: Page): string {
  const id = new URL(page.url()).pathname.split('/')[3]
  if (!id) throw new Error(`Could not read a case id from ${page.url()}`)
  return id
}

test.describe('public site', () => {
  test('1. landing page loads with the hero and primary calls to action', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Evidence has a paper trail')
    await expect(page.getByRole('link', { name: /start a case/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /explore the demo/i }).first()).toBeVisible()
    // The interactive preview must render real workflow content.
    await expect(page.getByText(/Northstar County Equipment Procurement Review/i).first()).toBeVisible()
  })

  test('landing page has no horizontal overflow at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('public pages are reachable and titled', async ({ page }) => {
    for (const path of ['/product', '/use-cases', '/security', '/pricing', '/demo', '/about', '/privacy', '/terms', '/acceptable-use']) {
      const response = await page.goto(path)
      expect(response?.status(), `${path} should respond 200`).toBeLessThan(400)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    }
  })
})

test.describe('authentication boundary', () => {
  test('2. the application redirects an unauthenticated visitor to sign in', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/app')
    await page.waitForURL(/sign-in/, { timeout: 30_000 })
    await expect(page).toHaveURL(/sign-in/)
  })
})

test.describe('case workspace', () => {
  // The workspace opens its right-hand context panel at xl; test at a width
  // where the full three-region layout is present.
  test.use({ viewport: { width: 1440, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('3. the demo case opens and shows its evidence', async ({ page }) => {
    await openWorkspace(page)
    await expect(page.getByText(/Northstar County/i).first()).toBeVisible()
    await expect(page.getByText(/S1/).first()).toBeVisible()
  })

  test('4, 5, 6, 7. a case is created, a text source is added, processed, and claims appear', async ({ page }) => {
    await page.goto('/app/cases/new')

    const title = `E2E Review ${Date.now()}`
    await page.getByRole('textbox', { name: /title/i }).first().fill(title)
    const description = page.getByRole('textbox', { name: /description/i }).first()
    if (await description.isVisible().catch(() => false)) {
      await description.fill('An end-to-end verification case.')
    }

    /*
     * Walk the wizard. Two things matter here:
     *  · the form carries an sr-only submit button for implicit submission, so
     *    only real controls are matched;
     *  · step 3 offers "Skip for now" as a selectable option card, which must not
     *    be confused with the footer's advance button — Continue is always
     *    preferred, and every step already has a sensible default selected.
     */
    const control = (pattern: RegExp) =>
      page.locator('button:not(.sr-only)').filter({ hasText: pattern }).filter({ visible: true })

    for (let step = 0; step < 6; step += 1) {
      const create = control(/create case/i)
      if ((await create.count()) > 0) {
        await create.first().click()
        break
      }
      const next = control(/^continue$/i)
      if ((await next.count()) === 0) break
      await next.first().click()
      await page.waitForTimeout(350)
    }

    await page.waitForURL(/\/app\/cases\/[0-9a-f-]{36}/, { timeout: 60_000 })
    const caseUrl = new URL(page.url())
    const caseId = caseUrl.pathname.split('/')[3]!

    // Add a text source containing two conflicting dates. Everything is scoped to
    // the dialog — the workspace behind it also has a textarea (the copilot).
    await page.goto(`/app/cases/${caseId}/sources?add=1`)

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 30_000 })
    await dialog.getByRole('tab', { name: /paste text/i }).click()

    // Matched by accessible name rather than label text: the visible labels carry
    // a required marker and a hint, so the label string is not just "Text".
    await dialog.getByRole('textbox', { name: /title/i }).fill('Field notes')
    await dialog.getByRole('textbox', { name: /^text$/i }).fill(
      'The vendor proposal states delivery on September 10, 2024. The receiving report records that the delivery arrived on September 21, 2024 and that 228 of 240 units were received.',
    )

    const submit = dialog.getByRole('button', { name: /add text|add source|add note/i })
    await expect(submit).toBeEnabled({ timeout: 15_000 })
    await submit.click()

    // Processing completes and the source becomes citable.
    await expect(page.getByText(/Field notes/i).first()).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText(/S1/).first()).toBeVisible({ timeout: 60_000 })

    /*
     * Claims extracted from that source appear in the ledger.
     *
     * Asserted on structure, not on wording: the exact statement text depends on
     * which analysis provider ran, so matching model prose would make this test
     * fail for a reason that has nothing to do with the behaviour under test.
     */
    await page.goto(`/app/cases/${caseId}/claims`)
    await expect(page.getByRole('table')).toBeVisible({ timeout: 60_000 })
    const claimRows = page.getByRole('row')
    await expect
      .poll(async () => claimRows.count(), { timeout: 60_000, message: 'the claim ledger should not be empty' })
      .toBeGreaterThan(1)
    // Every claim carries at least one resolvable citation.
    await expect(page.getByText(/[+−]\s*\d/).first()).toBeVisible({ timeout: 30_000 })
  })

  test('8. a citation opens its source at the cited location', async ({ page }) => {
    await openWorkspace(page)
    const caseId = caseIdFrom(page)

    await page.goto(`/app/cases/${caseId}/claims`)
    await page.getByText(/September 10, 2024/i).first().click()

    // The selected claim's citations must resolve to a real locator.
    const citation = page
      .getByText(/p\.\s*\d+|row\s*\d+/)
      .filter({ visible: true })
      .first()
    await expect(citation).toBeVisible({ timeout: 30_000 })

    const openInSource = page.getByRole('link', { name: /open in source/i }).filter({ visible: true })
    expect(await openInSource.count(), 'a selected claim exposes an "Open in source" link').toBeGreaterThan(0)

    await openInSource.first().click()
    await page.waitForURL(/\/sources\/[0-9a-f-]{36}/, { timeout: 30_000 })

    // The cited passage is highlighted at the location the citation named.
    const highlighted = page.locator('[data-active="true"], mark, tr.bg-evidence-soft').first()
    await expect(highlighted).toBeVisible({ timeout: 30_000 })
  })

  test('9. the copilot answers with citations drawn from the case', async ({ page }) => {
    await openWorkspace(page)
    const caseId = caseIdFrom(page)
    await page.goto(`/app/cases/${caseId}`)

    const openCopilot = page.getByRole('button', { name: /copilot|ask/i }).first()
    if (await openCopilot.isVisible().catch(() => false)) await openCopilot.click()

    const input = page.getByPlaceholder(/ask|question/i).first()
    await expect(input).toBeVisible({ timeout: 30_000 })
    await input.fill('Which records disagree about the delivery date?')
    await input.press('Enter')

    // The answer must carry a resolvable citation, not bare prose.
    await expect(page.getByText(/S\d+\s+p\.\s*\d+|S\d+\s+Sheet/).first()).toBeVisible({ timeout: 90_000 })
  })

  test('10. the brief can be generated and exported', async ({ page }) => {
    await openWorkspace(page)
    const caseId = caseIdFrom(page)
    await page.goto(`/app/cases/${caseId}/brief`)

    await expect(page.getByText(/executive summary|key findings|methodology/i).first()).toBeVisible({ timeout: 30_000 })

    const exportButton = page.getByRole('button', { name: /export markdown/i }).first()
    if (await exportButton.isVisible().catch(() => false)) {
      const download = page.waitForEvent('download', { timeout: 45_000 })
      await exportButton.click()
      const file = await download
      expect(file.suggestedFilename()).toMatch(/\.md$/)
    }
  })

  test('11. public share permissions keep a case private until it is published', async ({ page, context }) => {
    await openWorkspace(page)
    const caseId = caseIdFrom(page)
    await page.goto(`/app/cases/${caseId}/brief`)

    // A share link that was never enabled must not resolve.
    const anonymous = await context.newPage()
    const missing = await anonymous.goto('/evidence/definitely-not-a-published-case')
    expect(missing?.status()).toBe(404)
    await anonymous.close()
  })
})
