import * as React from 'react'

import { cn } from '@/lib/utils'

export type SkeletonProps = React.ComponentProps<'div'>

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-[6px] bg-surface', className)}
      {...props}
    />
  )
}
Skeleton.displayName = 'Skeleton'

export interface SkeletonTextProps extends React.ComponentProps<'div'> {
  /** Number of placeholder lines. The last line is intentionally short. */
  lines?: number
  /** Line height class, e.g. `h-3` for captions. */
  lineClassName?: string
}

function SkeletonText({ lines = 3, className, lineClassName, ...props }: SkeletonTextProps) {
  const count = Math.max(1, lines)
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    >
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3.5', index === count - 1 && count > 1 ? 'w-[62%]' : 'w-full', lineClassName)}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  )
}
SkeletonText.displayName = 'SkeletonText'

export { Skeleton, SkeletonText }
