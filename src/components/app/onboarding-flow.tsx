'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, FilePlus2, Sparkles } from 'lucide-react'

import { Button, Field, RadioGroup, RadioGroupItem, Textarea, toast } from '@/components/ui'
import { DEMO_BANNER, USER_ROLES, USER_ROLE_LABELS, type UserRole } from '@/lib/domain'
import { cn } from '@/lib/utils'
import { completeOnboarding } from '@/server/actions/account'
import { duplicateDemoCase } from '@/server/actions/cases'

const STEPS = [
  { id: 1, label: 'Your work' },
  { id: 2, label: 'This investigation' },
  { id: 3, label: 'Start' },
] as const

const HOW_IT_WORKS = [
  {
    title: 'Add records',
    body: 'Upload PDFs, spreadsheets, documents and pages, or paste text. Each one is split into excerpts that keep their page, sheet or row.',
  },
  {
    title: 'Build the case map',
    body: 'CaseSignal extracts entities, dated events and claims, then compares records against each other to find where they differ.',
  },
  {
    title: 'Inspect the evidence',
    body: 'Every claim, date and difference links to the exact excerpt behind it. Nothing appears without a citation you can open.',
  },
  {
    title: 'Share a dossier',
    body: 'Publish a read-only evidence room or export a brief. Findings leave the workspace with their citations attached.',
  },
]

export function OnboardingFlow({
  defaultRole,
  defaultUseCase,
  demoCaseId,
}: {
  defaultRole: string
  defaultUseCase: string
  demoCaseId: string | null
}) {
  const router = useRouter()
  const [step, setStep] = React.useState(1)
  const [role, setRole] = React.useState<UserRole>(
    (USER_ROLES as readonly string[]).includes(defaultRole) ? (defaultRole as UserRole) : 'investigator',
  )
  const [useCase, setUseCase] = React.useState(defaultUseCase)
  const [pending, setPending] = React.useState<'blank' | 'demo' | null>(null)

  async function save() {
    const result = await completeOnboarding({ role, primaryUseCase: useCase.trim() })
    if (!result.ok) {
      toast.error(result.error)
      return false
    }
    return true
  }

  async function startBlank() {
    setPending('blank')
    if (!(await save())) {
      setPending(null)
      return
    }
    router.push('/app/cases/new')
    router.refresh()
  }

  async function startDemo() {
    setPending('demo')
    if (!(await save())) {
      setPending(null)
      return
    }
    if (demoCaseId) {
      router.push(`/app/cases/${demoCaseId}`)
      router.refresh()
      return
    }
    const result = await duplicateDemoCase()
    if (!result.ok) {
      setPending(null)
      toast.error(result.error)
      return
    }
    toast.success('Demo case ready.', { description: DEMO_BANNER })
    router.push(`/app/cases/${result.data.caseId}`)
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 lg:px-8 lg:py-12">
      {/* Progress */}
      <ol className="flex items-center gap-2" aria-label="Setup progress">
        {STEPS.map((entry) => {
          const state = entry.id < step ? 'done' : entry.id === step ? 'current' : 'todo'
          return (
            <li key={entry.id} className="flex min-w-0 flex-1 items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  'h-[3px] flex-1 rounded-full transition-colors duration-300 ease-editorial',
                  state === 'todo' ? 'bg-line' : 'bg-evidence',
                )}
              />
              <span
                className={cn(
                  'shrink-0 whitespace-nowrap text-[11px] uppercase tracking-wide',
                  state === 'current' ? 'text-ink' : 'text-ink-muted',
                )}
              >
                {state === 'done' ? (
                  <Check className="mr-1 inline size-3 align-[-1px]" aria-hidden="true" />
                ) : null}
                {entry.label}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="mt-8">
        {step === 1 ? (
          <section aria-labelledby="onboarding-role">
            <h2
              id="onboarding-role"
              className="text-[24px] font-medium leading-tight tracking-tight text-ink"
            >
              What kind of work brings you here?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              This sets the default tone of case objectives and the templates suggested first. You
              can change it any time in settings.
            </p>

            <RadioGroup
              value={role}
              onValueChange={(value) => setRole(value as UserRole)}
              className="mt-6 grid gap-2 sm:grid-cols-2"
              aria-label="Your role"
            >
              {USER_ROLES.map((value) => (
                <label
                  key={value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-panel border px-3.5 py-3 text-sm',
                    'transition-colors duration-200 ease-editorial',
                    'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-evidence has-[:focus-visible]:outline-offset-2',
                    role === value
                      ? 'border-evidence-border bg-evidence-soft text-ink'
                      : 'border-line bg-canvas text-ink-secondary hover:border-line-strong hover:text-ink',
                  )}
                >
                  <RadioGroupItem value={value} />
                  {USER_ROLE_LABELS[value]}
                </label>
              ))}
            </RadioGroup>
          </section>
        ) : null}

        {step === 2 ? (
          <section aria-labelledby="onboarding-usecase">
            <h2
              id="onboarding-usecase"
              className="text-[24px] font-medium leading-tight tracking-tight text-ink"
            >
              What are you working on?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              Optional. One or two lines is enough — it is used as context when a case objective is
              suggested. It is never published.
            </p>

            <div className="mt-6">
              <Field
                label="Current work"
                hint="Optional"
                description="Example: comparing a county's certified totals against its poll-book records for one election cycle."
              >
                <Textarea
                  rows={4}
                  maxLength={400}
                  value={useCase}
                  onChange={(event) => setUseCase(event.target.value)}
                  placeholder="A short description of the records you are working through."
                />
              </Field>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section aria-labelledby="onboarding-start">
            <h2
              id="onboarding-start"
              className="text-[24px] font-medium leading-tight tracking-tight text-ink"
            >
              Where would you like to start?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              Both options open a real workspace. The demo case uses fictional records, clearly
              labelled as such.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void startBlank()}
                disabled={pending !== null}
                className={cn(
                  'flex flex-col items-start rounded-panel border border-line bg-canvas p-4 text-left',
                  'transition-colors duration-200 ease-editorial',
                  'hover:border-line-strong hover:bg-page/60',
                  'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                <FilePlus2 className="size-[18px] text-ink-muted" aria-hidden="true" />
                <span className="mt-3 text-[15px] font-medium text-ink">Start a blank case</span>
                <span className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
                  Name the investigation, pick a template, then add your own records.
                </span>
              </button>

              <button
                type="button"
                onClick={() => void startDemo()}
                disabled={pending !== null}
                className={cn(
                  'flex flex-col items-start rounded-panel border border-line bg-canvas p-4 text-left',
                  'transition-colors duration-200 ease-editorial',
                  'hover:border-line-strong hover:bg-page/60',
                  'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                <Sparkles className="size-[18px] text-ink-muted" aria-hidden="true" />
                <span className="mt-3 text-[15px] font-medium text-ink">
                  Open the fictional demo case
                </span>
                <span className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
                  A complete case file with sources, claims and discrepancies already indexed.
                </span>
              </button>
            </div>

            {pending ? (
              <p aria-live="polite" className="mt-3 text-[12.5px] text-ink-secondary">
                {pending === 'demo' ? 'Preparing the demo case…' : 'Saving your answers…'}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
        <Button
          variant="ghost"
          onClick={() => setStep((current) => Math.max(1, current - 1))}
          disabled={step === 1 || pending !== null}
        >
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>

        {step < 3 ? (
          <Button variant="primary" onClick={() => setStep((current) => Math.min(3, current + 1))}>
            Continue
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : (
          <span className="text-[12.5px] text-ink-muted">Choose one of the two options above.</span>
        )}
      </div>

      {/* Honest, static explanation of the product */}
      <section aria-labelledby="how-it-works" className="mt-12 border-t border-line pt-8">
        <h2
          id="how-it-works"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted"
        >
          How CaseSignal works
        </h2>
        <ol className="mt-4 grid gap-5 sm:grid-cols-2">
          {HOW_IT_WORKS.map((entry, index) => (
            <li key={entry.title}>
              <p className="flex items-baseline gap-2 text-[14px] font-medium text-ink">
                <span className="tabular text-[11px] text-ink-muted">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {entry.title}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">{entry.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
