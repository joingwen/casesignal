'use client'

import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'

import { cn } from '@/lib/utils'

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor
const PopoverPortal = PopoverPrimitive.Portal
const PopoverClose = PopoverPrimitive.Close

export type PopoverContentProps = React.ComponentProps<typeof PopoverPrimitive.Content>

function PopoverContent({
  className,
  align = 'start',
  sideOffset = 6,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-72 rounded-panel border border-line bg-canvas p-4 text-ink shadow-float outline-none',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1',
          'data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1',
          'duration-200 ease-editorial',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
PopoverContent.displayName = 'PopoverContent'

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverPortal, PopoverClose }
