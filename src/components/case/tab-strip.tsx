'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

export interface TabStripProps {
  caseId: string
  counts: {
    sources: number
    claims: number
    events: number
    discrepancies: number
  }
}

export function TabStrip({ caseId, counts }: TabStripProps) {
  const pathname = usePathname()
  const base = `/app/cases/${caseId}`

  const tabs = [
    { href: base, label: 'Overview', count: null as number | null, exact: true },
    { href: `${base}/sources`, label: 'Sources', count: counts.sources, exact: false },
    { href: `${base}/claims`, label: 'Claims', count: counts.claims, exact: false },
    { href: `${base}/timeline`, label: 'Timeline', count: counts.events, exact: false },
    { href: `${base}/graph`, label: 'Graph', count: null, exact: false },
    { href: `${base}/brief`, label: 'Brief', count: null, exact: false },
  ]

  return (
    <nav
      aria-label="Case sections"
      className="shrink-0 overflow-x-auto border-b border-line bg-canvas scrollbar-slim"
    >
      <ul className="flex min-w-max items-stretch gap-5 px-3 sm:px-4">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-1.5 border-b-2 px-0.5 pb-2 pt-1.5 text-sm',
                  'transition-colors duration-200 ease-editorial',
                  active
                    ? 'border-evidence font-medium text-ink'
                    : 'border-transparent text-ink-secondary hover:text-ink',
                )}
              >
                {tab.label}
                {tab.count !== null ? (
                  <span className="tabular text-[11px] text-ink-muted">{tab.count}</span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
