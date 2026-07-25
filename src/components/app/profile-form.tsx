'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import {
  Button,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from '@/components/ui'
import { USER_ROLES, USER_ROLE_LABELS, type UserRole } from '@/lib/domain'
import { updateProfile } from '@/server/actions/account'

export function ProfileForm({
  displayName,
  role,
  primaryUseCase,
}: {
  displayName: string
  role: string
  primaryUseCase: string
}) {
  const router = useRouter()
  const [name, setName] = React.useState(displayName)
  const [selectedRole, setSelectedRole] = React.useState<UserRole>(
    (USER_ROLES as readonly string[]).includes(role) ? (role as UserRole) : 'investigator',
  )
  const [useCase, setUseCase] = React.useState(primaryUseCase)
  const [pending, setPending] = React.useState(false)
  const [fields, setFields] = React.useState<Record<string, string>>({})

  const dirty =
    name !== displayName || selectedRole !== role || useCase !== primaryUseCase

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setFields({})
    const result = await updateProfile({
      displayName: name,
      role: selectedRole,
      primaryUseCase: useCase,
    })
    setPending(false)
    if (!result.ok) {
      setFields(result.fields ?? {})
      toast.error(result.error)
      return
    }
    toast.success('Profile updated.')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field label="Name" required error={fields.displayName}>
        <Input
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <Field
        label="Role"
        error={fields.role}
        description="Used to phrase suggested case objectives. It is never shown outside your workspace."
      >
        {(control) => (
          <Select
            value={selectedRole}
            onValueChange={(value) => setSelectedRole(value as UserRole)}
          >
            <SelectTrigger id={control.id} aria-describedby={control['aria-describedby']}>
              <SelectValue>{USER_ROLE_LABELS[selectedRole]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {USER_ROLES.map((value) => (
                <SelectItem key={value} value={value}>
                  {USER_ROLE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      <Field label="Primary use case" hint="Optional" error={fields.primaryUseCase}>
        <Textarea
          rows={3}
          maxLength={400}
          value={useCase}
          onChange={(event) => setUseCase(event.target.value)}
          placeholder="A short description of the records you usually work with."
        />
      </Field>

      <div>
        <Button type="submit" variant="primary" loading={pending} disabled={!dirty}>
          Save changes
        </Button>
        {!dirty ? (
          <p className="mt-2 text-xs text-ink-muted">Nothing has changed yet.</p>
        ) : null}
      </div>
    </form>
  )
}
