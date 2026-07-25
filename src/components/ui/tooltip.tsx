'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

import { cn } from '@/lib/utils'

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger
const TooltipPortal = TooltipPrimitive.Portal

export type TooltipContentProps = React.ComponentProps<typeof TooltipPrimitive.Content>

function TooltipContent({ className, sideOffset = 6, ...props }: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 max-w-[16rem] rounded-[6px] bg-ink px-2 py-1 text-xs leading-snug text-white shadow-float',
          'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'duration-200 ease-editorial',
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
}
TooltipContent.displayName = 'TooltipContent'

export interface TipProps extends Omit<TooltipPrimitive.TooltipProps, 'children'> {
  /** The element the tip is attached to. Must be able to hold a ref. */
  children: React.ReactNode
  content: React.ReactNode
  side?: TooltipContentProps['side']
  align?: TooltipContentProps['align']
  sideOffset?: number
  /** Set false to render children untouched when there is nothing to say. */
  disabled?: boolean
}

/**
 * Convenience wrapper for the common case. Wrap the app once in
 * `TooltipProvider`; `Tip` supplies its own provider when one is missing so it
 * can also be used in isolation.
 */
function Tip({
  children,
  content,
  side = 'top',
  align = 'center',
  sideOffset = 6,
  disabled = false,
  delayDuration = 200,
  ...props
}: TipProps) {
  if (disabled || content === null || content === undefined || content === '') {
    return <>{children}</>
  }

  return (
    <TooltipPrimitive.Root delayDuration={delayDuration} {...props}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} sideOffset={sideOffset}>
        {content}
      </TooltipContent>
    </TooltipPrimitive.Root>
  )
}
Tip.displayName = 'Tip'

/** App-level provider with the CaseSignal delay baked in. */
function TooltipRoot({
  delayDuration = 200,
  skipDelayDuration = 300,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    >
      {children}
    </TooltipPrimitive.Provider>
  )
}
TooltipRoot.displayName = 'TooltipRoot'

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipPortal, TooltipRoot, Tip }
