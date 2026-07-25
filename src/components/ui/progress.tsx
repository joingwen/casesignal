'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'

import { cn } from '@/lib/utils'

export interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  /** 0–100. `null` renders an indeterminate track. */
  value?: number | null
  /** Tint the indicator with the signal accent instead of evidence blue. */
  tone?: 'evidence' | 'signal' | 'ink'
}

const TONE_CLASSES: Record<NonNullable<ProgressProps['tone']>, string> = {
  evidence: 'bg-evidence',
  signal: 'bg-signal',
  ink: 'bg-ink',
}

function Progress({ className, value = null, tone = 'evidence', max = 100, ...props }: ProgressProps) {
  const clamped = value === null ? null : Math.min(max, Math.max(0, value))

  return (
    <ProgressPrimitive.Root
      value={clamped}
      max={max}
      className={cn('relative h-1 w-full overflow-hidden rounded-full bg-surface', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full rounded-full transition-[width] duration-500 ease-editorial',
          TONE_CLASSES[tone],
          clamped === null && 'w-1/3 animate-pulse-soft',
        )}
        style={clamped === null ? undefined : { width: `${(clamped / max) * 100}%` }}
      />
    </ProgressPrimitive.Root>
  )
}
Progress.displayName = 'Progress'

export { Progress }
