import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, FileSearch } from 'lucide-react'

import { Badge, ProcessingStatusChip } from '@/components/ui'
import { DISCREPANCY_TYPE_LABELS, NEUTRALITY_DISCLAIMER } from '@/lib/domain'
import { formatDate, formatRelative } from '@/lib/utils'
import { requireCaseAccess } from '@/server/auth/guard'
import {
  getCaseOverview,
  getConversation,
  getDiscrepancies,
  getSources,
} from '@/server/queries/case-detail'
import { AddSourceButton } from '@/components/case/add-source-button'
import { EvidenceExcerpt } from '@/components/case/evidence-excerpt'
import { NextSteps } from '@/components/case/next-steps'
import { SourceFormatIcon } from '@/components/case/source-icon'

export default async function CaseOverviewPage({
  params,
}: {
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = await params
  const { session, caseRecord, canWrite } = await requireCaseAccess(caseId)

  const [overview, sources, discrepancies, conversation] = await Promise.all([
    getCaseOverview(caseId, caseRecord),
    getSources(caseId),
    getDiscrepancies(caseId),
    getConversation(caseId, session.profile.id),
  ])

  const counts = overview.counts
  const openDiscrepancies = discrepancies
    .filter((item) => item.reviewState === 'unreviewed' || item.reviewState === 'needs_follow_up')
    .slice(0, 3)
  const recentSources = [...sources]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  /* -------------------------------------------------------- empty state */
  if (counts.sources === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <section className="panel overflow-hidden">
          <div className="border-b border-line px-6 py-5">
            <div className="flex items-center gap-2 text-ink-muted">
              <FileSearch className="size-4" aria-hidden="true" />
              <span className="text-[11px] uppercase tracking-wide">Empty case</span>
            </div>
            <h1 className="mt-2 text-title text-ink">Start with a record</h1>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-secondary">
              {caseRecord.objective ||
                'This case has no objective yet. Add the first record and describe what you are trying to establish.'}
            </p>
          </div>

          <ol className="divide-y divide-line">
            {[
              {
                title: 'Add records',
                body: 'Upload documents and spreadsheets, capture a webpage, paste a transcript or write a note. Each one is extracted, split into traceable excerpts and given a citation label such as S1.',
              },
              {
                title: 'Build the case map',
                body: 'Once two or more records are indexed, CaseSignal compares them: entities, dated events, claims and the points where the records disagree.',
              },
              {
                title: 'Interrogate and publish',
                body: 'Ask questions that are answered only from cited excerpts, review each claim, then assemble a brief or a read-only evidence room.',
              },
            ].map((step, index) => (
              <li key={step.title} className="flex gap-4 px-6 py-4">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-line bg-page font-mono text-[11px] text-ink-secondary"
                >
                  {index + 1}
                </span>
                <div>
                  <p className="text-[13px] font-medium text-ink">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center gap-3 border-t border-line bg-page px-6 py-4">
            <AddSourceButton variant="primary" size="md">
              Add your first record
            </AddSourceButton>
            <span className="text-xs text-ink-muted">
              PDF, DOCX, CSV, XLSX, images, webpages, pasted text or a note.
            </span>
          </div>
        </section>

        <p className="mt-6 text-xs leading-relaxed text-ink-muted">{NEUTRALITY_DISCLAIMER}</p>
      </div>
    )
  }

  /* ------------------------------------------------------------ populated */
  const countItems: { label: string; value: number; href?: string; tone?: 'signal' }[] = [
    { label: 'Sources', value: counts.sources, href: `/app/cases/${caseId}/sources` },
    { label: 'Claims', value: counts.claims, href: `/app/cases/${caseId}/claims` },
    { label: 'Supported', value: counts.supported },
    { label: 'Contradicted', value: counts.contradicted },
    { label: 'Unresolved', value: counts.unresolved, tone: counts.unresolved > 0 ? 'signal' : undefined },
    { label: 'Events', value: counts.events, href: `/app/cases/${caseId}/timeline` },
    {
      label: 'Discrepancies',
      value: counts.discrepancies,
      href: `/app/cases/${caseId}/timeline`,
      tone: counts.openDiscrepancies > 0 ? 'signal' : undefined,
    },
    { label: 'Entities', value: counts.entities, href: `/app/cases/${caseId}/graph` },
  ]

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* ------------------------------------------------------- objective */}
      <section className="panel px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-[15px] font-medium text-ink">Case objective</h1>
          <span className="text-xs text-ink-muted">
            Updated {formatRelative(overview.updatedAt)}
          </span>
        </div>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink">
          {overview.objective || 'No objective recorded for this case yet.'}
        </p>
        {overview.description ? (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-secondary">
            {overview.description}
          </p>
        ) : null}
      </section>

      {/* ---------------------------------------------------- counts strip */}
      <section aria-label="Case contents" className="panel overflow-hidden">
        <dl className="grid grid-cols-2 sm:grid-cols-4">
          {countItems.map((item) => {
            const body = (
              <>
                <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{item.label}</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-xl font-medium tabular text-ink">
                  {item.value}
                  {item.tone === 'signal' ? (
                    <span
                      className="inline-block size-1.5 rounded-full bg-signal"
                      title="Includes items still open"
                      aria-label="Includes items still open"
                    />
                  ) : null}
                </dd>
              </>
            )
            return (
              <div
                key={item.label}
                className="border-b border-r border-line px-4 py-3 [&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n)]:border-r sm:[&:nth-child(4n)]:border-r-0"
              >
                {item.href ? (
                  <Link href={item.href} className="block rounded-control hover:text-evidence-deep">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </div>
            )
          })}
        </dl>
      </section>

      {/* --------------------------------------------- what the records show */}
      <section className="panel px-5 py-4">
        <h2 className="text-[15px] font-medium text-ink">What the records show</h2>
        {overview.summary ? (
          <div className="mt-2 max-w-prose space-y-3">
            {overview.summary
              .split(/\n{2,}/)
              .filter(Boolean)
              .map((paragraph, index) => (
                <p key={index} className="text-sm leading-relaxed text-ink">
                  {paragraph}
                </p>
              ))}
          </div>
        ) : (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-secondary">
            No case summary yet. Build the case map to generate one from the records that are
            already indexed — it is written only from what the sources state.
          </p>
        )}
        {overview.lastAnalyzedAt ? (
          <p className="mt-3 text-xs text-ink-muted">
            Case map last built {formatDate(overview.lastAnalyzedAt)}.
          </p>
        ) : null}
      </section>

      {/* ------------------------------------------------- open differences */}
      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3">
          <h2 className="text-[15px] font-medium text-ink">Where the records differ</h2>
          <Link
            href={`/app/cases/${caseId}/timeline`}
            className="inline-flex items-center gap-1 text-xs text-ink-secondary hover:text-evidence-deep"
          >
            All {counts.discrepancies} discrepancies
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>

        {openDiscrepancies.length === 0 ? (
          <p className="px-5 py-6 text-sm leading-relaxed text-ink-secondary">
            {counts.discrepancies === 0
              ? 'No differences between records have been recorded yet.'
              : 'Every recorded difference has been reviewed.'}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {openDiscrepancies.map((discrepancy) => {
              const sideA = discrepancy.sides.find((side) => side.side === 'a')
              const sideB = discrepancy.sides.find((side) => side.side === 'b')
              return (
                <li key={discrepancy.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{DISCREPANCY_TYPE_LABELS[discrepancy.type]}</Badge>
                    <span className="text-[11px] uppercase tracking-wide text-ink-muted">
                      {discrepancy.materiality} materiality
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-medium text-ink">{discrepancy.title}</h3>
                  {discrepancy.description ? (
                    <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-ink-secondary">
                      {discrepancy.description}
                    </p>
                  ) : null}

                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {[sideA, sideB].map((side, index) =>
                      side ? (
                        <EvidenceExcerpt
                          key={`${discrepancy.id}-${side.side}`}
                          caseId={caseId}
                          sourceId={side.sourceId}
                          chunkId={side.chunkId}
                          sourceLabel={side.sourceLabel}
                          sourceTitle={side.sourceTitle}
                          locator={side.locator}
                          excerpt={side.excerpt}
                          statedValue={side.statedValue}
                          tone="conflict"
                        />
                      ) : (
                        <p key={`${discrepancy.id}-missing-${index}`} className="text-xs text-ink-muted">
                          No excerpt recorded for this side.
                        </p>
                      ),
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* --------------------------------------------------- recent sources */}
        <section className="panel overflow-hidden">
          <div className="flex items-baseline justify-between gap-2 border-b border-line px-5 py-3">
            <h2 className="text-[15px] font-medium text-ink">Recent records</h2>
            <Link
              href={`/app/cases/${caseId}/sources`}
              className="text-xs text-ink-secondary hover:text-evidence-deep"
            >
              Source library
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {recentSources.map((source) => (
              <li key={source.id}>
                <Link
                  href={`/app/cases/${caseId}/sources/${source.id}`}
                  className="flex items-center gap-2.5 px-5 py-2.5 hover:bg-surface"
                >
                  <SourceFormatIcon format={source.format} />
                  <span className="font-mono text-[11px] text-ink-muted">{source.label}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{source.title}</span>
                  {source.status === 'complete' ? (
                    <span className="shrink-0 text-[11px] text-ink-muted">
                      {formatDate(source.createdAt)}
                    </span>
                  ) : (
                    <ProcessingStatusChip status={source.status} size="sm" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------ next steps */}
        <section className="panel overflow-hidden">
          <div className="border-b border-line px-5 py-3">
            <h2 className="text-[15px] font-medium text-ink">Next step</h2>
          </div>
          <NextSteps
            caseId={caseId}
            sourceCount={counts.sources}
            processingCount={counts.processing}
            mapBuilt={Boolean(overview.lastAnalyzedAt)}
            askedQuestion={conversation.messages.some((message) => message.role === 'user')}
            canWrite={canWrite}
          />
        </section>
      </div>

      <p className="text-xs leading-relaxed text-ink-muted">{NEUTRALITY_DISCLAIMER}</p>
    </div>
  )
}
