'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Archive,
  Keyboard,
  Layers,
  MessageSquareText,
  MoreHorizontal,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Share2,
  Trash2,
} from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Progress,
  toast,
} from '@/components/ui'
import { DEMO_BANNER } from '@/lib/domain'
import { buildCaseMap, deleteCase, updateCase } from '@/server/actions/cases'
import { cn } from '@/lib/utils'
import { useWorkspace } from './workspace-context'

export interface CaseToolbarProps {
  caseId: string
  title: string
  isDemo: boolean
  isArchived: boolean
  canWrite: boolean
  sourceCount: number
}

export function CaseToolbar({
  caseId,
  title,
  isDemo,
  isArchived,
  canWrite,
  sourceCount,
}: CaseToolbarProps) {
  const router = useRouter()
  const { setRailOpen, openCopilot, setShortcutsOpen, panelCollapsed, setPanelCollapsed } =
    useWorkspace()

  const [draftTitle, setDraftTitle] = React.useState(title)
  const [committedTitle, setCommittedTitle] = React.useState(title)
  const [editing, setEditing] = React.useState(false)
  const [building, setBuilding] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const titleRef = React.useRef<HTMLInputElement>(null)

  // Adjusting during render (rather than in an effect) keeps the input in step
  // with a title changed elsewhere without an extra commit-and-repaint pass.
  if (committedTitle !== title) {
    setCommittedTitle(title)
    setDraftTitle(title)
  }

  async function commitTitle() {
    setEditing(false)
    const next = draftTitle.trim()
    if (next === title) return
    if (next.length < 3) {
      setDraftTitle(title)
      toast.error('Give the case a title of at least 3 characters.')
      return
    }
    const result = await updateCase({ caseId, title: next })
    if (!result.ok) {
      setDraftTitle(title)
      toast.error(result.error)
      return
    }
    toast.success('Case renamed.')
    router.refresh()
  }

  async function runBuild() {
    setBuilding(true)
    const result = await buildCaseMap(caseId)
    setBuilding(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    const { discrepancies, relationships } = result.data
    toast.success(
      `Case map built — ${discrepancies} discrepanc${discrepancies === 1 ? 'y' : 'ies'} and ${relationships} relationship${relationships === 1 ? '' : 's'} recorded.`,
    )
    router.refresh()
  }

  async function archive() {
    const result = await updateCase({ caseId, status: isArchived ? 'active' : 'archived' })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(isArchived ? 'Case reopened.' : 'Case archived. Nothing was deleted.')
    router.refresh()
  }

  async function remove() {
    setDeleting(true)
    const result = await deleteCase(caseId)
    setDeleting(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setConfirmDelete(false)
    toast.success('Case deleted.')
    router.push('/app')
  }

  return (
    <div className="shrink-0 border-b border-line bg-canvas">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setRailOpen(true)}
          aria-label="Open source list"
        >
          <Layers />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          {editing ? (
            <input
              ref={titleRef}
              value={draftTitle}
              autoFocus
              onChange={(event) => setDraftTitle(event.target.value)}
              onBlur={() => void commitTitle()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void commitTitle()
                }
                if (event.key === 'Escape') {
                  setDraftTitle(title)
                  setEditing(false)
                }
              }}
              aria-label="Case title"
              className="min-w-0 flex-1 rounded-control border border-evidence-border bg-canvas px-2 py-1 text-[15px] font-medium text-ink outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => canWrite && setEditing(true)}
              disabled={!canWrite}
              title={canWrite ? 'Rename this case' : 'You have read-only access to this case.'}
              className={cn(
                'min-w-0 truncate rounded-control px-2 py-1 text-left text-[15px] font-medium text-ink',
                canWrite && 'hover:bg-surface',
              )}
            >
              {title}
            </button>
          )}

          {/* Below 2xl the demo notice moves to its own strip so the title keeps
              its width — it is never hidden, only relocated. */}
          {isDemo ? (
            <Badge variant="signal" className="hidden shrink-0 2xl:inline-flex">
              {DEMO_BANNER}
            </Badge>
          ) : null}
          {isArchived ? (
            <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
              Archived
            </Badge>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            className="hidden sm:inline-flex"
            loading={building}
            disabled={!canWrite || sourceCount === 0}
            title={
              sourceCount === 0
                ? 'Add at least one record before building the case map.'
                : canWrite
                  ? 'Find relationships, contradictions and a case summary across every record.'
                  : 'You have read-only access to this case.'
            }
            onClick={() => void runBuild()}
          >
            {building ? 'Building…' : 'Build case map'}
          </Button>

          <Button variant="ghost" size="icon" asChild title="Share as an evidence room">
            <Link href={`/app/cases/${caseId}/brief#evidence-room`} aria-label="Share this case">
              <Share2 />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="xl:hidden"
            onClick={openCopilot}
            aria-label="Ask the case copilot"
            title="Ask the case copilot"
          >
            <MessageSquareText />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="hidden xl:inline-flex"
            onClick={() => setPanelCollapsed(!panelCollapsed)}
            aria-label={panelCollapsed ? 'Show context panel' : 'Hide context panel'}
            title={panelCollapsed ? 'Show context panel' : 'Hide context panel'}
          >
            {panelCollapsed ? <PanelRightOpen /> : <PanelRightClose />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More case actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Case</DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  setEditing(true)
                  window.setTimeout(() => titleRef.current?.focus(), 0)
                }}
                disabled={!canWrite}
              >
                <Pencil />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/app/cases/${caseId}/activity`}>Activity log</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  setShortcutsOpen(true)
                }}
              >
                <Keyboard />
                Keyboard shortcuts
              </DropdownMenuItem>
              <DropdownMenuItem
                className="sm:hidden"
                disabled={!canWrite || sourceCount === 0}
                onSelect={(event) => {
                  event.preventDefault()
                  void runBuild()
                }}
              >
                Build case map
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!canWrite}
                onSelect={(event) => {
                  event.preventDefault()
                  void archive()
                }}
              >
                <Archive />
                {isArchived ? 'Reopen case' : 'Archive case'}
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                disabled={!canWrite}
                onSelect={(event) => {
                  event.preventDefault()
                  setConfirmDelete(true)
                }}
              >
                <Trash2 />
                Delete case
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {building ? (
        <div className="px-3 pb-2 sm:px-4">
          <Progress value={null} aria-label="Building the case map" />
          <p className="mt-1 text-[11px] text-ink-secondary">
            Comparing every record against every other record. This runs across the whole case.
          </p>
        </div>
      ) : null}

      {isDemo ? (
        <p className="flex items-center gap-1.5 border-t border-line bg-signal-soft px-3 py-1 text-[11px] text-ink 2xl:hidden">
          <span className="inline-block size-1.5 rounded-full bg-signal" aria-hidden="true" />
          {DEMO_BANNER}
        </p>
      ) : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the case, its {sourceCount} record{sourceCount === 1 ? '' : 's'}, every
              claim, event, discrepancy and citation built from them. It cannot be undone. If you
              only want it out of the way, archive it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the case</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void remove()
              }}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
