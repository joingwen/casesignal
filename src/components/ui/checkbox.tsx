'use client'

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check, Minus } from 'lucide-react'

import { cn } from '@/lib/utils'

export type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root>

function Checkbox({ className, checked, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      className={cn(
        'peer size-4 shrink-0 rounded-[4px] border border-line-strong bg-canvas',
        'transition-colors duration-200 ease-editorial',
        'hover:border-ink-muted',
        'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-evidence data-[state=checked]:bg-evidence data-[state=checked]:text-white',
        'data-[state=indeterminate]:border-evidence data-[state=indeterminate]:bg-evidence data-[state=indeterminate]:text-white',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {checked === 'indeterminate' ? (
          <Minus className="size-3" strokeWidth={3} aria-hidden="true" />
        ) : (
          <Check className="size-3" strokeWidth={3} aria-hidden="true" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
Checkbox.displayName = 'Checkbox'

export { Checkbox }
