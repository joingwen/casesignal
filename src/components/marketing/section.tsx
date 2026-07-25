import { cn } from '@/lib/utils'

/**
 * Editorial section primitives.
 *
 * Sections are full-bleed bands separated by hairlines and surface changes
 * rather than cards. Everything sits on one of two surfaces — white canvas or
 * warm page — so the page reads as a publication rather than a stack of boxes.
 */

export function Section({
  children,
  className,
  tone = 'canvas',
  bordered = true,
  id,
}: {
  children: React.ReactNode
  className?: string
  tone?: 'canvas' | 'page' | 'surface'
  bordered?: boolean
  id?: string
}) {
  return (
    <section
      id={id}
      className={cn(
        'w-full',
        tone === 'canvas' && 'bg-canvas',
        tone === 'page' && 'bg-page',
        tone === 'surface' && 'bg-surface',
        bordered && 'border-t border-line',
        className,
      )}
    >
      <div className="mx-auto max-w-[1280px] px-5 py-16 sm:py-20 lg:px-10 lg:py-[104px]">{children}</div>
    </section>
  )
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-[11.5px] font-medium uppercase tracking-[0.16em] text-ink-muted', className)}>{children}</p>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
  as: Tag = 'h2',
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  align?: 'left' | 'center' | 'split'
  className?: string
  as?: 'h1' | 'h2' | 'h3'
}) {
  if (align === 'split') {
    return (
      <div className={cn('grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-end lg:gap-16', className)}>
        <div>
          {eyebrow && <Eyebrow className="mb-4">{eyebrow}</Eyebrow>}
          <Tag className="text-section-sm text-balance font-semibold text-ink lg:text-section">{title}</Tag>
        </div>
        {description && <p className="text-lede text-pretty text-ink-secondary lg:pb-1.5">{description}</p>}
      </div>
    )
  }

  return (
    <div className={cn(align === 'center' && 'mx-auto max-w-[720px] text-center', className)}>
      {eyebrow && <Eyebrow className="mb-4">{eyebrow}</Eyebrow>}
      <Tag className="text-section-sm text-balance font-semibold text-ink lg:text-section">{title}</Tag>
      {description && (
        <p className={cn('text-lede text-pretty mt-5 text-ink-secondary', align === 'left' && 'max-w-[560px]')}>
          {description}
        </p>
      )}
    </div>
  )
}

/** Thin labelled rule used between editorial blocks. */
export function AnnotatedRule({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <span className="h-px flex-1 bg-line" />
      {label && (
        <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">{label}</span>
      )}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}
