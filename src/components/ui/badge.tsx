import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide leading-[1.4] whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'border-line bg-surface text-ink-secondary',
        evidence: 'border-evidence-border bg-evidence-soft text-evidence-deep',
        signal: 'border-signal-border bg-signal-soft text-signal',
        outline: 'border-line-strong bg-transparent text-ink-secondary',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export interface BadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
Badge.displayName = 'Badge'

export { Badge }
