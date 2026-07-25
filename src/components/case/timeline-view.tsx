'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDownUp, Check, Pencil, Trash2, X } from 'lucide-react'

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
  EmptyState,
  Field,
  Input,
  PrecisionChip,
  ReviewStateChip,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from '@/components/ui'
import {
  DATE_PRECISIONS,
  DATE_PRECISION_META,
  type DatePrecision,
} from '@/lib/domain'
import type { SourceListItem, TimelineEventView } from '@/server/queries/case-detail'
import { deleteTimelineEvent, updateTimelineEvent } from '@/server/actions/claims'
import { cn, formatDate } from '@/lib/utils'
import { CitationChip } from './citation-chip'

type Zoom = 'day' | 'month' | 'year'

function groupKey(date: string, zoom: Zoom): string {
  if (zoom === 'year') return date.slice(0, 4)
  if (zoom === 'month') return date.slice(0, 7)
  return date
}

function groupLabel(key: string, zoom: Zoom): string {
  if (zoom === 'year') return key
  if (zoom === 'month') return formatDate(`${key}-01`, { year: 'numeric', month: 'long', day: undefined })
  return formatDate(key)
}

export function TimelineView({
  caseId,
  events,
  sources,
  canWrite,
}: {
  caseId: string
  events: TimelineEventView[]
  sources: SourceListItem[]
  canWrite: boolean
}) {
  const router = useRouter()

  const [reverse, setReverse] = React.useState(false)
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
  const [category, setCategory] = React.useState('all')
  const [sourceId, setSourceId] = React.useState('all')
  const [zoom, setZoom] = React.useState<Zoom>('month')

  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState({
    title: '',
    occurredOn: '',
    precision: 'exact' as DatePrecision,
    analystNotes: '',
  })
  const [pending, setPending] = React.useState(false)
  const [deleting, setDeleting] = React.useState<TimelineEventView | null>(null)

  const categories = React.useMemo(
    () => Array.from(new Set(events.map((event) => event.category).filter(Boolean))).sort(),
    [events],
  )

  const filtered = React.useMemo(() => {
    const list = events.filter((event) => {
      if (from && event.occurredOn < from) return false
      if (to && event.occurredOn > to) return false
      if (category !== 'all' && event.category !== category) return false
      if (sourceId !== 'all' && !event.citations.some((c) => c.sourceId === sourceId)) return false
      return true
    })
    return [...list].sort((a, b) =>
      reverse ? b.occurredOn.localeCompare(a.occurredOn) : a.occurredOn.localeCompare(b.occurredOn),
    )
  }, [events, from, to, category, sourceId, reverse])

  const groups = React.useMemo(() => {
    const map = new Map<string, TimelineEventView[]>()
    for (const event of filtered) {
      const key = groupKey(event.occurredOn, zoom)
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [filtered, zoom])

  function startEdit(event: TimelineEventView) {
    setEditingId(event.id)
    setDraft({
      title: event.title,
      occurredOn: event.occurredOn,
      precision: event.precision,
      analystNotes: event.analystNotes,
    })
  }

  async function saveEdit(event: TimelineEventView) {
    setPending(true)
    const result = await updateTimelineEvent({
      caseId,
      eventId: event.id,
      title: draft.title.trim(),
      occurredOn: draft.occurredOn,
      precision: draft.precision,
      analystNotes: draft.analystNotes,
    })
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Event updated.')
    setEditingId(null)
    router.refresh()
  }

  async function confirmDelete() {
    if (!deleting) return
    setPending(true)
    const result = await deleteTimelineEvent(caseId, deleting.id)
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Event removed from the timeline.')
    setDeleting(null)
    router.refresh()
  }

  if (events.length === 0) {
    return (
      <div className="panel">
        <EmptyState
          title="No dated events yet"
          description="Events are extracted from records as they are indexed. Every event on this timeline carries the citation that dates it — nothing is placed here without a source."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* -------------------------------------------------------- controls */}
      <div className="flex flex-wrap items-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setReverse(!reverse)}
          aria-pressed={reverse}
        >
          <ArrowDownUp />
          {reverse ? 'Newest first' : 'Oldest first'}
        </Button>

        <div>
          <label htmlFor="tl-from" className="mb-1 block text-[11px] uppercase tracking-wide text-ink-muted">
            From
          </label>
          <Input
            id="tl-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="h-8 w-[150px] text-[13px]"
          />
        </div>
        <div>
          <label htmlFor="tl-to" className="mb-1 block text-[11px] uppercase tracking-wide text-ink-muted">
            To
          </label>
          <Input
            id="tl-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="h-8 w-[150px] text-[13px]"
          />
        </div>

        <div>
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-muted">Category</span>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 w-[150px] text-[13px]" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((value) => (
                <SelectItem key={value} value={value}>
                  {value[0]!.toUpperCase() + value.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-muted">Source</span>
          <Select value={sourceId} onValueChange={setSourceId}>
            <SelectTrigger className="h-8 w-[180px] text-[13px]" aria-label="Filter by source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All records</SelectItem>
              {sources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.label} · {source.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-muted">Group by</span>
          <Select value={zoom} onValueChange={(value) => setZoom(value as Zoom)}>
            <SelectTrigger className="h-8 w-[120px] text-[13px]" aria-label="Timeline zoom">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {from || to || category !== 'all' || sourceId !== 'all' ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFrom('')
              setTo('')
              setCategory('all')
              setSourceId('all')
            }}
          >
            <X />
            Clear filters
          </Button>
        ) : null}
      </div>

      <p className="text-[11px] text-ink-muted">
        {filtered.length} of {events.length} events shown.
      </p>

      {/* -------------------------------------------------------- the rail */}
      {filtered.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="No event matches these filters"
            description="Widen the date range or clear the category and source filters."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([key, groupEvents]) => (
            <section key={key}>
              <h3 className="sticky top-0 z-10 -mx-1 bg-page/95 px-1 py-1 text-[11px] font-medium uppercase tracking-wide text-ink-secondary backdrop-blur">
                {groupLabel(key, zoom)}
                <span className="ml-2 tabular text-ink-muted">{groupEvents.length}</span>
              </h3>

              <ol className="relative mt-2 border-l border-line pl-5">
                {groupEvents.map((event) => {
                  const conflicting = event.precision === 'conflicting'
                  const editing = editingId === event.id
                  return (
                    <li key={event.id} className="relative pb-5 last:pb-0">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute -left-[26px] top-1.5 flex size-2.5 items-center justify-center rounded-full border-2 border-canvas',
                          conflicting ? 'bg-signal' : 'bg-line-strong',
                        )}
                      />

                      <div className="panel px-4 py-3">
                        {editing ? (
                          <div className="space-y-3">
                            <Field label="Title" required>
                              <Input
                                value={draft.title}
                                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                                className="h-8 text-[13px]"
                              />
                            </Field>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Field label="Date">
                                <Input
                                  type="date"
                                  value={draft.occurredOn}
                                  onChange={(e) => setDraft({ ...draft, occurredOn: e.target.value })}
                                  className="h-8 text-[13px]"
                                />
                              </Field>
                              <Field label="Precision">
                                <Select
                                  value={draft.precision}
                                  onValueChange={(value) =>
                                    setDraft({ ...draft, precision: value as DatePrecision })
                                  }
                                >
                                  <SelectTrigger className="h-8 text-[13px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {DATE_PRECISIONS.map((value) => (
                                      <SelectItem key={value} value={value}>
                                        {DATE_PRECISION_META[value].symbol}{' '}
                                        {DATE_PRECISION_META[value].label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </Field>
                            </div>
                            <Field label="Analyst notes">
                              <Textarea
                                rows={3}
                                value={draft.analystNotes}
                                onChange={(e) => setDraft({ ...draft, analystNotes: e.target.value })}
                                className="text-[13px]"
                              />
                            </Field>
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                                Cancel
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                loading={pending}
                                disabled={draft.title.trim().length < 4 || !draft.occurredOn}
                                onClick={() => void saveEdit(event)}
                              >
                                <Check />
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <time
                                dateTime={event.occurredOn}
                                className="font-mono text-[11px] text-ink-muted tabular"
                              >
                                {formatDate(event.occurredOn)}
                                {event.occurredEndOn ? ` – ${formatDate(event.occurredEndOn)}` : ''}
                                {event.timeOfDay ? ` ${event.timeOfDay}` : ''}
                              </time>
                              <PrecisionChip precision={event.precision} />
                              {event.category ? (
                                <span className="text-[11px] capitalize text-ink-muted">
                                  {event.category}
                                </span>
                              ) : null}
                              <ReviewStateChip state={event.reviewState} size="sm" />
                              <span className="ml-auto flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={!canWrite}
                                  aria-label={`Edit ${event.title}`}
                                  onClick={() => startEdit(event)}
                                >
                                  <Pencil />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={!canWrite}
                                  aria-label={`Delete ${event.title}`}
                                  onClick={() => setDeleting(event)}
                                >
                                  <Trash2 />
                                </Button>
                              </span>
                            </div>

                            <h4 className="mt-1.5 text-[13px] font-medium leading-snug text-ink">
                              {event.title}
                            </h4>

                            {conflicting ? (
                              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-control border border-signal-border bg-signal-soft px-2 py-0.5 text-[11px] text-ink">
                                <span
                                  className="inline-block size-1.5 rounded-full bg-signal"
                                  aria-hidden="true"
                                />
                                Sources give different dates for this event
                              </p>
                            ) : null}

                            {event.description ? (
                              <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-ink-secondary">
                                {event.description}
                              </p>
                            ) : null}

                            {event.citations.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {event.citations.map((citation) => (
                                  <CitationChip
                                    key={`${event.id}-${citation.chunkId}`}
                                    caseId={caseId}
                                    sourceId={citation.sourceId}
                                    chunkId={citation.chunkId}
                                    sourceLabel={citation.sourceLabel}
                                    sourceTitle={citation.sourceTitle}
                                    locator={citation.locator}
                                    tone={conflicting ? 'conflict' : 'evidence'}
                                  />
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-[11px] text-ink-muted">
                                No citation is attached to this event.
                              </p>
                            )}

                            {event.analystNotes ? (
                              <p className="mt-2 border-t border-line pt-2 text-[12px] leading-relaxed text-ink-secondary">
                                {event.analystNotes}
                              </p>
                            ) : null}
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
      )}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => (open ? null : setDeleting(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this event?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” will be removed from the timeline along with the citations that
              place it there. The underlying records are not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                void confirmDelete()
              }}
            >
              Remove event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
