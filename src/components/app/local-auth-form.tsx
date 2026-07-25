'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { TerminalSquare } from 'lucide-react'

import { Button, Field, Input, toast } from '@/components/ui'
import { localSignIn } from '@/server/actions/account'

/**
 * Local development sign-in.
 *
 * This is not authentication. It writes a cookie describing who you say you
 * are, so the product can be exercised end-to-end without credentials. The
 * notice above the form says exactly that, in the product, every time.
 */
export function LocalAuthForm({ redirectTo = '/app' }: { redirectTo?: string }) {
  const router = useRouter()
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const [fields, setFields] = React.useState<Record<string, string>>({})

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setFields({})
    const result = await localSignIn({ name, email })
    if (!result.ok) {
      setFields(result.fields ?? {})
      toast.error(result.error)
      setPending(false)
      return
    }
    toast.success('Signed in locally.')
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div>
      <div className="flex gap-2.5 rounded-panel border border-line bg-canvas p-3">
        <TerminalSquare className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-ink-secondary">
          <span className="font-medium text-ink">Local development mode</span> — Clerk is not
          configured. Sessions are stored in a local cookie on this machine.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4" noValidate>
        <Field label="Name" error={fields.name} required>
          <Input
            name="name"
            autoComplete="name"
            placeholder="Dana Okafor"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <Field label="Email" error={fields.email} required>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.org"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Button type="submit" variant="primary" size="lg" loading={pending} className="w-full">
          Continue
        </Button>
      </form>

      <p className="mt-4 text-xs leading-relaxed text-ink-muted">
        No password is set and none is checked. Entering the same email again returns you to the same
        workspace.
      </p>
    </div>
  )
}
