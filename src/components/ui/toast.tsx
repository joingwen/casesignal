'use client'

import * as React from 'react'
import { Toaster as SonnerToaster, toast } from 'sonner'

/**
 * Toasts are for confirmations and recoverable failures only. Anything that
 * changes the record itself belongs in the interface, not in a transient strip.
 */

export type ToasterProps = React.ComponentProps<typeof SonnerToaster>

function Toaster({ position = 'bottom-right', ...props }: ToasterProps) {
  return (
    <SonnerToaster
      position={position}
      richColors={false}
      closeButton
      gap={10}
      offset={20}
      toastOptions={{
        classNames: {
          toast:
            'group !bg-canvas !border !border-line !text-ink !shadow-float !rounded-panel !font-sans !text-sm !gap-2.5 !py-3 !px-3.5',
          title: '!text-ink !text-[13px] !font-medium !leading-snug',
          description: '!text-ink-secondary !text-xs !leading-relaxed',
          actionButton:
            '!bg-ink !text-white !text-[12px] !font-medium !rounded-control !h-7 !px-2.5',
          cancelButton:
            '!bg-transparent !text-ink-secondary !text-[12px] !rounded-control !h-7 !px-2.5 hover:!bg-surface',
          closeButton: '!bg-canvas !border-line !text-ink-muted hover:!text-ink',
          icon: '!size-4',
          success: '![--normal-text:#3D7A5A]',
          error: '![--normal-text:#B4544C]',
          warning: '![--normal-text:#A67A16]',
          info: '![--normal-text:#3F76C5]',
        },
      }}
      {...props}
    />
  )
}
Toaster.displayName = 'Toaster'

export { Toaster, toast }
