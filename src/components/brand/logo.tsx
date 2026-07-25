import { cn } from '@/lib/utils'

/**
 * The CaseSignal mark.
 *
 * A record sheet with a folded corner, a citation node anchored to its edge and
 * a signal pulse reading across it: a document, the connection to it, and the
 * reading taken from it. Drawn on a 24-unit grid with 1.6-unit strokes so it
 * stays legible at 16px.
 */
export function Logomark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn('h-6 w-6', className)}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/* Record sheet with a folded corner */}
      <path
        d="M5 2.9h8.1L19 8.6v12.5H5V2.9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M13 3.2v5.4h5.6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      {/* Signal pulse read across the record */}
      <path
        d="M7.6 15.1h2.1l1.5-3.4 1.9 6 1.5-2.6h1.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Citation node anchored to the edge */}
      <circle cx="19" cy="17.6" r="2.6" fill="var(--logo-node, #3F76C5)" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('text-[15px] font-semibold tracking-[-0.02em] text-ink', className)}>
      CaseSignal
    </span>
  )
}

export function Logo({
  className,
  markClassName,
  wordmarkClassName,
}: {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Logomark className={cn('h-[22px] w-[22px] text-ink', markClassName)} title="CaseSignal" />
      <Wordmark className={wordmarkClassName} />
    </span>
  )
}

/** Loading mark — the pulse animates while work is in flight. */
export function LoadingMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-ink', className)}>
      <Logomark className="h-5 w-5 motion-safe:animate-pulse-soft" title="Loading" />
      <span className="text-[13px] text-ink-secondary">Reading the record…</span>
    </span>
  )
}
