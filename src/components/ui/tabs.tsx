'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'

/**
 * A thin editorial tab strip: plain text on a hairline, with a 2px evidence
 * rule under the active item. Deliberately not a filled pill — tabs here read
 * like section headings in a printed report.
 */

const Tabs = TabsPrimitive.Root

export type TabsListProps = React.ComponentProps<typeof TabsPrimitive.List>

function TabsList({ className, ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn(
        'flex items-stretch gap-5 overflow-x-auto border-b border-line scrollbar-slim',
        className,
      )}
      {...props}
    />
  )
}
TabsList.displayName = 'TabsList'

export type TabsTriggerProps = React.ComponentProps<typeof TabsPrimitive.Trigger>

function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'relative -mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap',
        'border-b-2 border-transparent bg-transparent px-0.5 pb-2.5 pt-1.5',
        'text-sm text-ink-secondary',
        'transition-colors duration-200 ease-editorial',
        'hover:text-ink',
        'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:border-evidence data-[state=active]:text-ink data-[state=active]:font-medium',
        className,
      )}
      {...props}
    />
  )
}
TabsTrigger.displayName = 'TabsTrigger'

export type TabsContentProps = React.ComponentProps<typeof TabsPrimitive.Content>

function TabsContent({ className, ...props }: TabsContentProps) {
  return (
    <TabsPrimitive.Content
      className={cn(
        'mt-5 focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
        className,
      )}
      {...props}
    />
  )
}
TabsContent.displayName = 'TabsContent'

/** Small trailing count, e.g. the number of claims behind a tab. */
function TabsCount({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn('tabular text-[11px] text-ink-muted', className)} {...props} />
}
TabsCount.displayName = 'TabsCount'

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsCount }
