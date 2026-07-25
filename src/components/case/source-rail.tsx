'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeftClose, PanelLeftOpen, Plus, Search } from 'lucide-react'

import { Button, EmptyState, Input, ProcessingStatusChip } from '@/components/ui'
import type { SourceListItem } from '@/server/queries/case-detail'
import { cn, pluralize } from '@/lib/utils'
import { SourceFormatIcon } from './source-icon'
import { useWorkspace } from './workspace-context'

type RailFilter = 'all' | 'complete' | 'processing' | 'needs_review'

const FILTERS: { id: RailFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'complete', label: 'Complete' },
  { id: 'processing', label: 'Processing' },
  { id: 'needs_review', label: 'Needs review' },
]

function matchesFilter(source: SourceListItem, filter: RailFilter): boolean {
  switch (filter) {
    case 'complete':
      return source.status === 'complete'
    case 'processing':
      return !['complete', 'needs_review', 'failed'].includes(source.status)
    case 'needs_review':
      return source.status === 'needs_review' || source.status === 'failed'
    default:
      return true
  }
}

export interface SourceRailProps {
  caseId: string
  sources: SourceListItem[]
  /** Collapse control is only meaningful in the docked rail, not in the drawer. */
  collapsible?: boolean
  onNavigate?: () => void
}

export function SourceRail({ caseId, sources, collapsible = true, onNavigate }: SourceRailProps) {
  const pathname = usePathname()
  const { canWrite, setAddSourceOpen, railCollapsed, setRailCollapsed } = useWorkspace()
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState<RailFilter>('all')

  const counts = React.useMemo(
    () => ({
      all: sources.length,
      complete: sources.filter((s) => matchesFilter(s, 'complete')).length,
      processing: sources.filter((s) => matchesFilter(s, 'processing')).length,
      needs_review: sources.filter((s) => matchesFilter(s, 'needs_review')).length,
    }),
    [sources],
  )

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return sources.filter(
      (source) =>
        matchesFilter(source, filter) &&
        (q === '' ||
          source.title.toLowerCase().includes(q) ||
          source.label.toLowerCase().includes(q) ||
          source.summary.toLowerCase().includes(q)),
    )
  }, [sources, filter, query])

  if (collapsible && railCollapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-2 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setRailCollapsed(false)}
          aria-label="Expand source rail"
          title="Expand source rail"
        >
          <PanelLeftOpen />
        </Button>
        <div className="mt-1 flex flex-col items-center gap-1 overflow-y-auto scrollbar-slim">
          {sources.map((source) => {
            const active = pathname === `/app/cases/${caseId}/sources/${source.id}`
            return (
              <Link
                key={source.id}
                href={`/app/cases/${caseId}/sources/${source.id}`}
                title={`${source.label} · ${source.title}`}
                className={cn(
                  'flex size-8 items-center justify-center rounded-control font-mono text-[11px]',
                  active ? 'bg-evidence-soft text-evidence-deep' : 'text-ink-secondary hover:bg-surface',
                )}
              >
                {source.label}
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-2.5 px-3 pb-2.5 pt-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search records"
            aria-label="Search records in this case"
            className="h-8 pl-8 text-[13px]"
          />
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-start"
          onClick={() => setAddSourceOpen(true)}
          disabled={!canWrite}
          title={canWrite ? 'Add a record to this case' : 'You have read-only access to this case.'}
        >
          <Plus />
          Add source
        </Button>

        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter records by status">
          {FILTERS.map((item) => {
            const active = filter === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={active}
                className={cn(
                  'rounded-full border px-2 py-px text-[11px] transition-colors duration-200 ease-editorial',
                  active
                    ? 'border-evidence-border bg-evidence-soft text-evidence-deep'
                    : 'border-line bg-canvas text-ink-secondary hover:bg-surface',
                )}
              >
                {item.label}
                <span className="ml-1 tabular text-ink-muted">{counts[item.id]}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-slim border-t border-line">
        {visible.length === 0 ? (
          <EmptyState
            className="px-4 py-10"
            title={sources.length === 0 ? 'No records yet' : 'Nothing matches'}
            description={
              sources.length === 0
                ? 'Add a document, spreadsheet, webpage or note to begin.'
                : 'Try a different search term or filter.'
            }
          />
        ) : (
          <ul className="py-1">
            {visible.map((source) => {
              const active = pathname === `/app/cases/${caseId}/sources/${source.id}`
              return (
                <li key={source.id}>
                  <Link
                    href={`/app/cases/${caseId}/sources/${source.id}`}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex flex-col gap-1 px-3 py-2 transition-colors duration-200 ease-editorial',
                      active ? 'bg-evidence-soft' : 'hover:bg-surface',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <SourceFormatIcon format={source.format} />
                      <span className="font-mono text-[11px] text-ink-muted">{source.label}</span>
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate text-[13px] leading-snug',
                          active ? 'text-evidence-deep' : 'text-ink',
                        )}
                      >
                        {source.title}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 pl-[22px]">
                      {source.status === 'complete' ? null : (
                        <ProcessingStatusChip status={source.status} size="sm" />
                      )}
                      <span className="text-[11px] text-ink-muted">
                        {pluralize(source.evidenceCount, 'citation')}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {collapsible ? (
        <div className="shrink-0 border-t border-line px-2 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-ink-secondary"
            onClick={() => setRailCollapsed(true)}
          >
            <PanelLeftClose />
            Collapse
          </Button>
        </div>
      ) : null}
    </div>
  )
}
