'use client'

import * as React from 'react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * A slide-over drawer built on Radix Dialog, so focus trapping, Escape and
 * scroll locking all behave exactly like a modal. Used for the mobile source
 * reader and the copilot panel.
 */

const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetPortal = SheetPrimitive.Portal
const SheetClose = SheetPrimitive.Close

export type SheetOverlayProps = React.ComponentProps<typeof SheetPrimitive.Overlay>

function SheetOverlay({ className, ...props }: SheetOverlayProps) {
  return (
    <SheetPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-ink/25 backdrop-blur-[2px]',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className,
      )}
      {...props}
    />
  )
}
SheetOverlay.displayName = 'SheetOverlay'

const sheetVariants = cva(
  [
    'fixed z-50 flex flex-col bg-canvas shadow-canvas',
    'transition ease-editorial',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=open]:duration-[260ms] data-[state=closed]:duration-200',
  ].join(' '),
  {
    variants: {
      side: {
        right:
          'inset-y-0 right-0 h-full w-[calc(100vw-3rem)] max-w-md border-l border-line data-[state=open]:slide-in-from-right-full data-[state=closed]:slide-out-to-right-full',
        left: 'inset-y-0 left-0 h-full w-[calc(100vw-3rem)] max-w-md border-r border-line data-[state=open]:slide-in-from-left-full data-[state=closed]:slide-out-to-left-full',
        bottom:
          'inset-x-0 bottom-0 max-h-[88dvh] w-full rounded-t-panel border-t border-line data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full',
      },
    },
    defaultVariants: { side: 'right' },
  },
)

export interface SheetContentProps
  extends React.ComponentProps<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  hideClose?: boolean
}

function SheetContent({
  side = 'right',
  className,
  children,
  hideClose = false,
  ...props
}: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content className={cn(sheetVariants({ side }), className)} {...props}>
        {side === 'bottom' ? (
          <div className="flex justify-center pb-1 pt-2.5" aria-hidden="true">
            <span className="h-1 w-9 rounded-full bg-line-strong" />
          </div>
        ) : null}
        {children}
        {hideClose ? null : (
          <SheetPrimitive.Close
            className={cn(
              'absolute right-4 top-4 inline-flex size-7 items-center justify-center rounded-control',
              'text-ink-muted transition-colors duration-200 ease-editorial',
              'hover:bg-surface hover:text-ink',
              'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
            )}
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}
SheetContent.displayName = 'SheetContent'

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex shrink-0 flex-col gap-1 border-b border-line px-5 py-4 pr-12', className)}
      {...props}
    />
  )
}
SheetHeader.displayName = 'SheetHeader'

function SheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('min-h-0 flex-1 overflow-y-auto scrollbar-slim px-5 py-4', className)} {...props} />
  )
}
SheetBody.displayName = 'SheetBody'

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col-reverse gap-2 border-t border-line px-5 py-3.5 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  )
}
SheetFooter.displayName = 'SheetFooter'

export type SheetTitleProps = React.ComponentProps<typeof SheetPrimitive.Title>

function SheetTitle({ className, ...props }: SheetTitleProps) {
  return (
    <SheetPrimitive.Title
      className={cn('text-[15px] font-medium leading-snug text-ink', className)}
      {...props}
    />
  )
}
SheetTitle.displayName = 'SheetTitle'

export type SheetDescriptionProps = React.ComponentProps<typeof SheetPrimitive.Description>

function SheetDescription({ className, ...props }: SheetDescriptionProps) {
  return (
    <SheetPrimitive.Description
      className={cn('text-[13px] leading-relaxed text-ink-secondary', className)}
      {...props}
    />
  )
}
SheetDescription.displayName = 'SheetDescription'

export {
  Sheet,
  SheetTrigger,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
  sheetVariants,
}
