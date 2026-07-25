'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'

import {
  Badge,
  Button,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  toast,
} from '@/components/ui'
import {
  DISCREPANCY_TYPE_LABELS,
  REVIEW_STATES,
  REVIEW_STATE_META,
  type ReviewState,
} from '@/lib/domain'
import type { DiscrepancyView } from '@/server/queries/case-detail'
import { updateDiscrepancy } from '@/server/actions/claims'
import { cn, percent } from '@/lib/utils'
import { CitationChip } from './citation-chip'
import { EvidenceExcerpt } from './evidence-excerpt'

function SideCell({
  caseId,
  side,
}: {
  caseId: string
  side: DiscrepancyView['sides'][number] | undefined
}) {
  if (!side) return <span className="text-[13px] text-ink-muted">Not recorded</span>
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[13px] font-medium text-ink tabular">{side.statedValue || '—'}</p>
      <CitationChip
        caseId={caseId}
        sourceId={side.sourceId}
        chunkId={side.chunkId}
        sourceLabel={side.sourceLabel}
        sourceTitle={side.sourceTitle}
        locator={side.locator}
        tone="conflict"
      />
    </div>
  )
}

export function DiscrepancyMatrix({
  caseId,
  discrepancies,
  canWrite,
}: {
  caseId: string
  discrepancies: DiscrepancyView[]
  canWrite: boolean
}) {
  const router = useRouter()
  const [expanded, setExpanded] = React.useState<string[]>([])
  const [notes, setNotes] = React.useState<Record<string, string>>({})
  const [shared, setShared] = React.useState<Record<string, boolean>>({})
  const [states, setStates] = React.useState<Record<string, ReviewState>>({})

  function toggle(id: string) {
    setExpanded((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    )
  }

  async function patch(
    discrepancy: DiscrepancyView,
    input: Partial<{ reviewState: ReviewState; analystNotes: string; includedInShare: boolean }>,
    message: string,
  ) {
    const result = await updateDiscrepancy({ caseId, discrepancyId: discrepancy.id, ...input })
    if (!result.ok) {
      toast.error(result.error)
      setStates((current) => ({ ...current, [discrepancy.id]: discrepancy.reviewState }))
      setShared((current) => ({ ...current, [discrepancy.id]: discrepancy.includedInShare }))
      return
    }
    toast.success(message)
    router.refresh()
  }

  if (discrepancies.length === 0) {
    return (
      <div className="panel">
        <EmptyState
          title="No differences recorded"
          description="Once two or more records are indexed, building the case map compares them and records every point where they state different values for the same thing."
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-ink-secondary">
        Each row is a point where two records state something different about the same subject. A
        difference is not a finding — it is a question for the record.
      </p>

      {/* ------------------------------------------------------ table (md+) */}
      <div className="hidden overflow-hidden rounded-panel border border-line bg-canvas md:block">
        {/* Nine columns of comparison: the matrix scrolls inside its panel so a
            narrow centre column never compresses the stated values. */}
        <Table className="min-w-[1040px]">
          <caption className="sr-only">
            Discrepancy matrix — {discrepancies.length} differences between records
          </caption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Type</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>First record states</TableHead>
              <TableHead>Second record states</TableHead>
              <TableHead>Materiality</TableHead>
              <TableHead numeric>Confidence</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Evidence room</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discrepancies.map((discrepancy) => {
              const isOpen = expanded.includes(discrepancy.id)
              const sideA = discrepancy.sides.find((side) => side.side === 'a')
              const sideB = discrepancy.sides.find((side) => side.side === 'b')
              const reviewState = states[discrepancy.id] ?? discrepancy.reviewState
              const included = shared[discrepancy.id] ?? discrepancy.includedInShare
              return (
                <React.Fragment key={discrepancy.id}>
                  <TableRow>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggle(discrepancy.id)}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? 'Hide excerpts' : 'Show excerpts'}
                        className="flex size-6 items-center justify-center rounded-control text-ink-muted hover:bg-surface hover:text-ink"
                      >
                        {isOpen ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{DISCREPANCY_TYPE_LABELS[discrepancy.type]}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="block max-w-[24ch] text-[13px] text-ink">
                        {discrepancy.subject || discrepancy.title}
                      </span>
                    </TableCell>
                    <TableCell>
                      <SideCell caseId={caseId} side={sideA} />
                    </TableCell>
                    <TableCell>
                      <SideCell caseId={caseId} side={sideB} />
                    </TableCell>
                    <TableCell>
                      <span className="text-[13px] capitalize text-ink-secondary">
                        {discrepancy.materiality}
                      </span>
                    </TableCell>
                    <TableCell numeric>{percent(discrepancy.confidence)}</TableCell>
                    <TableCell>
                      <Select
                        value={reviewState}
                        disabled={!canWrite}
                        onValueChange={(value) => {
                          const next = value as ReviewState
                          setStates((current) => ({ ...current, [discrepancy.id]: next }))
                          void patch(
                            discrepancy,
                            { reviewState: next },
                            `Marked ${REVIEW_STATE_META[next].label.toLowerCase()}.`,
                          )
                        }}
                      >
                        <SelectTrigger className="h-8 w-[150px] text-[13px]" aria-label="Review state">
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
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={included}
                        disabled={!canWrite}
                        aria-label={`Include “${discrepancy.title}” in the evidence room`}
                        onCheckedChange={(next) => {
                          setShared((current) => ({ ...current, [discrepancy.id]: next }))
                          void patch(
                            discrepancy,
                            { includedInShare: next },
                            next ? 'Included in the evidence room.' : 'Excluded from the evidence room.',
                          )
                        }}
                      />
                    </TableCell>
                  </TableRow>

                  {isOpen ? (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-page">
                        <div className="space-y-4 py-1">
                          <div>
                            <h4 className="text-[13px] font-medium text-ink">{discrepancy.title}</h4>
                            {discrepancy.description ? (
                              <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-ink-secondary">
                                {discrepancy.description}
                              </p>
                            ) : null}
                          </div>

                          <div className="grid gap-5 lg:grid-cols-2">
                            {[sideA, sideB].map((side, index) =>
                              side ? (
                                <EvidenceExcerpt
                                  key={`${discrepancy.id}-${side.side}`}
                                  caseId={caseId}
                                  sourceId={side.sourceId}
                                  chunkId={side.chunkId}
                                  sourceLabel={side.sourceLabel}
                                  sourceTitle={side.sourceTitle}
                                  locator={side.locator}
                                  excerpt={side.excerpt}
                                  statedValue={side.statedValue}
                                  tone="conflict"
                                />
                              ) : (
                                <p key={`missing-${index}`} className="text-[13px] text-ink-muted">
                                  No excerpt recorded for this side.
                                </p>
                              ),
                            )}
                          </div>

                          <div>
                            <label
                              htmlFor={`notes-${discrepancy.id}`}
                              className="mb-1 block text-[11px] uppercase tracking-wide text-ink-muted"
                            >
                              Analyst notes
                            </label>
                            <Textarea
                              id={`notes-${discrepancy.id}`}
                              rows={3}
                              disabled={!canWrite}
                              value={notes[discrepancy.id] ?? discrepancy.analystNotes}
                              onChange={(event) =>
                                setNotes((current) => ({
                                  ...current,
                                  [discrepancy.id]: event.target.value,
                                }))
                              }
                              className="text-[13px]"
                              placeholder="What would settle this — a record, a correction, a confirmation."
                            />
                            <div className="mt-2 flex justify-end">
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={
                                  !canWrite ||
                                  (notes[discrepancy.id] ?? discrepancy.analystNotes) ===
                                    discrepancy.analystNotes
                                }
                                onClick={() =>
                                  void patch(
                                    discrepancy,
                                    { analystNotes: notes[discrepancy.id] ?? '' },
                                    'Notes saved.',
                                  )
                                }
                              >
                                Save notes
                              </Button>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* --------------------------------------------------- stacked (sm) */}
      <ul className="space-y-3 md:hidden">
        {discrepancies.map((discrepancy) => {
          const sideA = discrepancy.sides.find((side) => side.side === 'a')
          const sideB = discrepancy.sides.find((side) => side.side === 'b')
          const reviewState = states[discrepancy.id] ?? discrepancy.reviewState
          return (
            <li key={discrepancy.id} className="panel px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{DISCREPANCY_TYPE_LABELS[discrepancy.type]}</Badge>
                <span className="text-[11px] capitalize text-ink-muted">
                  {discrepancy.materiality} materiality
                </span>
              </div>
              <h4 className="mt-1.5 text-[13px] font-medium text-ink">{discrepancy.title}</h4>
              <div className="mt-3 space-y-3">
                {[sideA, sideB].map((side, index) =>
                  side ? (
                    <EvidenceExcerpt
                      key={`${discrepancy.id}-m-${side.side}`}
                      caseId={caseId}
                      sourceId={side.sourceId}
                      chunkId={side.chunkId}
                      sourceLabel={side.sourceLabel}
                      sourceTitle={side.sourceTitle}
                      locator={side.locator}
                      excerpt={side.excerpt}
                      statedValue={side.statedValue}
                      tone="conflict"
                    />
                  ) : (
                    <p key={`m-missing-${index}`} className="text-[13px] text-ink-muted">
                      No excerpt recorded for this side.
                    </p>
                  ),
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
                <Select
                  value={reviewState}
                  disabled={!canWrite}
                  onValueChange={(value) => {
                    const next = value as ReviewState
                    setStates((current) => ({ ...current, [discrepancy.id]: next }))
                    void patch(
                      discrepancy,
                      { reviewState: next },
                      `Marked ${REVIEW_STATE_META[next].label.toLowerCase()}.`,
                    )
                  }}
                >
                  <SelectTrigger className="h-8 w-[160px] text-[13px]" aria-label="Review state">
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
                <span className={cn('text-[11px] text-ink-muted tabular')}>
                  Confidence {percent(discrepancy.confidence)}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
