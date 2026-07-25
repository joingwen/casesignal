'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, Globe, Lock } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Field,
  Input,
  Switch,
  toast,
} from '@/components/ui'
import type { ShareView } from '@/server/queries/case-detail'
import { revokeShare, upsertShare } from '@/server/actions/share'
import { cn } from '@/lib/utils'

type VisibilityKey =
  | 'showSources'
  | 'showTimeline'
  | 'showClaims'
  | 'showDiscrepancies'
  | 'showAnalystNotes'
  | 'allowDownloads'

const VISIBILITY: { key: VisibilityKey; label: string; description: string }[] = [
  {
    key: 'showSources',
    label: 'Source list',
    description: 'Only records you switched on in the source library appear.',
  },
  {
    key: 'showTimeline',
    label: 'Timeline',
    description: 'Only events marked for the evidence room appear.',
  },
  {
    key: 'showClaims',
    label: 'Claims',
    description: 'Only claims marked for the evidence room appear, with their status.',
  },
  {
    key: 'showDiscrepancies',
    label: 'Discrepancies',
    description: 'Only differences you switched on appear, with both excerpts.',
  },
  {
    key: 'showAnalystNotes',
    label: 'Analyst notes',
    description: 'Your working notes. Off by default — these are usually internal.',
  },
  {
    key: 'allowDownloads',
    label: 'Downloads',
    description: 'Lets readers download the original files of included records.',
  },
]

export function EvidenceRoomPanel({
  caseId,
  share,
  canWrite,
}: {
  caseId: string
  share: ShareView | null
  canWrite: boolean
}) {
  const router = useRouter()

  const [slug, setSlug] = React.useState(share?.slug ?? '')
  const [expiry, setExpiry] = React.useState(share?.expiresAt ? share.expiresAt.slice(0, 10) : '')
  const [password, setPassword] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [confirmRevoke, setConfirmRevoke] = React.useState(false)

  // Re-seed the editable fields when the stored share changes, during render.
  const serverKey = `${share?.slug ?? ''}|${share?.expiresAt ?? ''}`
  const [loadedKey, setLoadedKey] = React.useState(serverKey)
  if (loadedKey !== serverKey) {
    setLoadedKey(serverKey)
    setSlug(share?.slug ?? '')
    setExpiry(share?.expiresAt ? share.expiresAt.slice(0, 10) : '')
  }

  async function save(input: Parameters<typeof upsertShare>[0], message: string) {
    setPending(true)
    const result = await upsertShare(input)
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(message)
    router.refresh()
  }

  async function doRevoke() {
    setPending(true)
    const result = await revokeShare(caseId)
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setConfirmRevoke(false)
    toast.success('Evidence room revoked. The link no longer resolves.')
    router.refresh()
  }

  const enabled = share?.enabled ?? false

  return (
    <section id="evidence-room" className="panel overflow-hidden scroll-mt-4">
      <div className="border-b border-line px-5 py-3">
        <h2 className="text-[15px] font-medium text-ink">Evidence room</h2>
        <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-ink-secondary">
          A read-only page for people outside this case. Nothing here is public until you switch it
          on, and only the records, claims, events and discrepancies you explicitly included will
          appear — everything else stays inside the workspace.
        </p>
      </div>

      {/* ------------------------------------------------------ on/off state */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-3 border-b border-line px-5 py-3',
          enabled ? 'bg-evidence-soft' : 'bg-page',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex size-7 items-center justify-center rounded-full border',
            enabled
              ? 'border-evidence-border bg-canvas text-evidence-deep'
              : 'border-line bg-canvas text-ink-muted',
          )}
        >
          {enabled ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink">
            {enabled ? 'Published — anyone with the link can read it' : 'Not published'}
          </p>
          <p className="text-[11px] text-ink-secondary">
            {enabled
              ? `${share?.viewCount ?? 0} view${(share?.viewCount ?? 0) === 1 ? '' : 's'} so far.`
              : 'This case is visible only to your organization.'}
          </p>
        </div>
        <Switch
          checked={enabled}
          disabled={!canWrite || pending}
          aria-label="Publish the evidence room"
          onCheckedChange={(next) =>
            void save(
              { caseId, enabled: next },
              next ? 'Evidence room published.' : 'Evidence room switched off.',
            )
          }
        />
      </div>

      {/* --------------------------------------------------------- the link */}
      {share ? (
        <div className="border-b border-line px-5 py-3">
          <p className="text-[11px] uppercase tracking-wide text-ink-muted">Link</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-control border border-line bg-page px-2.5 py-1.5 font-mono text-[12px] text-ink">
              {share.url}
            </code>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(share.url)
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1600)
                  toast.success('Link copied.')
                } catch {
                  toast.error('Copying is blocked in this browser — select the link and copy it.')
                }
              }}
            >
              {copied ? <Check /> : <Copy />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          {!enabled ? (
            <p className="mt-1.5 text-[11px] text-ink-secondary">
              This link will not resolve until the evidence room is switched on.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* -------------------------------------------------------- settings */}
      <div className="grid gap-4 border-b border-line px-5 py-4 sm:grid-cols-3">
        <Field label="Link name" description="Letters, numbers and hyphens. At least 4 characters.">
          <div className="flex gap-2">
            <Input
              value={slug}
              disabled={!canWrite}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="northstar-procurement"
            />
            <Button
              variant="secondary"
              disabled={!canWrite || pending || slug.trim().length < 4 || slug === share?.slug}
              onClick={() => void save({ caseId, slug }, 'Link name updated.')}
            >
              Save
            </Button>
          </div>
        </Field>

        <Field label="Expires" description="After this date the link stops resolving.">
          <div className="flex gap-2">
            <Input
              type="date"
              value={expiry}
              disabled={!canWrite}
              onChange={(event) => setExpiry(event.target.value)}
            />
            <Button
              variant="secondary"
              disabled={!canWrite || pending}
              onClick={() =>
                void save(
                  { caseId, expiresAt: expiry ? new Date(`${expiry}T23:59:59Z`).toISOString() : null },
                  expiry ? 'Expiry date set.' : 'Expiry removed.',
                )
              }
            >
              {expiry ? 'Set' : 'Clear'}
            </Button>
          </div>
        </Field>

        <Field
          label="Password"
          description={
            share?.hasPassword
              ? 'A password is set. Enter a new one to replace it, or clear it.'
              : 'Optional. Readers must enter it before the page loads.'
          }
        >
          <div className="flex gap-2">
            <Input
              type="password"
              value={password}
              disabled={!canWrite}
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder={share?.hasPassword ? '••••••••' : 'No password'}
            />
            <Button
              variant="secondary"
              disabled={!canWrite || pending || (password.length === 0 && !share?.hasPassword)}
              onClick={() => {
                const next = password.length > 0 ? password : null
                setPassword('')
                void save({ caseId, password: next }, next ? 'Password set.' : 'Password removed.')
              }}
            >
              {password.length > 0 ? 'Set' : 'Clear'}
            </Button>
          </div>
        </Field>
      </div>

      {/* ------------------------------------------------------ visibility */}
      <div className="px-5 py-4">
        <h3 className="text-[13px] font-medium text-ink">What readers can see</h3>
        <ul className="mt-2 divide-y divide-line">
          {VISIBILITY.map((item) => (
            <li key={item.key} className="flex items-start gap-3 py-2.5">
              <Switch
                id={`vis-${item.key}`}
                checked={share ? share[item.key] : false}
                disabled={!canWrite || pending || !share}
                onCheckedChange={(next) =>
                  void save(
                    { caseId, [item.key]: next },
                    next ? `${item.label} shown to readers.` : `${item.label} hidden from readers.`,
                  )
                }
              />
              <div className="min-w-0">
                <label htmlFor={`vis-${item.key}`} className="text-[13px] text-ink">
                  {item.label}
                </label>
                <p className="text-[11px] leading-relaxed text-ink-secondary">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
        {!share ? (
          <p className="mt-2 text-[11px] text-ink-muted">
            Switch the evidence room on to choose what appears.
          </p>
        ) : null}

        {share ? (
          <div className="mt-4 border-t border-line pt-3">
            <Button
              variant="danger"
              size="sm"
              disabled={!canWrite || pending}
              onClick={() => setConfirmRevoke(true)}
            >
              Revoke this evidence room
            </Button>
          </div>
        ) : null}
      </div>

      <AlertDialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this evidence room?</AlertDialogTitle>
            <AlertDialogDescription>
              The link stops resolving immediately for everyone who has it, including anyone
              currently reading it. Your case, records and findings are not affected. Creating a new
              evidence room later will issue a new link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                void doRevoke()
              }}
            >
              Revoke link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
