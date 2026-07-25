'use client'

import * as React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Hairline-separated disclosure rows. Built for the marketing FAQ, but equally
 * at home in dense settings panels.
 */

const Accordion = AccordionPrimitive.Root

export type AccordionItemProps = React.ComponentProps<typeof AccordionPrimitive.Item>

function AccordionItem({ className, ...props }: AccordionItemProps) {
  return <AccordionPrimitive.Item className={cn('border-b border-line', className)} {...props} />
}
AccordionItem.displayName = 'AccordionItem'

export type AccordionTriggerProps = React.ComponentProps<typeof AccordionPrimitive.Trigger>

function AccordionTrigger({ className, children, ...props }: AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          'group flex flex-1 items-start justify-between gap-6 py-5 text-left',
          'text-[15px] font-medium leading-snug tracking-[-0.01em] text-ink md:text-[17px]',
          'transition-colors duration-200 ease-editorial',
          'hover:text-ink/70',
          'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
          className,
        )}
        {...props}
      >
        <span className="text-pretty">{children}</span>
        <ChevronDown
          className={cn(
            'mt-0.5 size-4 shrink-0 text-ink-muted',
            'transition-transform duration-200 ease-editorial',
            'group-data-[state=open]:rotate-180',
          )}
          aria-hidden="true"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}
AccordionTrigger.displayName = 'AccordionTrigger'

export type AccordionContentProps = React.ComponentProps<typeof AccordionPrimitive.Content>

function AccordionContent({ className, children, ...props }: AccordionContentProps) {
  return (
    <AccordionPrimitive.Content
      className={cn(
        'overflow-hidden text-sm leading-relaxed text-ink-secondary',
        // Height keyframes would need extra Tailwind config; a short fade and
        // 4px lift reads calmer here and needs nothing beyond the animate plugin.
        'duration-200 ease-editorial',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      )}
      {...props}
    >
      <div className={cn('max-w-[62ch] pb-5 pr-10 text-pretty', className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}
AccordionContent.displayName = 'AccordionContent'

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
