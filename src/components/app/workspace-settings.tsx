'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Field,
  Input,
  toast,
} from '@/components/ui'
import { pluralize } from '@/lib/utils'
import { deleteAllCases, updateWorkspace } from '@/server/actions/account'

export function WorkspaceNameForm({ name, readOnly }: { name: string; readOnly: boolean }) {
  const router = useRouter()
  const [value, setValue] = React.useState(name)
  const [pending, setPending] = React.useState(false)
  const [fieldError, setFieldError] = React.useState<string | undefined>()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setFieldError(undefined)
    const result = await updateWorkspace({ name: value })
    setPending(false)
    if (!result.ok) {
      setFieldError(result.fields?.name)
      toast.error(result.error)
      return
    }
    toast.success('Workspace name updated.')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field
        label="Workspace name"
        required
        error={fieldError}
        description={
          readOnly
            ? 'You have read-only access to this workspace, so the name cannot be changed here.'
            : 'Shown in the sidebar and on exported briefs.'
        }
      >
        <Input
          value={value}
          disabled={readOnly}
          onChange={(event) => setValue(event.target.value)}
        />
      </Field>

      <div>
        <Button
          type="submit"
          variant="primary"
          loading={pending}
          disabled={readOnly || value.trim() === name.trim()}
        >
          Save name
        </Button>
      </div>
    </form>
  )
}

export function DeleteAllCases({ caseCount }: { caseCount: number }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [confirmation, setConfirmation] = React.useState('')
  const [pending, setPending] = React.useState(false)

  async function onConfirm() {
    setPending(true)
    const result = await deleteAllCases(confirmation)
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setOpen(false)
    setConfirmation('')
    toast.success(`Deleted ${pluralize(result.data.deleted, 'case')}.`)
    router.refresh()
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setConfirmation('')
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="danger" disabled={caseCount === 0}>
          Delete all cases
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete every case in this workspace?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes {pluralize(caseCount, 'case')}, every uploaded record, every
            extracted excerpt and all derived analysis. Public evidence rooms stop resolving. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Field
          label="Type DELETE to confirm"
          className="mt-2"
          description="Exact, uppercase."
        >
          <Input
            value={confirmation}
            autoComplete="off"
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </Field>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="danger"
            disabled={confirmation !== 'DELETE' || pending}
            onClick={(event) => {
              event.preventDefault()
              void onConfirm()
            }}
          >
            {pending ? 'Deleting…' : 'Delete all cases'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
