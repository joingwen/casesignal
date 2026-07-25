'use client'

import * as React from 'react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'

import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

const AlertDialog = AlertDialogPrimitive.Root
const AlertDialogTrigger = AlertDialogPrimitive.Trigger
const AlertDialogPortal = AlertDialogPrimitive.Portal

export type AlertDialogOverlayProps = React.ComponentProps<typeof AlertDialogPrimitive.Overlay>

function AlertDialogOverlay({ className, ...props }: AlertDialogOverlayProps) {
  return (
    <AlertDialogPrimitive.Overlay
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
AlertDialogOverlay.displayName = 'AlertDialogOverlay'

export type AlertDialogContentProps = React.ComponentProps<typeof AlertDialogPrimitive.Content>

function AlertDialogContent({ className, ...props }: AlertDialogContentProps) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
          'w-[calc(100vw-2rem)] max-w-md',
          'rounded-panel border border-line bg-canvas shadow-canvas p-6',
          'duration-200 ease-editorial',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}
AlertDialogContent.displayName = 'AlertDialogContent'

function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mb-4 flex flex-col gap-1.5', className)} {...props} />
}
AlertDialogHeader.displayName = 'AlertDialogHeader'

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2.5', className)}
      {...props}
    />
  )
}
AlertDialogFooter.displayName = 'AlertDialogFooter'

export type AlertDialogTitleProps = React.ComponentProps<typeof AlertDialogPrimitive.Title>

function AlertDialogTitle({ className, ...props }: AlertDialogTitleProps) {
  return (
    <AlertDialogPrimitive.Title
      className={cn('text-[17px] font-medium leading-snug tracking-[-0.01em] text-ink', className)}
      {...props}
    />
  )
}
AlertDialogTitle.displayName = 'AlertDialogTitle'

export type AlertDialogDescriptionProps = React.ComponentProps<
  typeof AlertDialogPrimitive.Description
>

function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
  return (
    <AlertDialogPrimitive.Description
      className={cn('text-sm leading-relaxed text-ink-secondary', className)}
      {...props}
    />
  )
}
AlertDialogDescription.displayName = 'AlertDialogDescription'

export interface AlertDialogActionProps
  extends React.ComponentProps<typeof AlertDialogPrimitive.Action> {
  /** Destructive confirmations should read `danger`; benign ones `primary`. */
  variant?: 'danger' | 'primary' | 'evidence'
}

function AlertDialogAction({ className, variant = 'danger', ...props }: AlertDialogActionProps) {
  return (
    <AlertDialogPrimitive.Action
      className={cn(buttonVariants({ variant, size: 'md' }), className)}
      {...props}
    />
  )
}
AlertDialogAction.displayName = 'AlertDialogAction'

export type AlertDialogCancelProps = React.ComponentProps<typeof AlertDialogPrimitive.Cancel>

function AlertDialogCancel({ className, ...props }: AlertDialogCancelProps) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(buttonVariants({ variant: 'secondary', size: 'md' }), className)}
      {...props}
    />
  )
}
AlertDialogCancel.displayName = 'AlertDialogCancel'

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
