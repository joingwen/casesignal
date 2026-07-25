import Link from 'next/link'

import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { DEMO_BANNER } from '@/lib/domain'
import { cn, formatRelative, pluralize, truncate } from '@/lib/utils'
import type { CaseListItem } from '@/server/queries/cases'

/** A quiet, non-blocking marker that ingestion is still running for a case. */
function ProcessingDot({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-secondary">
      <span className="relative flex size-1.5" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-pulse-soft rounded-full bg-evidence" />
      </span>
      {pluralize(count, 'record')} processing
    </span>
  )
}

function DiscrepancyCount({ count }: { count: number }) {
  if (count === 0) return <span className="text-ink-muted">—</span>
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-signal" />
      <span className="tabular text-ink">{count}</span>
    </span>
  )
}

export function CaseList({ cases }: { cases: CaseListItem[] }) {
  return (
    <>
      {/* ------------------------------------------------------ desktop */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-full pl-5 lg:pl-8">Case</TableHead>
              <TableHead numeric>Sources</TableHead>
              <TableHead numeric>Claims</TableHead>
              <TableHead numeric>Discrepancies</TableHead>
              <TableHead className="pr-5 lg:pr-8">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.map((item) => (
              <TableRow key={item.id} interactive className="group relative">
                <TableCell className="w-full max-w-0 py-3 pl-5 lg:pl-8">
                  <Link
                    href={`/app/cases/${item.id}`}
                    className="block rounded-[3px] after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 truncate text-[14px] font-medium text-ink">
                        {item.title}
                      </span>
                      {item.isDemo ? (
                        <Badge variant="signal" className="shrink-0 normal-case tracking-normal">
                          {DEMO_BANNER}
                        </Badge>
                      ) : null}
                      {item.status === 'archived' ? (
                        <Badge variant="outline" className="shrink-0">
                          Archived
                        </Badge>
                      ) : null}
                    </span>
                  </Link>
                  {item.description ? (
                    <p className="mt-0.5 truncate text-[12.5px] text-ink-secondary">
                      {truncate(item.description, 130)}
                    </p>
                  ) : null}
                  {item.counts.processing > 0 ? (
                    <p className="mt-1">
                      <ProcessingDot count={item.counts.processing} />
                    </p>
                  ) : null}
                </TableCell>
                <TableCell numeric className="text-ink-secondary">
                  {item.counts.sources}
                </TableCell>
                <TableCell numeric className="text-ink-secondary">
                  {item.counts.claims}
                </TableCell>
                <TableCell numeric>
                  <DiscrepancyCount count={item.counts.discrepancies} />
                </TableCell>
                <TableCell className="whitespace-nowrap pr-5 text-[12.5px] text-ink-secondary lg:pr-8">
                  {formatRelative(item.updatedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ------------------------------------------------------- mobile */}
      <ul className="md:hidden">
        {cases.map((item) => (
          <li key={item.id} className="border-b border-line last:border-b-0">
            <Link
              href={`/app/cases/${item.id}`}
              className={cn(
                'block px-5 py-4',
                'transition-colors duration-150 ease-editorial active:bg-surface',
                'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:-outline-offset-2',
              )}
            >
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1 text-[15px] font-medium leading-snug text-ink">
                  {item.title}
                </span>
                {item.status === 'archived' ? (
                  <Badge variant="outline" className="shrink-0">
                    Archived
                  </Badge>
                ) : null}
              </div>

              {item.isDemo ? (
                <Badge variant="signal" className="mt-1.5 normal-case tracking-normal">
                  {DEMO_BANNER}
                </Badge>
              ) : null}

              {item.description ? (
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
                  {truncate(item.description, 120)}
                </p>
              ) : null}

              <dl className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-secondary">
                <div className="flex gap-1">
                  <dt className="text-ink-muted">Sources</dt>
                  <dd className="tabular">{item.counts.sources}</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="text-ink-muted">Claims</dt>
                  <dd className="tabular">{item.counts.claims}</dd>
                </div>
                <div className="flex items-center gap-1">
                  <dt className="text-ink-muted">Discrepancies</dt>
                  <dd className="flex items-center gap-1 tabular">
                    {item.counts.discrepancies > 0 ? (
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-signal" />
                    ) : null}
                    {item.counts.discrepancies}
                  </dd>
                </div>
              </dl>

              <p className="mt-2 text-[11.5px] text-ink-muted">
                Updated {formatRelative(item.updatedAt)}
              </p>

              {item.counts.processing > 0 ? (
                <p className="mt-1.5">
                  <ProcessingDot count={item.counts.processing} />
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
