'use client'

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '@/lib/utils'

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

export type SelectTriggerProps = React.ComponentProps<typeof SelectPrimitive.Trigger>

function SelectTrigger({ className, children, ...props }: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-9 w-full items-center justify-between gap-2 rounded-control border border-line bg-canvas px-3 py-1.5',
        'text-left text-sm text-ink',
        'transition-colors duration-200 ease-editorial',
        'hover:border-line-strong',
        'data-[placeholder]:text-ink-muted',
        'focus-visible:border-evidence focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface',
        'aria-[invalid=true]:border-status-contradicted',
        '[&>span]:truncate',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}
SelectTrigger.displayName = 'SelectTrigger'

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn('flex cursor-default items-center justify-center py-1 text-ink-muted', className)}
      {...props}
    >
      <ChevronUp className="size-3.5" aria-hidden="true" />
    </SelectPrimitive.ScrollUpButton>
  )
}
SelectScrollUpButton.displayName = 'SelectScrollUpButton'

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn('flex cursor-default items-center justify-center py-1 text-ink-muted', className)}
      {...props}
    >
      <ChevronDown className="size-3.5" aria-hidden="true" />
    </SelectPrimitive.ScrollDownButton>
  )
}
SelectScrollDownButton.displayName = 'SelectScrollDownButton'

export type SelectContentProps = React.ComponentProps<typeof SelectPrimitive.Content>

function SelectContent({
  className,
  children,
  position = 'popper',
  sideOffset = 6,
  ...props
}: SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        sideOffset={position === 'popper' ? sideOffset : undefined}
        className={cn(
          'relative z-50 max-h-72 min-w-[8rem] overflow-hidden rounded-panel border border-line bg-canvas text-ink shadow-float',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'duration-200 ease-editorial',
          position === 'popper' &&
            'w-full min-w-[var(--radix-select-trigger-width)] data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1',
          className,
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className="scrollbar-slim max-h-72 overflow-y-auto p-1">
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}
SelectContent.displayName = 'SelectContent'

export type SelectLabelProps = React.ComponentProps<typeof SelectPrimitive.Label>

function SelectLabel({ className, ...props }: SelectLabelProps) {
  return (
    <SelectPrimitive.Label
      className={cn('px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-muted', className)}
      {...props}
    />
  )
}
SelectLabel.displayName = 'SelectLabel'

export type SelectItemProps = React.ComponentProps<typeof SelectPrimitive.Item>

function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex w-full cursor-default select-none items-center gap-2 rounded-[6px] py-1.5 pl-8 pr-2 text-sm outline-none',
        'transition-colors duration-150 ease-editorial',
        'data-[highlighted]:bg-surface data-[highlighted]:text-ink',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-3.5 text-evidence" aria-hidden="true" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}
SelectItem.displayName = 'SelectItem'

export type SelectSeparatorProps = React.ComponentProps<typeof SelectPrimitive.Separator>

function SelectSeparator({ className, ...props }: SelectSeparatorProps) {
  return <SelectPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-line', className)} {...props} />
}
SelectSeparator.displayName = 'SelectSeparator'

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
