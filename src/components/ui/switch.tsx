'use client'

import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '@/lib/utils'

export type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root>

function Switch({ className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent p-0.5',
        'transition-colors duration-200 ease-editorial',
        'bg-line-strong',
        'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-evidence',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-canvas shadow-panel ring-0',
          'transition-transform duration-200 ease-editorial',
          'data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-4',
        )}
      />
    </SwitchPrimitive.Root>
  )
}
Switch.displayName = 'Switch'

export { Switch }
