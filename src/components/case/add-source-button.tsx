'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'

import { Button, type ButtonProps } from '@/components/ui'
import { useWorkspace } from './workspace-context'

/** Opens the workspace add-source dialog from anywhere inside the case. */
export function AddSourceButton({
  children = 'Add a source',
  showIcon = true,
  ...props
}: Omit<ButtonProps, 'onClick'> & { showIcon?: boolean }) {
  const { setAddSourceOpen, canWrite } = useWorkspace()
  return (
    <Button
      {...props}
      disabled={props.disabled || !canWrite}
      title={canWrite ? props.title : 'You have read-only access to this case.'}
      onClick={() => setAddSourceOpen(true)}
    >
      {showIcon ? <Plus /> : null}
      {children}
    </Button>
  )
}
