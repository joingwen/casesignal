'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
] as const

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently updated' },
  { value: 'created', label: 'Created' },
  { value: 'title', label: 'Title' },
] as const

export interface CaseFiltersProps {
  query: string
  status: string
  sort: string
}

/**
 * Filters live in the URL so a filtered view can be shared, bookmarked and
 * rendered on the server. The text field commits on submit rather than on every
 * keystroke, so typing never queues a request per character.
 */
export function CaseFilters({ query, status, sort }: CaseFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [draft, setDraft] = React.useState(query)
  const [committedQuery, setCommittedQuery] = React.useState(query)

  // Re-sync the field when the URL changes underneath us (back button, reset).
  if (query !== committedQuery) {
    setCommittedQuery(query)
    setDraft(query)
  }

  const apply = React.useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === 'active_default') params.delete(key)
        else params.set(key, value)
      }
      const next = params.toString()
      router.push(next ? `${pathname}?${next}` : pathname)
    },
    [pathname, router, searchParams],
  )

  const hasFilters = Boolean(query) || status !== 'active' || sort !== 'recent'
  // Rendered as explicit children so the label is present in the server HTML.
  const statusLabel = STATUS_OPTIONS.find((option) => option.value === status)?.label ?? 'Active'
  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? 'Recently updated'

  return (
    <div className="flex flex-col gap-2.5 border-b border-line px-5 py-3 lg:flex-row lg:items-center lg:px-8">
      <form
        role="search"
        className="relative min-w-0 flex-1"
        onSubmit={(event) => {
          event.preventDefault()
          apply({ q: draft.trim() })
        }}
      >
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <Input
          type="search"
          name="q"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Search titles, descriptions and objectives"
          aria-label="Search cases"
          className="pl-9"
        />
        <button type="submit" className="sr-only">
          Search
        </button>
      </form>

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 lg:w-[140px] lg:flex-none">
          <label htmlFor="case-status" className="sr-only">
            Status
          </label>
          <Select value={status} onValueChange={(value) => apply({ status: value })}>
            <SelectTrigger id="case-status" className="h-9">
              <SelectValue>{statusLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 flex-1 lg:w-[184px] lg:flex-none">
          <label htmlFor="case-sort" className="sr-only">
            Sort
          </label>
          <Select value={sort} onValueChange={(value) => apply({ sort: value })}>
            <SelectTrigger id="case-sort" className="h-9">
              <SelectValue>{sortLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft('')
              router.push(pathname)
            }}
          >
            <X aria-hidden="true" />
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  )
}
