'use client'

import { useActionState } from 'react'
import { Lock } from 'lucide-react'

import { Button, Field, Input } from '@/components/ui'
import { NEUTRALITY_DISCLAIMER } from '@/lib/domain'
import { unlockShare, type ShareGateState } from './actions'

const INITIAL: ShareGateState = { error: null }

/**
 * The gate shown before a protected evidence room.
 *
 * Nothing about the case reaches this component — not the title, not the
 * counts, not the record list. The page only renders it, and only renders the
 * room once the server has accepted the password.
 */
export function PasswordGate({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(unlockShare, INITIAL)

  return (
    <main className="flex min-h-dvh items-center justify-center bg-page px-5 py-16">
      <div className="w-full max-w-[420px]">
        <div className="rounded-panel border border-line bg-canvas px-7 py-8 shadow-panel">
          <span className="inline-flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink-secondary">
            <Lock className="size-4" aria-hidden="true" />
          </span>

          <h1 className="mt-5 text-[21px] font-medium leading-tight tracking-tight text-ink">
            This evidence room is password protected
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
            Enter the password you were given to read the published record. Access lasts for two hours on this
            device.
          </p>

          <form action={formAction} className="mt-6 space-y-4">
            <input type="hidden" name="slug" value={slug} />
            <Field label="Password" error={state.error ?? undefined}>
              {(control) => (
                <Input
                  {...control}
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  required
                  placeholder="••••••••"
                />
              )}
            </Field>
            <Button type="submit" variant="primary" size="md" className="w-full" loading={pending}>
              Open the evidence room
            </Button>
          </form>
        </div>

        <p className="mt-5 px-1 text-[11.5px] leading-relaxed text-ink-muted">{NEUTRALITY_DISCLAIMER}</p>
      </div>
    </main>
  )
}
