'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, Check, Upload } from 'lucide-react'

import {
  Badge,
  Button,
  Field,
  Input,
  Kbd,
  Textarea,
  toast,
} from '@/components/ui'
import { CASE_TEMPLATES } from '@/lib/domain'
import { cn } from '@/lib/utils'
import { createCase } from '@/server/actions/cases'

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Give the case a title of at least 3 characters.')
    .max(160, 'Keep the title under 160 characters.'),
  description: z.string().trim().max(1000, 'Keep the description under 1,000 characters.'),
  objective: z.string().trim().max(1000, 'Keep the objective under 1,000 characters.'),
})

type FormValues = z.infer<typeof schema>

const resolver: Resolver<FormValues> = async (values) => {
  const parsed = schema.safeParse(values)
  if (parsed.success) return { values: parsed.data, errors: {} }

  const errors: FieldErrors<FormValues> = {}
  for (const issue of parsed.error.issues) {
    const key = issue.path[0]
    if (key === 'title' || key === 'description' || key === 'objective') {
      if (!errors[key]) errors[key] = { type: 'validation', message: issue.message }
    }
  }
  return { values: {}, errors }
}

const STEPS = [
  { id: 1, label: 'Case', hint: 'Name and objective' },
  { id: 2, label: 'Template', hint: 'Starting structure' },
  { id: 3, label: 'Sources', hint: 'Records to add' },
  { id: 4, label: 'Confirm', hint: 'Review and create' },
] as const

export function NewCaseWizard() {
  const router = useRouter()
  const [step, setStep] = React.useState(1)
  const [templateId, setTemplateId] = React.useState<string>('general')
  const [addSources, setAddSources] = React.useState(true)
  const [creating, setCreating] = React.useState(false)
  const [planLimit, setPlanLimit] = React.useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver,
    mode: 'onSubmit',
    defaultValues: { title: '', description: '', objective: '' },
  })

  const template = CASE_TEMPLATES.find((entry) => entry.id === templateId) ?? CASE_TEMPLATES[0]

  const goNext = React.useCallback(async () => {
    if (creating) return
    if (step === 1) {
      const valid = await form.trigger(['title', 'description', 'objective'])
      if (!valid) return
      setStep(2)
      return
    }
    if (step < 4) {
      setStep((current) => current + 1)
      return
    }

    // Step 4 — create.
    setCreating(true)
    setPlanLimit(null)
    const values = form.getValues()
    const result = await createCase({
      title: values.title.trim(),
      description: values.description.trim(),
      objective: values.objective.trim(),
      templateId,
    })

    if (!result.ok) {
      setCreating(false)
      if (result.code === 'plan_limit') {
        setPlanLimit(result.error)
        return
      }
      toast.error(result.error)
      return
    }

    toast.success('Case created.')
    router.push(
      addSources
        ? `/app/cases/${result.data.caseId}/sources?add=1`
        : `/app/cases/${result.data.caseId}`,
    )
    router.refresh()
  }, [addSources, creating, form, router, step, templateId])

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        void goNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goNext])

  function chooseTemplate(id: string) {
    setTemplateId(id)
    const chosen = CASE_TEMPLATES.find((entry) => entry.id === id)
    if (chosen && chosen.objective && !form.getValues('objective').trim()) {
      form.setValue('objective', chosen.objective, { shouldDirty: true })
    }
  }

  return (
    <div className="lg:flex lg:items-start">
      {/* Progress rail */}
      <nav
        aria-label="Case setup steps"
        className="border-b border-line px-5 py-3 lg:sticky lg:top-0 lg:w-[220px] lg:shrink-0 lg:border-b-0 lg:border-r lg:px-6 lg:py-8"
      >
        <ol className="flex gap-4 overflow-x-auto scrollbar-slim lg:flex-col lg:gap-3 lg:overflow-visible">
          {STEPS.map((entry) => {
            const state = entry.id < step ? 'done' : entry.id === step ? 'current' : 'todo'
            return (
              <li key={entry.id} className="flex shrink-0 items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]',
                    state === 'done'
                      ? 'border-evidence bg-evidence text-white'
                      : state === 'current'
                        ? 'border-evidence text-evidence'
                        : 'border-line text-ink-muted',
                  )}
                >
                  {state === 'done' ? <Check className="size-3" /> : entry.id}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block text-[13px]',
                      state === 'current' ? 'font-medium text-ink' : 'text-ink-secondary',
                    )}
                  >
                    {entry.label}
                  </span>
                  <span className="hidden text-[11.5px] text-ink-muted lg:block">{entry.hint}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </nav>

      {/* Step body */}
      <div className="min-w-0 flex-1">
        <div className="px-5 py-6 pb-32 lg:px-8 lg:py-8 lg:pb-32">
          <div className="max-w-2xl">
            {step === 1 ? (
              <section aria-labelledby="step-case">
                <h2 id="step-case" className="text-[20px] font-medium tracking-tight text-ink">
                  What is this case?
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
                  A neutral title and a stated objective make the case file easier to review later —
                  and easier for someone else to check.
                </p>

                <form
                  className="mt-6 flex flex-col gap-5"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void goNext()
                  }}
                  noValidate
                >
                  <Field
                    label="Title"
                    required
                    error={form.formState.errors.title?.message}
                    description="How the case appears in your workspace."
                  >
                    <Input
                      autoFocus
                      placeholder="Riverside County procurement records, 2023"
                      {...form.register('title')}
                    />
                  </Field>

                  <Field
                    label="Description"
                    hint="Optional"
                    error={form.formState.errors.description?.message}
                    description="One or two lines about the record set."
                  >
                    <Textarea
                      rows={3}
                      placeholder="Solicitation, award and invoice records obtained under a public-records request."
                      {...form.register('description')}
                    />
                  </Field>

                  <Field
                    label="Objective"
                    hint="Optional"
                    error={form.formState.errors.objective?.message}
                    description="What this review sets out to establish. A template can fill this in for you on the next step."
                  >
                    <Textarea
                      rows={3}
                      placeholder="Trace each award from solicitation through invoice and delivery."
                      {...form.register('objective')}
                    />
                  </Field>

                  {/*
                    Enables implicit form submission (Enter advances the step).
                    Hidden from assistive technology and the tab order so it does
                    not duplicate the visible Continue button in the footer.
                  */}
                  <button type="submit" className="sr-only" aria-hidden="true" tabIndex={-1}>
                    Continue
                  </button>
                </form>
              </section>
            ) : null}

            {step === 2 ? (
              <section aria-labelledby="step-template">
                <h2 id="step-template" className="text-[20px] font-medium tracking-tight text-ink">
                  Choose a starting structure
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
                  A template only sets the default objective and the areas the case map looks at
                  first. It never restricts what you can add.
                </p>

                <div
                  role="radiogroup"
                  aria-label="Case template"
                  className="mt-6 grid gap-2.5 sm:grid-cols-2"
                >
                  {CASE_TEMPLATES.map((entry) => {
                    const selected = entry.id === templateId
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => chooseTemplate(entry.id)}
                        className={cn(
                          'flex flex-col items-start rounded-panel border p-4 text-left',
                          'transition-colors duration-200 ease-editorial',
                          'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
                          selected
                            ? 'border-evidence-border bg-evidence-soft'
                            : 'border-line bg-canvas hover:border-line-strong',
                        )}
                      >
                        <span className="text-[14px] font-medium text-ink">{entry.name}</span>
                        <span className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
                          {entry.summary}
                        </span>
                        {entry.focus.length > 0 ? (
                          <span className="mt-2.5 flex flex-wrap gap-1">
                            {entry.focus.map((focus) => (
                              <Badge
                                key={focus}
                                variant={selected ? 'evidence' : 'neutral'}
                                className="normal-case tracking-normal"
                              >
                                {focus}
                              </Badge>
                            ))}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </section>
            ) : null}

            {step === 3 ? (
              <section aria-labelledby="step-sources">
                <h2 id="step-sources" className="text-[20px] font-medium tracking-tight text-ink">
                  Add initial sources — or skip
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
                  Records are added inside the case workspace, where you can watch each one extract
                  and index. Nothing is uploaded from this screen.
                </p>

                <div className="mt-6 flex flex-col gap-2.5">
                  <button
                    type="button"
                    aria-pressed={addSources}
                    onClick={() => setAddSources(true)}
                    className={cn(
                      'flex items-start gap-3 rounded-panel border p-4 text-left',
                      'transition-colors duration-200 ease-editorial',
                      'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
                      addSources
                        ? 'border-evidence-border bg-evidence-soft'
                        : 'border-line bg-canvas hover:border-line-strong',
                    )}
                  >
                    <Upload className="mt-0.5 size-[18px] shrink-0 text-ink-muted" aria-hidden="true" />
                    <span>
                      <span className="block text-[14px] font-medium text-ink">
                        Open the source panel after creating
                      </span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-ink-secondary">
                        Takes you straight to Sources with the add panel open. Accepts PDF, DOCX,
                        text, Markdown, CSV, spreadsheets, images, web pages and pasted text.
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={!addSources}
                    onClick={() => setAddSources(false)}
                    className={cn(
                      'flex items-start gap-3 rounded-panel border p-4 text-left',
                      'transition-colors duration-200 ease-editorial',
                      'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
                      !addSources
                        ? 'border-evidence-border bg-evidence-soft'
                        : 'border-line bg-canvas hover:border-line-strong',
                    )}
                  >
                    <ArrowRight className="mt-0.5 size-[18px] shrink-0 text-ink-muted" aria-hidden="true" />
                    <span>
                      <span className="block text-[14px] font-medium text-ink">
                        Skip for now
                      </span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-ink-secondary">
                        Creates the case and opens its overview. You can add records whenever you
                        have them.
                      </span>
                    </span>
                  </button>
                </div>
              </section>
            ) : null}

            {step === 4 ? (
              <section aria-labelledby="step-confirm">
                <h2 id="step-confirm" className="text-[20px] font-medium tracking-tight text-ink">
                  Review and create
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
                  Everything below can be edited after the case exists.
                </p>

                <dl className="mt-6 divide-y divide-line border-y border-line">
                  <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:gap-4">
                    <dt className="text-[12.5px] uppercase tracking-wide text-ink-muted">Title</dt>
                    <dd className="text-sm text-ink">{form.getValues('title').trim() || '—'}</dd>
                  </div>
                  <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:gap-4">
                    <dt className="text-[12.5px] uppercase tracking-wide text-ink-muted">
                      Description
                    </dt>
                    <dd className="text-sm leading-relaxed text-ink">
                      {form.getValues('description').trim() || (
                        <span className="text-ink-muted">Not set</span>
                      )}
                    </dd>
                  </div>
                  <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:gap-4">
                    <dt className="text-[12.5px] uppercase tracking-wide text-ink-muted">
                      Objective
                    </dt>
                    <dd className="text-sm leading-relaxed text-ink">
                      {form.getValues('objective').trim() || template.objective || (
                        <span className="text-ink-muted">Not set</span>
                      )}
                    </dd>
                  </div>
                  <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:gap-4">
                    <dt className="text-[12.5px] uppercase tracking-wide text-ink-muted">
                      Template
                    </dt>
                    <dd className="text-sm text-ink">{template.name}</dd>
                  </div>
                  <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:gap-4">
                    <dt className="text-[12.5px] uppercase tracking-wide text-ink-muted">
                      After creating
                    </dt>
                    <dd className="text-sm text-ink">
                      {addSources ? 'Open the source panel' : 'Open the case overview'}
                    </dd>
                  </div>
                </dl>

                {planLimit ? (
                  <div
                    role="alert"
                    className="mt-5 rounded-panel border border-status-contradicted/40 bg-status-contradicted-soft p-4"
                  >
                    <p className="text-sm font-medium text-status-contradicted">
                      Plan limit reached
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
                      {planLimit}
                    </p>
                    <Button asChild variant="primary" size="sm" className="mt-3">
                      <Link href="/app/settings/billing">Upgrade</Link>
                    </Button>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        </div>

        {/* Sticky footer */}
        <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-20 border-t border-line bg-canvas px-5 py-3 lg:bottom-0 lg:left-[240px] lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep((current) => Math.max(1, current - 1))}
              disabled={step === 1 || creating}
            >
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1 text-[11.5px] text-ink-muted sm:flex">
                <Kbd aria-hidden="true">⌘</Kbd>
                <Kbd aria-hidden="true">↵</Kbd>
                <span className="ml-1">to continue</span>
              </span>
              <Button variant="primary" loading={creating} onClick={() => void goNext()}>
                {step === 4 ? 'Create case' : 'Continue'}
                {step === 4 ? null : <ArrowRight aria-hidden="true" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
