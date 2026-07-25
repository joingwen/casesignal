'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns2, Plus, X } from 'lucide-react'

import {
  Button,
  ClaimStatusChip,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  EvidenceRoleChip,
  Field,
  Input,
  ReviewStateChip,
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
  Textarea,
  toast,
} from '@/components/ui'
import {
  CLAIM_CATEGORIES,
  CLAIM_CATEGORY_LABELS,
  CLAIM_STATUSES,
  CLAIM_STATUS_META,
  EVIDENCE_ROLE_META,
  MATERIALITY_LEVELS,
  REVIEW_STATES,
  REVIEW_STATE_META,
  type ClaimCategory,
  type Materiality,
} from '@/lib/domain'
import type { ClaimView } from '@/server/queries/case-detail'
import { createClaim } from '@/server/actions/claims'
import { cn, formatRelative, truncate } from '@/lib/utils'
import { ClaimDetail, type ChunkIndexItem } from './claim-detail'
import { DetailPortal } from './workspace-context'

const MATERIALITY_ORDER: Record<Materiality, number> = { low: 0, medium: 1, high: 2 }

function CitationCounts({ claim }: { claim: ClaimView }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[12px] tabular">
      <span
        className={cn(claim.counts.supporting > 0 ? 'text-status-supported' : 'text-ink-muted')}
        title={`${claim.counts.supporting} supporting citation(s)`}
      >
        {EVIDENCE_ROLE_META.supporting.symbol}
        {claim.counts.supporting}
      </span>
      <span
        className={cn(claim.counts.contradicting > 0 ? 'text-status-contradicted' : 'text-ink-muted')}
        title={`${claim.counts.contradicting} conflicting citation(s)`}
      >
        {EVIDENCE_ROLE_META.contradicting.symbol}
        {claim.counts.contradicting}
      </span>
      {claim.counts.context > 0 ? (
        <span className="text-ink-muted" title={`${claim.counts.context} context citation(s)`}>
          {EVIDENCE_ROLE_META.context.symbol}
          {claim.counts.context}
        </span>
      ) : null}
    </span>
  )
}

function CompareColumn({ caseId, claim }: { caseId: string; claim: ClaimView }) {
  return (
    <div className="min-w-0 space-y-3">
      <div>
        <ClaimStatusChip status={claim.status} size="sm" />
        <p className="mt-1.5 text-[13px] font-medium leading-snug text-ink">{claim.statement}</p>
        <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-muted">
          {claim.materiality} materiality · {REVIEW_STATE_META[claim.reviewState].label}
        </p>
      </div>
      {claim.evidence.length === 0 ? (
        <p className="text-[13px] text-ink-secondary">No excerpt is cited for this claim.</p>
      ) : (
        <ul className="space-y-2.5">
          {claim.evidence.map((item) => (
            <li key={item.id} className="rounded-panel border border-line px-3 py-2">
              <div className="flex items-center gap-2">
                <EvidenceRoleChip role={item.role} size="sm" />
                <span className="truncate font-mono text-[11px] text-ink-muted">
                  {item.sourceLabel}
                  {item.locator ? ` · ${item.locator}` : ''}
                </span>
              </div>
              <blockquote className="mt-1.5 border-l-2 border-evidence-border pl-2.5 text-[12px] leading-relaxed text-ink-secondary">
                {item.excerpt}
              </blockquote>
              <a
                href={`/app/cases/${caseId}/sources/${item.sourceId}?chunk=${item.chunkId}`}
                className="mt-1.5 inline-block text-[12px] text-evidence-deep hover:underline"
              >
                Open in source
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function NewClaimDialog({
  caseId,
  chunkIndex,
  open,
  onOpenChange,
  onCreated,
}: {
  caseId: string
  chunkIndex: ChunkIndexItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (claimId: string) => void
}) {
  const [statement, setStatement] = React.useState('')
  const [category, setCategory] = React.useState<ClaimCategory>('other')
  const [materiality, setMateriality] = React.useState<Materiality>('medium')
  const [chunkIds, setChunkIds] = React.useState<string[]>([])
  const [query, setQuery] = React.useState('')
  const [creating, setCreating] = React.useState(false)

  const candidates = chunkIndex
    .filter((chunk) => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      return chunk.text.toLowerCase().includes(q) || chunk.sourceTitle.toLowerCase().includes(q)
    })
    .slice(0, 40)

  async function submit() {
    setCreating(true)
    const result = await createClaim({
      caseId,
      statement: statement.trim(),
      category,
      materiality,
      chunkIds,
      origin: 'analyst',
    })
    setCreating(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Claim created.')
    setStatement('')
    setChunkIds([])
    setQuery('')
    onOpenChange(false)
    onCreated(result.data.claimId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New claim</DialogTitle>
          <DialogDescription>
            Write one checkable sentence. Cite the excerpts that bear on it now, or add them later.
          </DialogDescription>
        </DialogHeader>

        <Field label="Statement" required hint={`${statement.length} / 400`}>
          <Textarea
            value={statement}
            rows={3}
            onChange={(event) => setStatement(event.target.value.slice(0, 400))}
            placeholder="The invoice dated 12 March records 240 units, while the delivery note records 180."
          />
        </Field>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Category">
            <Select value={category} onValueChange={(value) => setCategory(value as ClaimCategory)}>
              <SelectTrigger>
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
          <Field label="Materiality">
            <Select value={materiality} onValueChange={(value) => setMateriality(value as Materiality)}>
              <SelectTrigger>
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
        </div>

        {chunkIndex.length > 0 ? (
          <div className="mt-3">
            <Field label="Cite excerpts" hint={`${chunkIds.length} selected`}>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter excerpts by text or record"
              />
            </Field>
            <ul className="mt-2 max-h-52 space-y-1.5 overflow-y-auto scrollbar-slim">
              {candidates.map((chunk) => {
                const isSelected = chunkIds.includes(chunk.id)
                return (
                  <li key={chunk.id}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() =>
                        setChunkIds((current) =>
                          current.includes(chunk.id)
                            ? current.filter((id) => id !== chunk.id)
                            : [...current, chunk.id],
                        )
                      }
                      className={cn(
                        'w-full rounded-control border px-3 py-2 text-left',
                        isSelected ? 'border-evidence bg-evidence-soft' : 'border-line hover:bg-surface',
                      )}
                    >
                      <span className="block font-mono text-[11px] text-ink-muted">
                        {chunk.sourceLabel}
                        {chunk.locator ? ` · ${chunk.locator}` : ''}
                      </span>
                      <span className="mt-1 block text-[13px] leading-snug text-ink-secondary">
                        {truncate(chunk.text, 180)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={creating}
            disabled={statement.trim().length < 8}
            onClick={() => void submit()}
          >
            Create claim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export interface ClaimsLedgerProps {
  caseId: string
  claims: ClaimView[]
  chunkIndex: ChunkIndexItem[]
  canWrite: boolean
}

export function ClaimsLedger({ caseId, claims, chunkIndex, canWrite }: ClaimsLedgerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'materiality', desc: true }])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState('')

  const [selectedId, setSelectedId] = React.useState<string | null>(searchParams.get('claim'))
  const [compareMode, setCompareMode] = React.useState(false)
  const [compareIds, setCompareIds] = React.useState<string[]>([])

  const [newOpen, setNewOpen] = React.useState(false)

  // A `?claim=` link (from a source viewer or the graph) opens that claim.
  const claimParam = searchParams.get('claim')
  const [followedClaim, setFollowedClaim] = React.useState(claimParam)
  if (followedClaim !== claimParam) {
    setFollowedClaim(claimParam)
    if (claimParam) setSelectedId(claimParam)
  }

  const columns = React.useMemo<ColumnDef<ClaimView>[]>(
    () => [
      {
        id: 'statement',
        accessorFn: (row) => row.statement,
        header: 'Statement',
        enableGlobalFilter: true,
        cell: ({ row }) => (
          <span className="block min-w-[26ch] max-w-[46ch] text-[13px] leading-snug text-ink">
            {row.original.statement}
          </span>
        ),
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: 'Status',
        enableGlobalFilter: false,
        filterFn: (row, _id, value) => value === 'all' || row.original.status === value,
        cell: ({ row }) => <ClaimStatusChip status={row.original.status} size="sm" short />,
      },
      {
        id: 'materiality',
        accessorFn: (row) => MATERIALITY_ORDER[row.materiality],
        header: 'Materiality',
        enableGlobalFilter: false,
        filterFn: (row, _id, value) => value === 'all' || row.original.materiality === value,
        cell: ({ row }) => (
          <span className="text-[13px] capitalize text-ink-secondary">{row.original.materiality}</span>
        ),
      },
      {
        id: 'citations',
        accessorFn: (row) => row.counts.supporting + row.counts.contradicting,
        header: 'Citations',
        enableGlobalFilter: false,
        cell: ({ row }) => <CitationCounts claim={row.original} />,
      },
      {
        id: 'reviewState',
        accessorFn: (row) => row.reviewState,
        header: 'Review',
        enableGlobalFilter: false,
        filterFn: (row, _id, value) => value === 'all' || row.original.reviewState === value,
        cell: ({ row }) => <ReviewStateChip state={row.original.reviewState} size="sm" />,
      },
      {
        id: 'updatedAt',
        accessorFn: (row) => row.updatedAt,
        header: 'Updated',
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[12px] text-ink-muted">
            {formatRelative(row.original.updatedAt)}
          </span>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: claims,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const rows = table.getRowModel().rows
  const selected = claims.find((claim) => claim.id === selectedId) ?? null
  const compareClaims = compareIds
    .map((id) => claims.find((claim) => claim.id === id))
    .filter((claim): claim is ClaimView => Boolean(claim))

  function filterValue(id: string): string {
    const found = columnFilters.find((filter) => filter.id === id)
    return typeof found?.value === 'string' ? found.value : 'all'
  }

  function setFilter(id: string, value: string) {
    setColumnFilters((current) => {
      const rest = current.filter((filter) => filter.id !== id)
      return value === 'all' ? rest : [...rest, { id, value }]
    })
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((entry) => entry !== id)
      if (current.length >= 2) return [current[1]!, id]
      return [...current, id]
    })
  }

  function handleCreated(claimId: string) {
    setSelectedId(claimId)
    router.refresh()
  }

  /* ------------------------------------------------------------ toolbar */
  const toolbar = (
    <div className="mb-4 flex flex-wrap items-end gap-2">
      <div className="min-w-[180px] flex-1">
        <label htmlFor="claim-search" className="mb-1 block text-[11px] uppercase tracking-wide text-ink-muted">
          Filter
        </label>
        <Input
          id="claim-search"
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="Search claim statements"
          className="h-8 text-[13px]"
        />
      </div>

      {[
        { id: 'status', label: 'Status', options: CLAIM_STATUSES.map((value) => ({ value, label: CLAIM_STATUS_META[value].label })) },
        { id: 'materiality', label: 'Materiality', options: MATERIALITY_LEVELS.map((value) => ({ value, label: value[0]!.toUpperCase() + value.slice(1) })) },
        { id: 'reviewState', label: 'Review', options: REVIEW_STATES.map((value) => ({ value, label: REVIEW_STATE_META[value].label })) },
      ].map((filter) => (
        <div key={filter.id}>
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-muted">
            {filter.label}
          </span>
          <Select value={filterValue(filter.id)} onValueChange={(value) => setFilter(filter.id, value)}>
            <SelectTrigger className="h-8 w-[150px] text-[13px]" aria-label={`Filter by ${filter.label}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      <Button
        variant={compareMode ? 'evidence' : 'secondary'}
        size="sm"
        onClick={() => {
          setCompareMode(!compareMode)
          setCompareIds([])
        }}
        aria-pressed={compareMode}
      >
        <Columns2 />
        Compare
      </Button>

      <Button variant="primary" size="sm" disabled={!canWrite} onClick={() => setNewOpen(true)}>
        <Plus />
        New claim
      </Button>
    </div>
  )

  if (claims.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <div className="panel">
          <EmptyState
            title="No claims yet"
            description="Claims are extracted when records are indexed, and you can write your own. Each one is a single checkable sentence with the excerpts that support or contradict it."
            action={
              <Button variant="primary" disabled={!canWrite} onClick={() => setNewOpen(true)}>
                <Plus />
                Write the first claim
              </Button>
            }
          />
        </div>
        <NewClaimDialog
          caseId={caseId}
          chunkIndex={chunkIndex}
          open={newOpen}
          onOpenChange={setNewOpen}
          onCreated={handleCreated}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      {toolbar}

      {compareMode ? (
        <div className="mb-4 rounded-panel border border-evidence-border bg-evidence-soft px-4 py-3">
          <p className="text-[13px] text-ink">
            Compare mode — pick two claims to see them side by side with their evidence.{' '}
            <span className="text-ink-secondary">{compareIds.length} of 2 selected.</span>
          </p>
          {compareClaims.length === 2 ? (
            <div className="mt-3 grid gap-5 rounded-panel border border-line bg-canvas p-4 md:grid-cols-2">
              {compareClaims.map((claim) => (
                <CompareColumn key={claim.id} caseId={caseId} claim={claim} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="No claim matches these filters"
            description="Clear the filters to see the whole ledger."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setGlobalFilter('')
                  setColumnFilters([])
                }}
              >
                Clear filters
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* -------------------------------------------------- table (md+) */}
          <div className="hidden overflow-hidden rounded-panel border border-line bg-canvas md:block">
            {/* The ledger keeps its column widths and scrolls inside the panel
                rather than crushing the statement column. */}
            <Table className="min-w-[760px]">
              <caption className="sr-only">
                Claim ledger — {rows.length} claims with status, materiality, citation counts and
                review state
              </caption>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {compareMode ? <TableHead className="w-10">Pick</TableHead> : null}
                    {headerGroup.headers.map((header) => {
                      const sorted = header.column.getIsSorted()
                      return (
                        <TableHead key={header.id} aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}>
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === 'asc' ? (
                              <ArrowUp className="size-3" aria-hidden="true" />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className="size-3" aria-hidden="true" />
                            ) : (
                              <ChevronsUpDown className="size-3 opacity-40" aria-hidden="true" />
                            )}
                          </button>
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    interactive
                    data-state={row.original.id === selectedId ? 'selected' : undefined}
                    onClick={() => {
                      if (compareMode) toggleCompare(row.original.id)
                      else setSelectedId(row.original.id)
                    }}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        if (compareMode) toggleCompare(row.original.id)
                        else setSelectedId(row.original.id)
                      }
                    }}
                  >
                    {compareMode ? (
                      <TableCell>
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex size-4 items-center justify-center rounded-[3px] border',
                            compareIds.includes(row.original.id)
                              ? 'border-evidence bg-evidence text-white'
                              : 'border-line-strong',
                          )}
                        >
                          {compareIds.includes(row.original.id) ? '✓' : ''}
                        </span>
                      </TableCell>
                    ) : null}
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* --------------------------------------------- stacked (mobile) */}
          <ul className="space-y-3 md:hidden">
            {rows.map((row) => {
              const claim = row.original
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => (compareMode ? toggleCompare(claim.id) : setSelectedId(claim.id))}
                    className={cn(
                      'w-full rounded-panel border bg-canvas px-4 py-3 text-left',
                      claim.id === selectedId || compareIds.includes(claim.id)
                        ? 'border-evidence bg-evidence-soft'
                        : 'border-line',
                    )}
                  >
                    <p className="text-[13px] leading-snug text-ink">{claim.statement}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <ClaimStatusChip status={claim.status} size="sm" short />
                      <ReviewStateChip state={claim.reviewState} size="sm" />
                      <span className="text-[11px] capitalize text-ink-muted">
                        {claim.materiality} materiality
                      </span>
                      <CitationCounts claim={claim} />
                    </div>
                    <p className="mt-1.5 text-[11px] text-ink-muted">
                      Updated {formatRelative(claim.updatedAt)}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <p className="mt-3 text-[11px] text-ink-muted">
        {rows.length} of {claims.length} claims shown.
      </p>

      {selected && !compareMode ? (
        <DetailPortal title={truncate(selected.statement, 60)} onClose={() => setSelectedId(null)}>
          <ClaimDetail
            caseId={caseId}
            claim={selected}
            otherClaims={claims.filter((claim) => claim.id !== selected.id)}
            chunkIndex={chunkIndex}
            canWrite={canWrite}
            onClose={() => setSelectedId(null)}
          />
        </DetailPortal>
      ) : null}

      {compareMode && compareIds.length > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => setCompareIds([])}
        >
          <X />
          Clear comparison
        </Button>
      ) : null}

      <NewClaimDialog
        caseId={caseId}
        chunkIndex={chunkIndex}
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={handleCreated}
      />
    </div>
  )
}
