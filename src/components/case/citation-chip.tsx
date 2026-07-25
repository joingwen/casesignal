import * as React from 'react'
import Link from 'next/link'

import { formatCitation } from '@/lib/citations'
import { cn } from '@/lib/utils'

export interface CitationChipProps {
  caseId: string
  sourceId: string
  chunkId?: string | null
  sourceLabel: string
  locator?: string
  /** Full source title, used for the accessible name and tooltip. */
  sourceTitle?: string
  tone?: 'evidence' | 'conflict'
  className?: string
}

/**
 * A citation is always a link to the exact excerpt it names. The visible text
 * is the canonical `[S2 p. 4]` marker, so what an analyst reads on screen is
 * what they would write in a footnote.
 */
export function CitationChip({
  caseId,
  sourceId,
  chunkId,
  sourceLabel,
  locator = '',
  sourceTitle,
  tone = 'evidence',
  className,
}: CitationChipProps) {
  const marker = formatCitation(sourceLabel, locator)
  const href = chunkId
    ? `/app/cases/${caseId}/sources/${sourceId}?chunk=${encodeURIComponent(chunkId)}`
    : `/app/cases/${caseId}/sources/${sourceId}`

  return (
    <Link
      href={href}
      title={sourceTitle ? `${sourceTitle} — ${locator || 'whole record'}` : undefined}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-control border px-1.5 py-px',
        'font-mono text-[11px] leading-[1.5] transition-colors duration-200 ease-editorial',
        'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
        tone === 'conflict'
          ? 'border-status-contradicted/25 bg-status-contradicted-soft text-status-contradicted hover:border-status-contradicted/50'
          : 'border-evidence-border bg-evidence-soft text-evidence-deep hover:border-evidence hover:bg-evidence-soft',
        className,
      )}
    >
      <span className="truncate">{marker}</span>
    </Link>
  )
}
