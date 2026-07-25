import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  /** Small uppercase kicker above the title. */
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** Right-aligned controls. Keep to one committing action. */
  actions?: ReactNode
  className?: string
}

/**
 * The standing header for every app screen: one title, one line of orientation,
 * the page's actions, and a hairline that starts the content beneath it.
 */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('border-b border-line px-5 pb-5 pt-6 lg:px-8 lg:pb-6 lg:pt-8', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-[28px] font-medium leading-tight tracking-tight text-ink lg:text-[32px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-ink-secondary">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}
