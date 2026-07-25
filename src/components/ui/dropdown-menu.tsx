'use client'

import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight, Circle } from 'lucide-react'

import { cn } from '@/lib/utils'

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group
const DropdownMenuPortal = DropdownMenuPrimitive.Portal
const DropdownMenuSub = DropdownMenuPrimitive.Sub
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

/** Shared surface treatment for the root menu and every sub-menu. */
const MENU_SURFACE = [
  'z-50 min-w-[11rem] overflow-hidden rounded-panel border border-line bg-canvas p-1 shadow-float',
  'text-ink',
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
  'data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1',
  'data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1',
  'duration-200 ease-editorial',
].join(' ')

const ITEM_BASE = [
  'relative flex cursor-default select-none items-center gap-2 rounded-[6px] px-2 py-1.5 text-sm outline-none',
  'transition-colors duration-150 ease-editorial',
  'data-[highlighted]:bg-surface data-[highlighted]:text-ink',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-secondary',
].join(' ')

export interface DropdownMenuItemProps
  extends React.ComponentProps<typeof DropdownMenuPrimitive.Item> {
  inset?: boolean
  destructive?: boolean
}

function DropdownMenuItem({ className, inset, destructive, ...props }: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        ITEM_BASE,
        inset && 'pl-8',
        destructive &&
          'text-status-contradicted data-[highlighted]:bg-status-contradicted-soft data-[highlighted]:text-status-contradicted [&_svg]:text-status-contradicted',
        className,
      )}
      {...props}
    />
  )
}
DropdownMenuItem.displayName = 'DropdownMenuItem'

export type DropdownMenuContentProps = React.ComponentProps<typeof DropdownMenuPrimitive.Content>

function DropdownMenuContent({ className, sideOffset = 6, ...props }: DropdownMenuContentProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(MENU_SURFACE, className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}
DropdownMenuContent.displayName = 'DropdownMenuContent'

export interface DropdownMenuLabelProps
  extends React.ComponentProps<typeof DropdownMenuPrimitive.Label> {
  inset?: boolean
}

function DropdownMenuLabel({ className, inset, ...props }: DropdownMenuLabelProps) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        'px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-muted',
        inset && 'pl-8',
        className,
      )}
      {...props}
    />
  )
}
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

export type DropdownMenuSeparatorProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Separator
>

function DropdownMenuSeparator({ className, ...props }: DropdownMenuSeparatorProps) {
  return <DropdownMenuPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-line', className)} {...props} />
}
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

export type DropdownMenuCheckboxItemProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.CheckboxItem
>

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: DropdownMenuCheckboxItemProps) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      checked={checked}
      className={cn(ITEM_BASE, 'pl-8', className)}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="size-3.5 text-evidence" aria-hidden="true" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem'

export type DropdownMenuRadioItemProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.RadioItem
>

function DropdownMenuRadioItem({ className, children, ...props }: DropdownMenuRadioItemProps) {
  return (
    <DropdownMenuPrimitive.RadioItem className={cn(ITEM_BASE, 'pl-8', className)} {...props}>
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle className="size-2 fill-evidence text-evidence" aria-hidden="true" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem'

export interface DropdownMenuSubTriggerProps
  extends React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> {
  inset?: boolean
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: DropdownMenuSubTriggerProps) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      className={cn(ITEM_BASE, 'data-[state=open]:bg-surface', inset && 'pl-8', className)}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto size-3.5" aria-hidden="true" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger'

export type DropdownMenuSubContentProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.SubContent
>

function DropdownMenuSubContent({ className, ...props }: DropdownMenuSubContentProps) {
  return <DropdownMenuPrimitive.SubContent className={cn(MENU_SURFACE, className)} {...props} />
}
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent'

/** Right-aligned shortcut hint inside a menu item. */
function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn('ml-auto pl-4 font-mono text-[10px] tracking-wide text-ink-muted', className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut'

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
  DropdownMenuShortcut,
}
