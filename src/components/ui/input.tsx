import * as React from 'react'

import { cn } from '@/lib/utils'

export type InputProps = React.ComponentProps<'input'>

function Input({ className, type = 'text', ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-control border border-line bg-canvas px-3 py-1.5 text-sm text-ink',
        'transition-colors duration-200 ease-editorial',
        'placeholder:text-ink-muted',
        'hover:border-line-strong',
        'focus-visible:border-evidence focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface',
        'file:border-0 file:bg-transparent file:p-0 file:text-sm file:font-medium file:text-ink',
        'aria-[invalid=true]:border-status-contradicted aria-[invalid=true]:focus-visible:outline-status-contradicted',
        className,
      )}
      {...props}
    />
  )
}
Input.displayName = 'Input'

export { Input }
