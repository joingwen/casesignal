import * as React from 'react'

import { cn } from '@/lib/utils'

export type TextareaProps = React.ComponentProps<'textarea'>

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-control border border-line bg-canvas px-3 py-2 text-sm leading-relaxed text-ink',
        'transition-colors duration-200 ease-editorial',
        'placeholder:text-ink-muted',
        'hover:border-line-strong',
        'focus-visible:border-evidence focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface',
        'aria-[invalid=true]:border-status-contradicted aria-[invalid=true]:focus-visible:outline-status-contradicted',
        className,
      )}
      {...props}
    />
  )
}
Textarea.displayName = 'Textarea'

export { Textarea }
