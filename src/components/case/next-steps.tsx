'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

import { Button, toast } from '@/components/ui'
import { buildCaseMap } from '@/server/actions/cases'
import { cn } from '@/lib/utils'
import { useWorkspace } from './workspace-context'

export interface NextStepsProps {
  caseId: string
  sourceCount: number
  processingCount: number
  mapBuilt: boolean
  askedQuestion: boolean
  canWrite: boolean
}

/**
 * The three-step flow, reflecting where this case actually is rather than a
 * fixed checklist: add records, build the map across them, then interrogate it.
 */
export function NextSteps({
  caseId,
  sourceCount,
  processingCount,
  mapBuilt,
  askedQuestion,
  canWrite,
}: NextStepsProps) {
  const router = useRouter()
  const { setAddSourceOpen, openCopilot } = useWorkspace()
  const [building, setBuilding] = React.useState(false)

  async function build() {
    setBuilding(true)
    const result = await buildCaseMap(caseId)
    setBuilding(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(
      `Case map built — ${result.data.discrepancies} discrepanc${result.data.discrepancies === 1 ? 'y' : 'ies'} and ${result.data.relationships} relationship${result.data.relationships === 1 ? '' : 's'} recorded.`,
    )
    router.refresh()
  }

  const steps = [
    {
      key: 'sources',
      title: 'Add the records',
      done: sourceCount > 0,
      detail:
        sourceCount === 0
          ? 'Nothing has been added yet.'
          : processingCount > 0
            ? `${sourceCount} added · ${processingCount} still processing.`
            : `${sourceCount} record${sourceCount === 1 ? '' : 's'} indexed and ready to cite.`,
      action: (
        <Button
          variant={sourceCount === 0 ? 'primary' : 'secondary'}
          size="sm"
          disabled={!canWrite}
          onClick={() => setAddSourceOpen(true)}
          title={canWrite ? undefined : 'You have read-only access to this case.'}
        >
          Add a source
        </Button>
      ),
    },
    {
      key: 'map',
      title: 'Build the case map',
      done: mapBuilt,
      detail: mapBuilt
        ? 'Relationships, contradictions and a case summary have been generated.'
        : sourceCount === 0
          ? 'Available once at least one record is indexed.'
          : 'Compares every record against every other one.',
      action: (
        <Button
          variant={sourceCount > 0 && !mapBuilt ? 'primary' : 'secondary'}
          size="sm"
          loading={building}
          disabled={!canWrite || sourceCount === 0}
          onClick={() => void build()}
          title={sourceCount === 0 ? 'Add at least one record first.' : undefined}
        >
          {mapBuilt ? 'Rebuild map' : 'Build the case map'}
        </Button>
      ),
    },
    {
      key: 'ask',
      title: 'Ask a question',
      done: askedQuestion,
      detail: askedQuestion
        ? 'You have asked at least one source-backed question.'
        : 'Answers are assembled only from excerpts in these records.',
      action: (
        <Button variant="secondary" size="sm" onClick={openCopilot} disabled={sourceCount === 0}>
          Ask a question
        </Button>
      ),
    },
  ]

  return (
    <ol className="divide-y divide-line">
      {steps.map((step, index) => (
        <li key={step.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span
            aria-hidden="true"
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]',
              step.done
                ? 'border-status-supported/30 bg-status-supported-soft text-status-supported'
                : 'border-line bg-page text-ink-muted',
            )}
          >
            {step.done ? <Check className="size-3" /> : index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-ink">
              {step.title}
              <span className="sr-only">{step.done ? ' — done' : ' — not yet done'}</span>
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">{step.detail}</p>
          </div>
          <div className="shrink-0">{step.action}</div>
        </li>
      ))}
    </ol>
  )
}
