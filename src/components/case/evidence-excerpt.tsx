import * as React from 'react'

import { cn } from '@/lib/utils'
import { CitationChip } from './citation-chip'

export interface EvidenceExcerptProps {
  caseId: string
  sourceId: string
  chunkId?: string | null
  sourceLabel: string
  sourceTitle?: string
  locator?: string
  excerpt: string
  /** Optional heading above the quote, e.g. a stated value in a discrepancy. */
  statedValue?: string
  tone?: 'evidence' | 'conflict'
  /** Trailing controls, e.g. a remove button. */
  actions?: React.ReactNode
  className?: string
}

/**
 * The quoted record, verbatim.
 *
 * The excerpt is always the stored chunk text — never a paraphrase — and it is
 * always shown next to the citation that locates it, so a reader can check it
 * against the underlying record in one click.
 */
export function EvidenceExcerpt({
  caseId,
  sourceId,
  chunkId,
  sourceLabel,
  sourceTitle,
  locator = '',
  excerpt,
  statedValue,
  tone = 'evidence',
  actions,
  className,
}: EvidenceExcerptProps) {
  return (
    <figure className={cn('min-w-0', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <CitationChip
          caseId={caseId}
          sourceId={sourceId}
          chunkId={chunkId}
          sourceLabel={sourceLabel}
          sourceTitle={sourceTitle}
          locator={locator}
          tone={tone}
        />
        {sourceTitle ? (
          <span className="min-w-0 flex-1 truncate text-xs text-ink-secondary">{sourceTitle}</span>
        ) : null}
        {actions}
      </div>

      {statedValue ? (
        <p className="mt-2 text-sm font-medium text-ink tabular">{statedValue}</p>
      ) : null}

      <blockquote
        className={cn(
          'mt-2 border-l-2 pl-3 text-[13px] leading-relaxed text-ink-secondary',
          tone === 'conflict' ? 'border-status-contradicted/40' : 'border-evidence-border',
        )}
      >
        <span className="excerpt-mark" data-tone={tone === 'conflict' ? 'conflict' : undefined}>
          {excerpt}
        </span>
      </blockquote>
    </figure>
  )
}
