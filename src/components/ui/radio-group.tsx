'use client'

import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'

import { cn } from '@/lib/utils'

export type RadioGroupProps = React.ComponentProps<typeof RadioGroupPrimitive.Root>

function RadioGroup({ className, ...props }: RadioGroupProps) {
  return <RadioGroupPrimitive.Root className={cn('grid gap-2.5', className)} {...props} />
}
RadioGroup.displayName = 'RadioGroup'

export type RadioGroupItemProps = React.ComponentProps<typeof RadioGroupPrimitive.Item>

function RadioGroupItem({ className, ...props }: RadioGroupItemProps) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'aspect-square size-4 shrink-0 rounded-full border border-line-strong bg-canvas',
        'transition-colors duration-200 ease-editorial',
        'hover:border-ink-muted',
        'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-evidence',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex size-full items-center justify-center">
        <span className="block size-2 rounded-full bg-evidence" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}
RadioGroupItem.displayName = 'RadioGroupItem'

export { RadioGroup, RadioGroupItem }
