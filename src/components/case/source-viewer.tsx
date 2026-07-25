'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, ExternalLink, Minus, Plus } from 'lucide-react'

import {
  Button,
  ClaimStatusChip,
  EmptyState,
  Input,
  ProcessingStatusChip,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { SOURCE_FORMAT_LABELS } from '@/lib/domain'
import type { ClaimView, SourceDetail } from '@/server/queries/case-detail'
import { cn, formatBytes, formatDate } from '@/lib/utils'

type Chunk = SourceDetail['chunks'][number]

const ZOOM_MIN = 80
const ZOOM_MAX = 160
const ZOOM_STEP = 10

/** Splits a page of extracted text so each indexed excerpt can be marked. */
function segmentPage(pageText: string, chunks: Chunk[]): { text: string; chunkId?: string }[] {
  const marks: { start: number; end: number; id: string }[] = []
  let cursor = 0
  for (const chunk of chunks) {
    const needle = chunk.text.trim()
    if (!needle) continue
    const index = pageText.indexOf(needle, cursor)
    if (index < 0) continue
    marks.push({ start: index, end: index + needle.length, id: chunk.id })
    cursor = index + needle.length
  }
  if (marks.length === 0) return [{ text: pageText }]

  const segments: { text: string; chunkId?: string }[] = []
  let position = 0
  for (const mark of marks) {
    if (mark.start > position) segments.push({ text: pageText.slice(position, mark.start) })
    segments.push({ text: pageText.slice(mark.start, mark.end), chunkId: mark.id })
    position = mark.end
  }
  if (position < pageText.length) segments.push({ text: pageText.slice(position) })
  return segments
}

function MetadataPanel({
  caseId,
  detail,
  citingClaims,
}: {
  caseId: string
  detail: SourceDetail
  citingClaims: ClaimView[]
}) {
  const confidence =
    detail.extractionConfidence === null ? null : Math.round(detail.extractionConfidence * 100)

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Label', value: <span className="font-mono">{detail.label}</span> },
    { label: 'Format', value: SOURCE_FORMAT_LABELS[detail.format] },
    { label: 'Size', value: detail.byteSize > 0 ? formatBytes(detail.byteSize) : '—' },
    { label: 'Pages', value: detail.pageCount > 0 ? detail.pageCount.toLocaleString() : '—' },
    { label: 'Words', value: detail.wordCount > 0 ? detail.wordCount.toLocaleString() : '—' },
    {
      label: 'Extraction confidence',
      value:
        confidence === null ? (
          'Not recorded'
        ) : (
          <span className={cn(confidence < 50 && 'text-signal')}>
            {confidence}%{confidence < 50 ? ' — verify against the original' : ''}
          </span>
        ),
    },
    { label: 'Added', value: formatDate(detail.createdAt) },
    {
      label: 'Source',
      value: detail.sourceUrl ? (
        <a
          href={detail.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 break-all text-evidence-deep hover:underline"
        >
          {detail.sourceUrl}
          <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
        </a>
      ) : (
        'Uploaded or written in CaseSignal'
      ),
    },
  ]

  return (
    <aside className="w-full shrink-0 border-t border-line bg-canvas xl:w-[300px] xl:border-l xl:border-t-0">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-[13px] font-medium text-ink">Record details</h2>
      </div>
      <dl className="divide-y divide-line text-[13px]">
        {rows.map((row) => (
          <div key={row.label} className="px-4 py-2">
            <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{row.label}</dt>
            <dd className="mt-0.5 break-words text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>

      {detail.keyPoints.length > 0 ? (
        <div className="border-t border-line px-4 py-3">
          <h3 className="text-[11px] uppercase tracking-wide text-ink-muted">Key points</h3>
          <ul className="mt-1.5 space-y-1.5">
            {detail.keyPoints.map((point) => (
              <li key={point} className="text-[13px] leading-relaxed text-ink-secondary">
                {point}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="border-t border-line px-4 py-3">
        <h3 className="text-[11px] uppercase tracking-wide text-ink-muted">
          Claims citing this record
        </h3>
        {citingClaims.length === 0 ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
            No claim cites this record yet.
          </p>
        ) : (
          <ul className="mt-1.5 space-y-2">
            {citingClaims.map((claim) => (
              <li key={claim.id}>
                <Link
                  href={`/app/cases/${caseId}/claims?claim=${claim.id}`}
                  className="block rounded-control border border-line px-2.5 py-1.5 hover:border-evidence-border hover:bg-evidence-soft"
                >
                  <ClaimStatusChip status={claim.status} size="sm" short />
                  <span className="mt-1 block text-[13px] leading-snug text-ink">
                    {claim.statement}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

export function SourceViewer({
  caseId,
  detail,
  citingClaims,
}: {
  caseId: string
  detail: SourceDetail
  citingClaims: ClaimView[]
}) {
  const searchParams = useSearchParams()
  const activeChunkId = searchParams.get('chunk')
  const activeChunk = React.useMemo(
    () => detail.chunks.find((chunk) => chunk.id === activeChunkId) ?? null,
    [detail.chunks, activeChunkId],
  )

  const isPaged = detail.format === 'pdf' || detail.format === 'docx'
  const isSheet = detail.format === 'xlsx' || detail.format === 'csv'
  const isImage = detail.format === 'image'

  /* -------------------------------------------------------------- paging */
  const pageNumbers = React.useMemo(() => {
    if (detail.pages.length > 0) return detail.pages.map((page) => page.pageNumber)
    const set = new Set<number>()
    for (const chunk of detail.chunks) if (chunk.pageNumber != null) set.add(chunk.pageNumber)
    return Array.from(set).sort((a, b) => a - b)
  }, [detail.pages, detail.chunks])

  const [page, setPage] = React.useState(() => activeChunk?.pageNumber ?? pageNumbers[0] ?? 1)
  const [pageInput, setPageInput] = React.useState(String(page))
  const [zoom, setZoom] = React.useState(100)

  const [sheetName, setSheetName] = React.useState(
    () => activeChunk?.sheetName ?? detail.sheets[0]?.name ?? '',
  )

  // Following a citation moves the viewer to where that excerpt physically is.
  // Done during render so the correct page is the first thing painted.
  const [followedChunkId, setFollowedChunkId] = React.useState(activeChunkId)
  if (followedChunkId !== activeChunkId) {
    setFollowedChunkId(activeChunkId)
    if (activeChunk?.pageNumber != null) setPage(activeChunk.pageNumber)
    if (activeChunk?.sheetName) setSheetName(activeChunk.sheetName)
  }

  const [shownPage, setShownPage] = React.useState(page)
  if (shownPage !== page) {
    setShownPage(page)
    setPageInput(String(page))
  }

  React.useEffect(() => {
    if (!activeChunkId) return
    const timer = window.setTimeout(() => {
      document
        .getElementById(`chunk-${activeChunkId}`)
        ?.scrollIntoView({ block: 'center', behavior: 'auto' })
    }, 60)
    return () => window.clearTimeout(timer)
  }, [activeChunkId, page, sheetName])

  const pageText = React.useMemo(() => {
    const stored = detail.pages.find((entry) => entry.pageNumber === page)?.text
    if (stored) return stored
    return detail.chunks
      .filter((chunk) => chunk.pageNumber === page)
      .map((chunk) => chunk.text)
      .join('\n\n')
  }, [detail.pages, detail.chunks, page])

  const pageChunks = React.useMemo(
    () => detail.chunks.filter((chunk) => chunk.pageNumber === page),
    [detail.chunks, page],
  )

  const segments = React.useMemo(() => segmentPage(pageText, pageChunks), [pageText, pageChunks])

  /* ------------------------------------------------------------- sections */
  const sections = React.useMemo(() => {
    const seen = new Set<string>()
    const list: { id: string; label: string }[] = []
    for (const chunk of detail.chunks) {
      if (!chunk.sectionPath || seen.has(chunk.sectionPath)) continue
      seen.add(chunk.sectionPath)
      list.push({ id: chunk.id, label: chunk.sectionPath })
    }
    return list
  }, [detail.chunks])

  const sheet = detail.sheets.find((entry) => entry.name === sheetName) ?? detail.sheets[0] ?? null

  const textStyle: React.CSSProperties = { fontSize: `${(15 * zoom) / 100}px` }

  /* ---------------------------------------------------------------- views */
  function renderBody() {
    if (detail.status === 'failed') {
      return (
        <EmptyState
          title="This record could not be processed"
          description={detail.statusDetail || 'Extraction failed. Retry the record or replace it.'}
        />
      )
    }

    if (isSheet) {
      if (!sheet) {
        return <EmptyState title="No sheet data was extracted" description={detail.statusDetail} />
      }
      const citedFor = activeChunk?.sheetName === sheet.name ? activeChunk : null
      return (
        <div className="space-y-3">
          {detail.sheets.length > 1 ? (
            <div className="flex items-center gap-2">
              <label htmlFor="sheet-select" className="text-xs text-ink-secondary">
                Sheet
              </label>
              <Select value={sheet.name} onValueChange={setSheetName}>
                <SelectTrigger id="sheet-select" className="h-8 w-[220px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {detail.sheets.map((entry) => (
                    <SelectItem key={entry.name} value={entry.name}>
                      {entry.name} ({entry.rowCount} rows)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-xs text-ink-secondary">
              Sheet “{sheet.name}” · {sheet.rowCount.toLocaleString()} rows
            </p>
          )}

          <div>
            <Table containerClassName="max-h-[70vh] overflow-auto rounded-panel border border-line bg-canvas">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 w-12 bg-page text-right">Row</TableHead>
                  {sheet.headers.map((header, index) => (
                    <TableHead key={`${header}-${index}`}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheet.rows.map((row, index) => {
                  // Numbering follows the register's own row numbers so it matches citations.
                  const rowNumber = (sheet.rowOffset ?? 1) + index
                  const cited =
                    citedFor != null &&
                    citedFor.rowStart != null &&
                    rowNumber >= citedFor.rowStart &&
                    rowNumber <= (citedFor.rowEnd ?? citedFor.rowStart)
                  return (
                    <TableRow
                      key={rowNumber}
                      id={cited && citedFor ? `chunk-${citedFor.id}` : undefined}
                      className={cn(cited && 'bg-evidence-soft')}
                    >
                      <TableCell
                        numeric
                        className={cn(
                          'sticky left-0 z-10 w-12 text-right font-mono text-[11px] text-ink-muted',
                          cited ? 'bg-evidence-soft' : 'bg-page',
                        )}
                      >
                        {rowNumber}
                      </TableCell>
                      {sheet.headers.map((header, cellIndex) => (
                        <TableCell key={`${rowNumber}-${cellIndex}`} className="whitespace-nowrap">
                          {row[cellIndex] ?? ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )
    }

    if (isImage) {
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-panel border border-line bg-canvas p-3">
            {detail.hasFile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/sources/${detail.id}/file`}
                alt={`Scanned record: ${detail.title}`}
                className="mx-auto h-auto max-w-full rounded-control"
              />
            ) : (
              <p className="p-6 text-center text-sm text-ink-secondary">
                The original image file is no longer stored. The extracted text below is what the
                case holds.
              </p>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[13px] font-medium text-ink">Extracted text</h2>
              <span className="text-xs text-ink-secondary tabular">
                {detail.extractionConfidence === null
                  ? 'Confidence not recorded'
                  : `Confidence ${Math.round(detail.extractionConfidence * 100)}%`}
              </span>
            </div>
            {detail.chunks.map((chunk) => (
              <div
                key={chunk.id}
                id={`chunk-${chunk.id}`}
                className="rounded-panel border border-line bg-canvas p-3"
              >
                <p className="font-mono text-[11px] text-ink-muted">
                  {chunk.regionLabel ? `Region ${chunk.regionLabel}` : chunk.locator || 'Region'}
                </p>
                <p
                  className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-ink"
                  data-active={chunk.id === activeChunkId ? 'true' : undefined}
                >
                  <span
                    className="excerpt-mark"
                    data-active={chunk.id === activeChunkId ? 'true' : undefined}
                  >
                    {chunk.text}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (isPaged) {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-panel border border-line bg-canvas px-3 py-2">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous page"
                disabled={pageNumbers.indexOf(page) <= 0}
                onClick={() => {
                  const index = pageNumbers.indexOf(page)
                  if (index > 0) setPage(pageNumbers[index - 1]!)
                }}
              >
                <ChevronLeft />
              </Button>
              <Input
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                onBlur={() => {
                  const next = Number(pageInput)
                  if (Number.isFinite(next) && pageNumbers.includes(next)) setPage(next)
                  else setPageInput(String(page))
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                }}
                aria-label="Page number"
                inputMode="numeric"
                className="h-8 w-14 text-center text-[13px] tabular"
              />
              <span className="text-xs text-ink-secondary tabular">
                of {pageNumbers.length || detail.pageCount || 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next page"
                disabled={pageNumbers.indexOf(page) >= pageNumbers.length - 1}
                onClick={() => {
                  const index = pageNumbers.indexOf(page)
                  if (index >= 0 && index < pageNumbers.length - 1) setPage(pageNumbers[index + 1]!)
                }}
              >
                <ChevronRight />
              </Button>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Zoom out"
                disabled={zoom <= ZOOM_MIN}
                onClick={() => setZoom((value) => Math.max(ZOOM_MIN, value - ZOOM_STEP))}
              >
                <Minus />
              </Button>
              <span className="w-12 text-center text-xs text-ink-secondary tabular">{zoom}%</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Zoom in"
                disabled={zoom >= ZOOM_MAX}
                onClick={() => setZoom((value) => Math.min(ZOOM_MAX, value + ZOOM_STEP))}
              >
                <Plus />
              </Button>
            </div>
          </div>

          <article className="rounded-panel border border-line bg-canvas px-6 py-8 shadow-panel sm:px-10">
            <p className="mb-5 font-mono text-[11px] text-ink-muted">Page {page}</p>
            {pageText.trim().length === 0 ? (
              <p className="text-sm text-ink-secondary">No text was extracted from this page.</p>
            ) : (
              <div
                className="mx-auto max-w-[70ch] whitespace-pre-wrap leading-[1.75] text-ink"
                style={textStyle}
              >
                {segments.map((segment, index) =>
                  segment.chunkId ? (
                    <span
                      key={`${segment.chunkId}-${index}`}
                      id={`chunk-${segment.chunkId}`}
                      className="excerpt-mark"
                      data-active={segment.chunkId === activeChunkId ? 'true' : undefined}
                    >
                      {segment.text}
                    </span>
                  ) : (
                    <React.Fragment key={`plain-${index}`}>{segment.text}</React.Fragment>
                  ),
                )}
              </div>
            )}
          </article>
        </div>
      )
    }

    /* -------------------------------------- webpage, text, markdown, note */
    return (
      <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
        {sections.length > 1 ? (
          <nav aria-label="Sections" className="lg:sticky lg:top-0 lg:self-start">
            <p className="text-[11px] uppercase tracking-wide text-ink-muted">Sections</p>
            <ul className="mt-1.5 space-y-1">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#chunk-${section.id}`}
                    className={cn(
                      'block truncate rounded-control px-2 py-1 text-[13px] hover:bg-surface',
                      section.id === activeChunkId
                        ? 'bg-evidence-soft text-evidence-deep'
                        : 'text-ink-secondary',
                    )}
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <div className="hidden lg:block" />
        )}

        <article className="rounded-panel border border-line bg-canvas px-6 py-8 shadow-panel sm:px-10">
          <div className="mx-auto max-w-[70ch] space-y-4" style={textStyle}>
            {detail.chunks.length === 0 ? (
              <p className="text-sm text-ink-secondary">No text has been indexed for this record.</p>
            ) : (
              detail.chunks.map((chunk) => (
                <section key={chunk.id} id={`chunk-${chunk.id}`}>
                  {chunk.sectionPath ? (
                    <h3 className="mb-1.5 text-[13px] font-medium uppercase tracking-wide text-ink-muted">
                      {chunk.sectionPath}
                    </h3>
                  ) : null}
                  <p className="whitespace-pre-wrap leading-[1.75] text-ink">
                    <span
                      className="excerpt-mark"
                      data-active={chunk.id === activeChunkId ? 'true' : undefined}
                    >
                      {chunk.text}
                    </span>
                  </p>
                </section>
              ))
            )}
          </div>
        </article>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col xl:flex-row">
      <div className="min-w-0 flex-1 px-4 py-5 sm:px-6">
        <header className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-ink-muted">{detail.label}</span>
            <h1 className="min-w-0 text-[15px] font-medium text-ink">{detail.title}</h1>
            {detail.status === 'complete' ? null : (
              <ProcessingStatusChip status={detail.status} size="sm" />
            )}
          </div>
          {detail.summary ? (
            <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-ink-secondary">
              {detail.summary}
            </p>
          ) : null}
          {activeChunk ? (
            <p className="mt-2 inline-flex items-center gap-2 rounded-control border border-evidence-border bg-evidence-soft px-2.5 py-1 text-xs text-evidence-deep">
              Showing the cited excerpt{activeChunk.locator ? ` at ${activeChunk.locator}` : ''}
            </p>
          ) : null}
        </header>

        {renderBody()}
      </div>

      <MetadataPanel caseId={caseId} detail={detail} citingClaims={citingClaims} />
    </div>
  )
}
