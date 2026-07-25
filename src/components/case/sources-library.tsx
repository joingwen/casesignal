'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { LayoutGrid, List, MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react'

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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  Field,
  Input,
  ProcessingStatusChip,
  Switch,
  toast,
} from '@/components/ui'
import { PROCESSING_STATUS_META, SOURCE_FORMAT_LABELS } from '@/lib/domain'
import type { SourceListItem } from '@/server/queries/case-detail'
import { deleteSource, renameSource, retrySource, setSourceShared } from '@/server/actions/sources'
import { cn, formatBytes, formatDate, pluralize } from '@/lib/utils'
import { AddSourceButton } from './add-source-button'
import { SourceFormatIcon } from './source-icon'
import { useWorkspace } from './workspace-context'

function ConfidenceNote({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-ink-muted">Extraction confidence not recorded</span>
  }
  const pct = Math.round(value * 100)
  const low = value < 0.5
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs',
        low ? 'text-signal' : 'text-ink-secondary',
      )}
    >
      {low ? <span className="inline-block size-1.5 rounded-full bg-signal" aria-hidden="true" /> : null}
      <span className="tabular">Extraction confidence {pct}%</span>
      {low ? <span>— check this record against the original before relying on it</span> : null}
    </span>
  )
}

export function SourcesLibrary({
  caseId,
  sources,
  canWrite,
}: {
  caseId: string
  sources: SourceListItem[]
  canWrite: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAddSourceOpen } = useWorkspace()

  const [view, setView] = React.useState<'list' | 'grid'>('list')
  const [shared, setShared] = React.useState<Record<string, boolean>>({})
  const [renaming, setRenaming] = React.useState<SourceListItem | null>(null)
  const [renameValue, setRenameValue] = React.useState('')
  const [deleting, setDeleting] = React.useState<SourceListItem | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  // `?add=1` opens the add-source dialog, so links and empty states can deep-link into it.
  const addParam = searchParams.get('add')
  React.useEffect(() => {
    if (addParam === '1') setAddSourceOpen(true)
  }, [addParam, setAddSourceOpen])

  function isShared(source: SourceListItem) {
    return shared[source.id] ?? source.includedInShare
  }

  async function toggleShare(source: SourceListItem, next: boolean) {
    setShared((current) => ({ ...current, [source.id]: next }))
    const result = await setSourceShared(source.id, next)
    if (!result.ok) {
      setShared((current) => ({ ...current, [source.id]: !next }))
      toast.error(result.error)
      return
    }
    toast.success(
      next
        ? `${source.label} will appear in the evidence room.`
        : `${source.label} is excluded from the evidence room.`,
    )
    router.refresh()
  }

  async function retry(source: SourceListItem) {
    setBusyId(source.id)
    const result = await retrySource(source.id)
    setBusyId(null)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`${source.label} re-queued (${PROCESSING_STATUS_META[
      result.data.status as keyof typeof PROCESSING_STATUS_META
    ]?.label ?? result.data.status}).`)
    router.refresh()
  }

  async function commitRename() {
    if (!renaming) return
    setBusyId(renaming.id)
    const result = await renameSource({ sourceId: renaming.id, title: renameValue.trim() })
    setBusyId(null)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Record renamed.')
    setRenaming(null)
    router.refresh()
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusyId(deleting.id)
    const result = await deleteSource(deleting.id)
    setBusyId(null)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`${deleting.label} removed along with its citations.`)
    setDeleting(null)
    router.refresh()
  }

  if (sources.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <div className="panel">
          <EmptyState
            title="No records in this case"
            description="Upload a document or spreadsheet, capture a webpage, paste a transcript, or write a note. Each record is indexed into citable excerpts before anything is analysed."
            action={<AddSourceButton variant="primary">Add your first record</AddSourceButton>}
            footnote="PDF, DOCX, TXT, Markdown, CSV, XLSX and images up to 25 MB."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[15px] font-medium text-ink">Source library</h1>
          <p className="mt-0.5 text-xs text-ink-secondary">
            {pluralize(sources.length, 'record')} ·{' '}
            {sources.reduce((total, source) => total + source.evidenceCount, 0)} citations across the
            case
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-control border border-line" role="group" aria-label="Layout">
            <button
              type="button"
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
              aria-label="List view"
              className={cn(
                'flex size-8 items-center justify-center rounded-l-control',
                view === 'list' ? 'bg-evidence-soft text-evidence-deep' : 'text-ink-secondary hover:bg-surface',
              )}
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('grid')}
              aria-pressed={view === 'grid'}
              aria-label="Grid view"
              className={cn(
                'flex size-8 items-center justify-center rounded-r-control border-l border-line',
                view === 'grid' ? 'bg-evidence-soft text-evidence-deep' : 'text-ink-secondary hover:bg-surface',
              )}
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>
          <AddSourceButton variant="primary" size="sm">
            Add source
          </AddSourceButton>
        </div>
      </div>

      <ul
        className={cn(
          view === 'grid'
            ? 'grid gap-4 sm:grid-cols-2'
            : 'divide-y divide-line overflow-hidden rounded-panel border border-line bg-canvas',
        )}
      >
        {sources.map((source) => {
          const retryable = source.status === 'failed' || source.status === 'needs_review'
          return (
            <li
              key={source.id}
              className={cn(view === 'grid' ? 'panel p-4' : 'px-4 py-3.5', 'min-w-0')}
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <SourceFormatIcon format={source.format} className="mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-ink-muted">{source.label}</span>
                    <Link
                      href={`/app/cases/${caseId}/sources/${source.id}`}
                      className="min-w-0 truncate text-sm font-medium text-ink hover:text-evidence-deep"
                    >
                      {source.title}
                    </Link>
                    {source.status === 'complete' ? null : (
                      <ProcessingStatusChip status={source.status} size="sm" />
                    )}
                  </div>

                  <p className="mt-1 text-xs text-ink-secondary tabular">
                    {SOURCE_FORMAT_LABELS[source.format]}
                    {source.pageCount > 0 ? ` · ${pluralize(source.pageCount, 'page')}` : ''}
                    {source.wordCount > 0 ? ` · ${source.wordCount.toLocaleString()} words` : ''}
                    {source.byteSize > 0 ? ` · ${formatBytes(source.byteSize)}` : ''}
                    {` · ${pluralize(source.evidenceCount, 'citation')}`}
                    {` · added ${formatDate(source.createdAt)}`}
                  </p>

                  <p className="mt-1">
                    <ConfidenceNote value={source.extractionConfidence} />
                  </p>

                  {source.status === 'failed' && source.statusDetail ? (
                    <p className="mt-1.5 text-xs text-status-contradicted">{source.statusDetail}</p>
                  ) : null}

                  {source.summary ? (
                    <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-secondary">
                      {source.summary}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {retryable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!canWrite || busyId === source.id}
                      onClick={() => void retry(source)}
                      title="Run extraction and indexing again"
                    >
                      <RotateCcw />
                      Retry
                    </Button>
                  ) : null}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Actions for ${source.label}`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/app/cases/${caseId}/sources/${source.id}`}>Open record</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!canWrite}
                        onSelect={(event) => {
                          event.preventDefault()
                          setRenaming(source)
                          setRenameValue(source.title)
                        }}
                      >
                        <Pencil />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        destructive
                        disabled={!canWrite}
                        onSelect={(event) => {
                          event.preventDefault()
                          setDeleting(source)
                        }}
                      >
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-line pt-2.5">
                <Switch
                  id={`share-${source.id}`}
                  checked={isShared(source)}
                  disabled={!canWrite}
                  onCheckedChange={(next) => void toggleShare(source, next)}
                />
                <label htmlFor={`share-${source.id}`} className="text-xs text-ink-secondary">
                  Include in the evidence room
                </label>
              </div>
            </li>
          )
        })}
      </ul>

      {/* --------------------------------------------------------- rename */}
      <Dialog open={Boolean(renaming)} onOpenChange={(open) => (open ? null : setRenaming(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {renaming?.label}</DialogTitle>
          </DialogHeader>
          <Field label="Title" required>
            <Input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void commitRename()
              }}
            />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={renameValue.trim().length < 2 || busyId === renaming?.id}
              onClick={() => void commitRename()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --------------------------------------------------------- delete */}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => (open ? null : setDeleting(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” and its extracted excerpts will be removed. Every citation to it —{' '}
              {deleting ? pluralize(deleting.evidenceCount, 'citation') : 'none'} across claims,
              events and discrepancies — will be removed with it, and any claim left without
              evidence will fall back to unresolved. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the record</AlertDialogCancel>
            <AlertDialogAction
              disabled={busyId === deleting?.id}
              onClick={(event) => {
                event.preventDefault()
                void confirmDelete()
              }}
            >
              Delete record and citations
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
