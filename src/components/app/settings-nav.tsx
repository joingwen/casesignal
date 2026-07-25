'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const TABS = [
  { href: '/app/settings/profile', label: 'Profile' },
  { href: '/app/settings/workspace', label: 'Workspace' },
  { href: '/app/settings/billing', label: 'Billing' },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Settings sections" className="border-b border-line px-5 lg:px-8">
      <ul className="-mb-px flex gap-5 overflow-x-auto scrollbar-slim">
        {TABS.map((tab) => {
          const active = pathname === tab.href
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex shrink-0 items-center whitespace-nowrap border-b-2 px-0.5 pb-2.5 pt-2 text-sm',
                  'transition-colors duration-200 ease-editorial',
                  'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
                  active
                    ? 'border-evidence font-medium text-ink'
                    : 'border-transparent text-ink-secondary hover:text-ink',
                )}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
