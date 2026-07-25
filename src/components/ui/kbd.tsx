import * as React from 'react'

import { cn } from '@/lib/utils'

export type KbdProps = React.ComponentProps<'kbd'>

/** A single key cap, e.g. `<Kbd>⌘</Kbd><Kbd>K</Kbd>`. */
function Kbd({ className, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-[1.25rem] items-center justify-center rounded-[4px] border border-line bg-surface px-1 py-0.5',
        'font-mono text-[10px] leading-none text-ink-secondary',
        className,
      )}
      {...props}
    />
  )
}
Kbd.displayName = 'Kbd'

export interface KbdGroupProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** Keys in press order, e.g. `['⌘', 'K']`. */
  keys: string[]
  /** Separator rendered between caps. Empty string renders none. */
  separator?: string
}

/** A shortcut hint: several caps with an accessible spoken label. */
function KbdGroup({ keys, separator = '', className, ...props }: KbdGroupProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-0.5 align-middle', className)}
      aria-label={keys.join(' then ')}
      {...props}
    >
      {keys.map((key, index) => (
        <React.Fragment key={`${key}-${index}`}>
          {index > 0 && separator ? (
            <span className="text-[10px] text-ink-muted" aria-hidden="true">
              {separator}
            </span>
          ) : null}
          <Kbd aria-hidden="true">{key}</Kbd>
        </React.Fragment>
      ))}
    </span>
  )
}
KbdGroup.displayName = 'KbdGroup'

export { Kbd, KbdGroup }
