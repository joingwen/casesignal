'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button, type ButtonProps, toast } from '@/components/ui'
import { DEMO_BANNER } from '@/lib/domain'
import { duplicateDemoCase } from '@/server/actions/cases'

export interface DemoCaseButtonProps extends Omit<ButtonProps, 'onClick' | 'loading'> {
  /** An existing demo case to open instead of creating another one. */
  existingCaseId?: string | null
  children?: React.ReactNode
}

/**
 * Loads the fictional demonstration case and opens it. The case is clearly
 * labelled as fictional everywhere it appears; it exists so the workspace can
 * be evaluated without uploading real records.
 */
export function DemoCaseButton({
  existingCaseId = null,
  children = 'Open the demo case',
  variant = 'secondary',
  ...props
}: DemoCaseButtonProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function onClick() {
    if (existingCaseId) {
      router.push(`/app/cases/${existingCaseId}`)
      return
    }
    setPending(true)
    const result = await duplicateDemoCase()
    if (!result.ok) {
      setPending(false)
      toast.error(result.error)
      return
    }
    toast.success('Demo case ready.', { description: DEMO_BANNER })
    router.push(`/app/cases/${result.data.caseId}`)
    router.refresh()
  }

  return (
    <Button variant={variant} loading={pending} onClick={() => void onClick()} {...props}>
      {children}
    </Button>
  )
}
