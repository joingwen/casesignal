'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

export type DialogOverlayProps = React.ComponentProps<typeof DialogPrimitive.Overlay>

function DialogOverlay({ className, ...props }: DialogOverlayProps) {
  return (
    <DialogPrimitive.Overlay
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
DialogOverlay.displayName = 'DialogOverlay'

export interface DialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  /** Hide the built-in close affordance when the dialog supplies its own. */
  hideClose?: boolean
}

function DialogContent({ className, children, hideClose = false, ...props }: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
          'w-[calc(100vw-2rem)] max-w-lg',
          'max-h-[calc(100dvh-2rem)] overflow-y-auto scrollbar-slim',
          'rounded-panel border border-line bg-canvas shadow-canvas',
          'p-6',
          'duration-200 ease-editorial',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      >
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close
            className={cn(
              'absolute right-4 top-4 inline-flex size-7 items-center justify-center rounded-control',
              'text-ink-muted transition-colors duration-200 ease-editorial',
              'hover:bg-surface hover:text-ink',
              'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
              'disabled:pointer-events-none',
            )}
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}
DialogContent.displayName = 'DialogContent'

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mb-4 flex flex-col gap-1.5 pr-8', className)} {...props} />
}
DialogHeader.displayName = 'DialogHeader'

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2.5',
        className,
      )}
      {...props}
    />
  )
}
DialogFooter.displayName = 'DialogFooter'

export type DialogTitleProps = React.ComponentProps<typeof DialogPrimitive.Title>

function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <DialogPrimitive.Title
      className={cn('text-[17px] font-medium leading-snug tracking-[-0.01em] text-ink', className)}
      {...props}
    />
  )
}
DialogTitle.displayName = 'DialogTitle'

export type DialogDescriptionProps = React.ComponentProps<typeof DialogPrimitive.Description>

function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      className={cn('text-sm leading-relaxed text-ink-secondary', className)}
      {...props}
    />
  )
}
DialogDescription.displayName = 'DialogDescription'

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
}
