import { cn } from '@/lib/utils'

/**
 * The CaseSignal mark: a stack of records with one excerpt ruled through it —
 * the product in one glyph. Inherits `currentColor` so it works on any surface.
 */
export function CaseSignalMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={cn('size-5 shrink-0', className)}
    >
      <rect x="3.25" y="2.25" width="13.5" height="15.5" rx="1.75" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 6.75h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6.5 13.25h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6.5 10h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.35" />
    </svg>
  )
}
