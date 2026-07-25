'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, Check, ExternalLink, GitMerge, Loader2, Plus, X } from 'lucide-react'

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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EvidenceRoleChip,
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
import {
  CLAIM_CATEGORIES,
  CLAIM_CATEGORY_LABELS,
  CLAIM_STATUSES,
  CLAIM_STATUS_META,
  EVIDENCE_ROLES,
  EVIDENCE_ROLE_META,
  MATERIALITY_LEVELS,
  REVIEW_STATES,
  REVIEW_STATE_META,
  type ClaimCategory,
  type ClaimStatus,
  type EvidenceRole,
  type Materiality,
  type ReviewState,
} from '@/lib/domain'
import type { ClaimView } from '@/server/queries/case-detail'
import {
  addClaimEvidence,
  archiveClaim,
  mergeClaims,
  removeClaimEvidence,
  updateClaim,
} from '@/server/actions/claims'
import { cn, formatRelative, truncate } from '@/lib/utils'

export interface ChunkIndexItem {
  id: string
  sourceId: string
  sourceLabel: string
  sourceTitle: string
  locator: string
  text: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px]',
        state === 'error' ? 'text-status-contradicted' : 'text-ink-muted',
      )}
      role="status"
    >
      {state === 'saving' ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : null}
      {state === 'saved' ? <Check className="size-3" aria-hidden="true" /> : null}
      {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Not saved'}
    </span>
  )
}

export interface ClaimDetailProps {
  caseId: string
  claim: ClaimView
  otherClaims: ClaimView[]
  chunkIndex: ChunkIndexItem[]
  canWrite: boolean
  onClose: () => void
}

export function ClaimDetail({
  caseId,
  claim,
  otherClaims,
  chunkIndex,
  canWrite,
  onClose,
}: ClaimDetailProps) {
  const router = useRouter()

  const [statement, setStatement] = React.useState(claim.statement)
  const [notes, setNotes] = React.useState(claim.analystNotes)
  const [status, setStatus] = React.useState<ClaimStatus>(claim.status)
  const [overridden, setOverridden] = React.useState(claim.statusOverridden)
  const [materiality, setMateriality] = React.useState<Materiality>(claim.materiality)
  const [reviewState, setReviewState] = React.useState<ReviewState>(claim.reviewState)
  const [category, setCategory] = React.useState<string>(claim.category)

  const [statementState, setStatementState] = React.useState<SaveState>('idle')
  const [notesState, setNotesState] = React.useState<SaveState>('idle')

  const [removing, setRemoving] = React.useState<ClaimView['evidence'][number] | null>(null)
  const [archiving, setArchiving] = React.useState(false)
  const [mergeOpen, setMergeOpen] = React.useState(false)
  const [mergeTarget, setMergeTarget] = React.useState('')
  const [mergeQuery, setMergeQuery] = React.useState('')
  const [addOpen, setAddOpen] = React.useState(false)
  const [addRole, setAddRole] = React.useState<EvidenceRole>('supporting')
  const [addQuery, setAddQuery] = React.useState('')
  const [addSelection, setAddSelection] = React.useState<string[]>([])
  const [pending, setPending] = React.useState(false)

  // When a different claim is selected the editors are re-seeded during render.
  // Keying on the id (not the whole object) means a background refresh never
  // overwrites text the analyst is still typing.
  const [loadedClaimId, setLoadedClaimId] = React.useState(claim.id)
  if (loadedClaimId !== claim.id) {
    setLoadedClaimId(claim.id)
    setStatement(claim.statement)
    setNotes(claim.analystNotes)
    setStatus(claim.status)
    setOverridden(claim.statusOverridden)
    setMateriality(claim.materiality)
    setReviewState(claim.reviewState)
    setCategory(claim.category)
    setStatementState('idle')
    setNotesState('idle')
  }

  /* --------------------------------------------------- debounced autosave */
  const savedStatement = React.useRef(claim.statement)
  const savedNotes = React.useRef(claim.analystNotes)

  React.useEffect(() => {
    savedStatement.current = claim.statement
    savedNotes.current = claim.analystNotes
  }, [claim.id, claim.statement, claim.analystNotes])

  React.useEffect(() => {
    if (!canWrite || statement === savedStatement.current) return
    if (statement.trim().length < 8) return
    const timer = window.setTimeout(async () => {
      setStatementState('saving')
      const result = await updateClaim({ caseId, claimId: claim.id, statement: statement.trim() })
      if (!result.ok) {
        setStatementState('error')
        toast.error(result.error)
        return
      }
      savedStatement.current = statement
      setStatementState('saved')
      router.refresh()
    }, 900)
    return () => window.clearTimeout(timer)
  }, [statement, caseId, claim.id, canWrite, router])

  React.useEffect(() => {
    if (!canWrite || notes === savedNotes.current) return
    const timer = window.setTimeout(async () => {
      setNotesState('saving')
      const result = await updateClaim({ caseId, claimId: claim.id, analystNotes: notes })
      if (!result.ok) {
        setNotesState('error')
        toast.error(result.error)
        return
      }
      savedNotes.current = notes
      setNotesState('saved')
      router.refresh()
    }, 900)
    return () => window.clearTimeout(timer)
  }, [notes, caseId, claim.id, canWrite, router])

  /* ----------------------------------------------------------- mutations */
  async function patch(
    input: Partial<{
      status: ClaimStatus
      materiality: Materiality
      reviewState: ReviewState
      category: ClaimCategory
    }>,
    message: string,
  ) {
    const result = await updateClaim({ caseId, claimId: claim.id, ...input })
    if (!result.ok) {
      toast.error(result.error)
      // Roll the optimistic value back to what the server last confirmed.
      setStatus(claim.status)
      setMateriality(claim.materiality)
      setReviewState(claim.reviewState)
      setCategory(claim.category)
      return
    }
    toast.success(message)
    router.refresh()
  }

  async function removeEvidence() {
    if (!removing) return
    setPending(true)
    const result = await removeClaimEvidence(caseId, removing.id)
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Citation removed. The claim status was recalculated from what remains.')
    setRemoving(null)
    router.refresh()
  }

  async function doArchive() {
    setPending(true)
    const result = await archiveClaim(caseId, claim.id)
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Claim archived.')
    setArchiving(false)
    onClose()
    router.refresh()
  }

  async function doMerge() {
    if (!mergeTarget) return
    setPending(true)
    const result = await mergeClaims(caseId, mergeTarget, claim.id)
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Claims merged. Citations from both are now on the surviving claim.')
    setMergeOpen(false)
    onClose()
    router.refresh()
  }

  async function doAddEvidence() {
    if (addSelection.length === 0) return
    setPending(true)
    const result = await addClaimEvidence({
      caseId,
      claimId: claim.id,
      chunkIds: addSelection,
      role: addRole,
    })
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(
      `${addSelection.length} excerpt${addSelection.length === 1 ? '' : 's'} cited as ${EVIDENCE_ROLE_META[addRole].label.toLowerCase()}.`,
    )
    setAddSelection([])
    setAddOpen(false)
    router.refresh()
  }

  const grouped = EVIDENCE_ROLES.map((role) => ({
    role,
    items: claim.evidence.filter((item) => item.role === role),
  })).filter((group) => group.items.length > 0)

  const alreadyCited = new Set(claim.evidence.map((item) => item.chunkId))
  const addCandidates = chunkIndex
    .filter((chunk) => !alreadyCited.has(chunk.id))
    .filter((chunk) => {
      const q = addQuery.trim().toLowerCase()
      if (!q) return true
      return (
        chunk.text.toLowerCase().includes(q) ||
        chunk.sourceTitle.toLowerCase().includes(q) ||
        chunk.sourceLabel.toLowerCase().includes(q)
      )
    })
    .slice(0, 40)

  const mergeCandidates = otherClaims.filter((other) => {
    const q = mergeQuery.trim().toLowerCase()
    return !q || other.statement.toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* ------------------------------------------------------- statement */}
      <Field
        label="Statement"
        hint={<SaveIndicator state={statementState} />}
        description="Written as one checkable sentence. Saved automatically."
      >
        <Textarea
          value={statement}
          rows={3}
          disabled={!canWrite}
          onChange={(event) => setStatement(event.target.value.slice(0, 400))}
          className="text-[13px]"
        />
      </Field>

      {/* ---------------------------------------------------------- status */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <Select
            value={status}
            disabled={!canWrite}
            onValueChange={(value) => {
              const next = value as ClaimStatus
              setStatus(next)
              setOverridden(true)
              void patch({ status: next }, `Status set to ${CLAIM_STATUS_META[next].label}.`)
            }}
          >
            <SelectTrigger className="h-8 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLAIM_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {CLAIM_STATUS_META[value].symbol} {CLAIM_STATUS_META[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Materiality">
          <Select
            value={materiality}
            disabled={!canWrite}
            onValueChange={(value) => {
              const next = value as Materiality
              setMateriality(next)
              void patch({ materiality: next }, `Materiality set to ${next}.`)
            }}
          >
            <SelectTrigger className="h-8 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATERIALITY_LEVELS.map((value) => (
                <SelectItem key={value} value={value}>
                  {value[0]!.toUpperCase() + value.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Review">
          <Select
            value={reviewState}
            disabled={!canWrite}
            onValueChange={(value) => {
              const next = value as ReviewState
              setReviewState(next)
              void patch({ reviewState: next }, `Marked ${REVIEW_STATE_META[next].label.toLowerCase()}.`)
            }}
          >
            <SelectTrigger className="h-8 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REVIEW_STATES.map((value) => (
                <SelectItem key={value} value={value}>
                  {REVIEW_STATE_META[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Category">
          <Select
            value={category}
            disabled={!canWrite}
            onValueChange={(value) => {
              setCategory(value)
              void patch(
                { category: value as ClaimCategory },
                `Category set to ${CLAIM_CATEGORY_LABELS[value as ClaimCategory]}.`,
              )
            }}
          >
            <SelectTrigger className="h-8 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLAIM_CATEGORIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {CLAIM_CATEGORY_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <p className="text-[11px] leading-relaxed text-ink-secondary">
        {overridden
          ? 'Status set by analyst — it will no longer follow the cited evidence automatically.'
          : 'Status is derived from the cited evidence. Changing it records an analyst override.'}
      </p>

      {/* -------------------------------------------------------- evidence */}
      <section>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-medium text-ink">
            Evidence
            <span className="ml-2 font-mono text-[11px] text-ink-muted">
              {EVIDENCE_ROLE_META.supporting.symbol}
              {claim.counts.supporting} {EVIDENCE_ROLE_META.contradicting.symbol}
              {claim.counts.contradicting}
            </span>
          </h3>
          <Button
            variant="ghost"
            size="sm"
            disabled={!canWrite || chunkIndex.length === 0}
            onClick={() => setAddOpen(true)}
            title={chunkIndex.length === 0 ? 'No indexed excerpts are available yet.' : undefined}
          >
            <Plus />
            Cite excerpt
          </Button>
        </div>

        {grouped.length === 0 ? (
          <p className="mt-2 rounded-panel border border-line bg-page px-3 py-2 text-[13px] leading-relaxed text-ink-secondary">
            No excerpt is cited for this claim, so nothing in the record supports or contradicts it
            yet.
          </p>
        ) : (
          <div className="mt-2 space-y-4">
            {grouped.map((group) => (
              <div key={group.role}>
                <EvidenceRoleChip role={group.role} size="sm" />
                <ul className="mt-2 space-y-3">
                  {group.items.map((item) => (
                    <li key={item.id} className="rounded-panel border border-line px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] text-ink-muted">
                            {item.sourceLabel}
                            {item.locator ? ` · ${item.locator}` : ''}
                          </p>
                          <p className="truncate text-[12px] text-ink-secondary">{item.sourceTitle}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!canWrite}
                          aria-label="Remove this citation"
                          onClick={() => setRemoving(item)}
                        >
                          <X />
                        </Button>
                      </div>

                      <blockquote
                        className={cn(
                          'mt-2 border-l-2 pl-3 text-[13px] leading-relaxed text-ink-secondary',
                          item.role === 'contradicting'
                            ? 'border-status-contradicted/40'
                            : 'border-evidence-border',
                        )}
                      >
                        {item.excerpt}
                      </blockquote>

                      {item.note ? (
                        <p className="mt-1.5 text-[12px] text-ink-muted">{item.note}</p>
                      ) : null}

                      <Link
                        href={`/app/cases/${caseId}/sources/${item.sourceId}?chunk=${item.chunkId}`}
                        className="mt-2 inline-flex items-center gap-1 text-[12px] text-evidence-deep hover:underline"
                      >
                        Open in source
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ----------------------------------------------------------- notes */}
      <Field label="Analyst notes" hint={<SaveIndicator state={notesState} />}>
        <Textarea
          value={notes}
          rows={4}
          disabled={!canWrite}
          placeholder="What you checked, what remains open, which record would settle it."
          onChange={(event) => setNotes(event.target.value.slice(0, 4000))}
          className="text-[13px]"
        />
      </Field>

      <p className="text-[11px] text-ink-muted">Last updated {formatRelative(claim.updatedAt)}.</p>

      {/* --------------------------------------------------------- actions */}
      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canWrite || otherClaims.length === 0}
          onClick={() => setMergeOpen(true)}
          title={otherClaims.length === 0 ? 'There is no other claim to merge into.' : undefined}
        >
          <GitMerge />
          Merge into…
        </Button>
        <Button variant="ghost" size="sm" disabled={!canWrite} onClick={() => setArchiving(true)}>
          <Archive />
          Archive
        </Button>
      </div>

      {/* ------------------------------------------------- remove evidence */}
      <AlertDialog open={Boolean(removing)} onOpenChange={(open) => (open ? null : setRemoving(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this citation?</AlertDialogTitle>
            <AlertDialogDescription>
              The excerpt from {removing?.sourceLabel} {removing?.locator} will no longer back this
              claim, and the claim status will be recalculated from the citations that remain. The
              record itself is not touched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                void removeEvidence()
              }}
            >
              Remove citation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---------------------------------------------------------- archive */}
      <AlertDialog open={archiving} onOpenChange={setArchiving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this claim?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from the ledger, the brief and the evidence room. Its citations are
              kept, so it can be restored from the activity log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                void doArchive()
              }}
            >
              Archive claim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ------------------------------------------------------------ merge */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Merge into another claim</DialogTitle>
            <DialogDescription>
              This claim&rsquo;s citations move to the claim you choose, and this one is archived.
              Pick the claim that should survive.
            </DialogDescription>
          </DialogHeader>
          <Field label="Find a claim">
            <Input
              value={mergeQuery}
              onChange={(event) => setMergeQuery(event.target.value)}
              placeholder="Filter by statement"
            />
          </Field>
          <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto scrollbar-slim">
            {mergeCandidates.map((other) => (
              <li key={other.id}>
                <button
                  type="button"
                  onClick={() => setMergeTarget(other.id)}
                  aria-pressed={mergeTarget === other.id}
                  className={cn(
                    'w-full rounded-control border px-3 py-2 text-left text-[13px] leading-snug',
                    mergeTarget === other.id
                      ? 'border-evidence bg-evidence-soft text-ink'
                      : 'border-line text-ink-secondary hover:bg-surface',
                  )}
                >
                  {other.statement}
                </button>
              </li>
            ))}
            {mergeCandidates.length === 0 ? (
              <li className="px-3 py-2 text-[13px] text-ink-muted">No claim matches that filter.</li>
            ) : null}
          </ul>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMergeOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!mergeTarget || pending}
              onClick={() => void doMerge()}
            >
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------- add evidence */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cite an excerpt</DialogTitle>
            <DialogDescription>
              Choose one or more indexed excerpts from this case&rsquo;s records and say how they
              relate to the claim.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <Field label="Search excerpts">
              <Input
                value={addQuery}
                onChange={(event) => setAddQuery(event.target.value)}
                placeholder="Filter by text or record"
              />
            </Field>
            <Field label="Role">
              <Select value={addRole} onValueChange={(value) => setAddRole(value as EvidenceRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {EVIDENCE_ROLE_META[role].symbol} {EVIDENCE_ROLE_META[role].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto scrollbar-slim">
            {addCandidates.map((chunk) => {
              const selected = addSelection.includes(chunk.id)
              return (
                <li key={chunk.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setAddSelection((current) =>
                        current.includes(chunk.id)
                          ? current.filter((id) => id !== chunk.id)
                          : [...current, chunk.id],
                      )
                    }
                    className={cn(
                      'w-full rounded-control border px-3 py-2 text-left',
                      selected ? 'border-evidence bg-evidence-soft' : 'border-line hover:bg-surface',
                    )}
                  >
                    <span className="block font-mono text-[11px] text-ink-muted">
                      {chunk.sourceLabel}
                      {chunk.locator ? ` · ${chunk.locator}` : ''} — {chunk.sourceTitle}
                    </span>
                    <span className="mt-1 block text-[13px] leading-snug text-ink-secondary">
                      {truncate(chunk.text, 220)}
                    </span>
                  </button>
                </li>
              )
            })}
            {addCandidates.length === 0 ? (
              <li className="px-3 py-2 text-[13px] text-ink-muted">
                No excerpt matches that filter.
              </li>
            ) : null}
          </ul>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="evidence"
              disabled={addSelection.length === 0 || pending}
              onClick={() => void doAddEvidence()}
            >
              Cite {addSelection.length || ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
