import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FolderPlus, Layers } from 'lucide-react'

import { Button, EmptyState } from '@/components/ui'
import { requireSession } from '@/server/auth/session'
import { findDemoCase, listCases, type CaseListFilters } from '@/server/queries/cases'
import { getUsageSnapshot } from '@/server/billing/limits'
import { pluralize } from '@/lib/utils'
import { PageHeader } from '@/components/app/page-header'
import { CaseFilters } from '@/components/app/case-filters'
import { CaseList } from '@/components/app/case-list'
import { UsageStrip } from '@/components/app/usage-meter'
import { DemoCaseButton } from '@/components/app/demo-case-button'

export const metadata: Metadata = {
  title: 'Cases',
  description: 'Every case file in your workspace.',
}

const STATUSES = ['active', 'archived', 'all'] as const
const SORTS = ['recent', 'created', 'title'] as const

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function greeting(name: string) {
  const hour = new Date().getUTCHours()
  const part = hour < 11 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = name.split(/\s+/)[0] || name
  return `${part}, ${firstName}.`
}

export default async function CasesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession()
  if (!session.profile.onboardedAt) redirect('/app/onboarding')

  const params = await searchParams
  const query = first(params.q)?.trim() ?? ''
  const statusParam = first(params.status)
  const sortParam = first(params.sort)
  const status: NonNullable<CaseListFilters['status']> = (STATUSES as readonly string[]).includes(
    statusParam ?? '',
  )
    ? (statusParam as NonNullable<CaseListFilters['status']>)
    : 'active'
  const sort: NonNullable<CaseListFilters['sort']> = (SORTS as readonly string[]).includes(
    sortParam ?? '',
  )
    ? (sortParam as NonNullable<CaseListFilters['sort']>)
    : 'recent'

  const [cases, usage, demoCaseId] = await Promise.all([
    listCases(session, { query, status, sort }),
    getUsageSnapshot(session.organization.id),
    findDemoCase(session),
  ])

  const processing = cases.filter((item) => item.counts.processing > 0)
  const processingRecords = processing.reduce((total, item) => total + item.counts.processing, 0)
  const isFiltered = Boolean(query) || status !== 'active'

  return (
    <>
      <PageHeader
        title="Cases"
        description={`${greeting(session.profile.displayName)} ${
          cases.length > 0
            ? `${pluralize(cases.length, 'case')} in ${session.organization.name}.`
            : `Nothing open in ${session.organization.name} yet.`
        }`}
        actions={
          <Button asChild variant="primary">
            <Link href="/app/cases/new">
              <FolderPlus aria-hidden="true" />
              New case
            </Link>
          </Button>
        }
      />

      <UsageStrip usage={usage} />

      <CaseFilters query={query} status={status} sort={sort} />

      {processing.length > 0 ? (
        <p
          aria-live="polite"
          className="flex items-center gap-2 border-b border-line bg-evidence-soft px-5 py-2 text-[12.5px] text-evidence-deep lg:px-8"
        >
          <span className="relative flex size-1.5" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-pulse-soft rounded-full bg-evidence" />
          </span>
          {pluralize(processingRecords, 'record')} still processing in{' '}
          {processing.map((item) => item.title).join(', ')}. Extracted text and citations appear as
          each record finishes.
        </p>
      ) : null}

      {cases.length > 0 ? (
        <CaseList cases={cases} />
      ) : isFiltered ? (
        <EmptyState
          icon={<Layers />}
          title="No cases match these filters."
          description="Try a different search term, or set the status filter back to All."
          action={
            <Button asChild variant="secondary">
              <Link href="/app">Clear filters</Link>
            </Button>
          }
        />
      ) : (
        <div className="px-5 py-10 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-[22px] font-medium leading-tight tracking-tight text-ink">
              Start your first case file.
            </h2>
            <p className="mx-auto mt-3 max-w-[52ch] text-sm leading-relaxed text-ink-secondary">
              A case is one investigation: the records you have collected, plus everything CaseSignal
              indexes from them — claims, dates, entities and the points where the records disagree —
              each one linked back to the excerpt it came from.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
              <Button asChild variant="primary" size="lg">
                <Link href="/app/cases/new">Start a case</Link>
              </Button>
              <DemoCaseButton size="lg" existingCaseId={demoCaseId} />
            </div>
            <p className="mt-4 text-xs text-ink-muted">
              The demo case uses fictional records so nothing real is involved.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
