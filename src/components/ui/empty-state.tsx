import * as React from 'react'

import { cn } from '@/lib/utils'

export interface EmptyStateProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** A lucide icon element, e.g. `<FileSearch />`. Sized and tinted here. */
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  /** Usually a single `Button`. Keep it to one committing action. */
  action?: React.ReactNode
  /** Quiet supporting line under the action, e.g. a keyboard hint. */
  footnote?: React.ReactNode
}

/**
 * An intentional resting state, not an error. Nothing red, nothing alarming —
 * just a quiet frame, one sentence of orientation and at most one action.
 */
function EmptyState({
  icon,
  title,
  description,
  action,
  footnote,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-14 text-center sm:py-16',
        className,
      )}
      {...props}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className="mb-4 flex size-10 items-center justify-center rounded-full border border-line bg-page text-ink-muted [&_svg]:size-[18px]"
        >
          {icon}
        </div>
      ) : null}

      <p className="text-[15px] font-medium leading-snug text-ink text-balance">{title}</p>

      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-secondary text-pretty">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}

      {footnote ? <p className="mt-3 text-xs text-ink-muted">{footnote}</p> : null}
    </div>
  )
}
EmptyState.displayName = 'EmptyState'

export { EmptyState }
