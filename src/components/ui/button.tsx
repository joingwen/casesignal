'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * The single button vocabulary for CaseSignal.
 *
 * `primary` carries the page's one committing action. `evidence` is reserved
 * for actions that create or follow a citation, so the accent keeps its
 * meaning. Everything else is quiet by design.
 */
export const buttonVariants = cva(
  [
    'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap',
    'rounded-control font-medium',
    'transition-colors duration-200 ease-editorial',
    'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
    'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-ink text-white hover:bg-ink/90',
        secondary: 'bg-canvas text-ink border border-line-strong hover:bg-surface',
        ghost: 'text-ink hover:bg-surface',
        evidence: 'bg-evidence text-white hover:bg-evidence-deep',
        danger: 'bg-status-contradicted text-white hover:bg-status-contradicted/90',
        link: 'text-ink underline underline-offset-4 hover:text-evidence',
      },
      size: {
        sm: 'h-8 px-3 text-[13px] [&_svg]:size-3.5',
        md: 'h-9 px-4 text-sm [&_svg]:size-4',
        lg: 'h-11 px-6 text-[15px] [&_svg]:size-4',
        icon: 'h-9 w-9 p-0 [&_svg]:size-4',
      },
    },
    compoundVariants: [
      { variant: 'link', size: 'sm', className: 'h-auto px-0' },
      { variant: 'link', size: 'md', className: 'h-auto px-0' },
      { variant: 'link', size: 'lg', className: 'h-auto px-0' },
    ],
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  /** Render into the child element (e.g. a `next/link`) instead of a `<button>`. */
  asChild?: boolean
  /** Shows a spinner, marks the control busy and blocks further presses. */
  loading?: boolean
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  const isDisabled = disabled || loading

  return (
    <Comp
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size }), className)}
      aria-busy={loading || undefined}
      disabled={asChild ? undefined : isDisabled}
      data-disabled={isDisabled || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}
Button.displayName = 'Button'

export { Button }
