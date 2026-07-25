import { cn } from '@/lib/utils'

/**
 * The X mark.
 *
 * Drawn locally because lucide dropped its Twitter glyph and the current mark is
 * not part of the icon set. Sized on a 24-unit grid to sit alongside lucide
 * icons without optical adjustment.
 */
export function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={cn('h-4 w-4', className)}>
      <path d="M13.83 10.47 20.6 2.6h-1.6l-5.88 6.83L8.42 2.6H3l7.1 10.33L3 21.2h1.6l6.2-7.21 4.96 7.21H21l-7.17-10.73Zm-2.2 2.55-.72-1.03L5.18 3.8h2.46l4.61 6.6.72 1.03 6 8.58h-2.46l-4.88-6.99Z" />
    </svg>
  )
}
