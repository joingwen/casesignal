import type { Metadata } from 'next'
import Link from 'next/link'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { ExternalLink, Share2 } from 'lucide-react'

import { Badge, Button, EmptyState } from '@/components/ui'
import { requireSession } from '@/server/auth/session'
import { listCases } from '@/server/queries/cases'
import { getDb } from '@/server/db'
import { publicShares } from '@/server/db/schema'
import { formatRelative, pluralize } from '@/lib/utils'
import { DEMO_BANNER } from '@/lib/domain'
import { PageHeader } from '@/components/app/page-header'

export const metadata: Metadata = {
  title: 'Shared',
  description: 'Cases with a public evidence room.',
}

export default async function SharedPage() {
  const session = await requireSession()
  const cases = (await listCases(session, { status: 'all' })).filter((item) => item.shared)

  // The evidence-room address lives on the share row, not on the case.
  const shares =
    cases.length > 0
      ? await (await getDb())
          .select({ caseId: publicShares.caseId, slug: publicShares.slug, viewCount: publicShares.viewCount })
          .from(publicShares)
          .where(
            and(
              inArray(
                publicShares.caseId,
                cases.map((item) => item.id),
              ),
              eq(publicShares.enabled, true),
              isNull(publicShares.revokedAt),
            ),
          )
      : []

  const slugByCase = new Map(shares.map((row) => [row.caseId, row]))

  return (
    <>
      <PageHeader
        eyebrow="Evidence rooms"
        title="Shared"
        description="Cases you have published as a read-only evidence room. Everything else in your workspace stays private."
      />

      {cases.length === 0 ? (
        <EmptyState
          icon={<Share2 />}
          title="Nothing is shared."
          description="No case in this workspace is public. A case becomes readable outside CaseSignal only when you explicitly enable an evidence room from inside that case — there is no default sharing, and no link exists until you create one."
          action={
            <Button asChild variant="secondary">
              <Link href="/app">Go to your cases</Link>
            </Button>
          }
        />
      ) : (
        <ul className="bg-canvas">
          {cases.map((item) => {
            const share = slugByCase.get(item.id)
            return (
              <li key={item.id} className="border-b border-line px-5 py-4 last:border-b-0 lg:px-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/app/cases/${item.id}`}
                        className="rounded-[3px] text-[15px] font-medium text-ink transition-colors duration-200 ease-editorial hover:text-evidence focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2"
                      >
                        {item.title}
                      </Link>
                      {item.isDemo ? (
                        <Badge variant="signal" className="normal-case tracking-normal">
                          {DEMO_BANNER}
                        </Badge>
                      ) : null}
                    </div>

                    {share ? (
                      <p className="mt-1 break-all font-mono text-[12px] text-ink-secondary">
                        /evidence/{share.slug}
                      </p>
                    ) : null}

                    <p className="mt-1.5 text-[12.5px] text-ink-muted">
                      {pluralize(item.counts.sources, 'source')} ·{' '}
                      {pluralize(item.counts.claims, 'claim')} · updated{' '}
                      {formatRelative(item.updatedAt)}
                      {share ? ` · ${pluralize(share.viewCount, 'view')}` : ''}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {share ? (
                      <Button asChild variant="secondary" size="sm">
                        <a href={`/evidence/${share.slug}`} target="_blank" rel="noreferrer">
                          Open evidence room
                          <ExternalLink aria-hidden="true" />
                        </a>
                      </Button>
                    ) : null}
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/app/cases/${item.id}`}>Open case</Link>
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
