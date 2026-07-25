'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FolderPlus,
  Gauge,
  LogOut,
  Search,
  Settings,
  Share2,
  SquareStack,
  UserRound,
} from 'lucide-react'

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Kbd,
  Tip,
  UserAvatar,
  toast,
} from '@/components/ui'
import { cn, formatBytes, initialsOf } from '@/lib/utils'
import { signOutLocal } from '@/server/actions/account'
import { CaseSignalMark } from '@/components/app/case-signal-mark'
import { CommandPalette, type PaletteCase } from '@/components/app/command-palette'

export interface ShellUsage {
  label: string
  used: number
  limit: number
  ratio: number
  unit: 'count' | 'bytes'
}

export interface AppShellProps {
  children: React.ReactNode
  user: { name: string; email: string; avatarUrl: string | null }
  workspace: { name: string }
  planName: string
  recentCases: { id: string; title: string }[]
  paletteCases: PaletteCase[]
  demoCaseId: string | null
  usage: ShellUsage
  clerkAuth: boolean
}

interface NavEntry {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  /** Match nested routes as well as the exact path. */
  prefix?: string
}

const NAV: NavEntry[] = [
  { href: '/app', label: 'Cases', icon: SquareStack },
  { href: '/app/shared', label: 'Shared', icon: Share2, prefix: '/app/shared' },
  { href: '/app/usage', label: 'Usage', icon: Gauge, prefix: '/app/usage' },
  { href: '/app/settings/profile', label: 'Settings', icon: Settings, prefix: '/app/settings' },
]

const PAGE_TITLES: { prefix: string; title: string }[] = [
  { prefix: '/app/cases/new', title: 'New case' },
  { prefix: '/app/cases', title: 'Case' },
  { prefix: '/app/settings/billing', title: 'Billing' },
  { prefix: '/app/settings/workspace', title: 'Workspace' },
  { prefix: '/app/settings', title: 'Settings' },
  { prefix: '/app/onboarding', title: 'Get started' },
  { prefix: '/app/shared', title: 'Shared' },
  { prefix: '/app/usage', title: 'Usage' },
]

function isActive(pathname: string, entry: NavEntry) {
  if (entry.prefix) return pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`)
  return pathname === entry.href
}

function formatUsage(value: number, unit: 'count' | 'bytes') {
  return unit === 'bytes' ? formatBytes(value) : value.toLocaleString('en-US')
}

export function AppShell({
  children,
  user,
  workspace,
  planName,
  recentCases,
  paletteCases,
  demoCaseId,
  usage,
  clerkAuth,
}: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const [recentOpen, setRecentOpen] = React.useState(false)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setPaletteOpen((current) => !current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const pageTitle = PAGE_TITLES.find((entry) => pathname.startsWith(entry.prefix))?.title ?? 'Cases'

  async function onSignOut() {
    if (clerkAuth) {
      const clerk = (window as unknown as { Clerk?: { signOut: () => Promise<void> } }).Clerk
      if (!clerk) {
        toast.error('Sign-out is still loading. Try again in a moment.')
        return
      }
      await clerk.signOut()
      router.push('/')
      return
    }
    await signOutLocal()
  }

  const userMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-2.5 rounded-control px-2 py-2 text-left',
            'transition-colors duration-200 ease-editorial hover:bg-surface',
            'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
          )}
        >
          <UserAvatar name={user.name} src={user.avatarUrl} className="size-7" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">{user.name}</span>
            <span className="block truncate text-[11px] text-ink-muted">{user.email}</span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-[216px]">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/settings/profile">
            <UserRound aria-hidden="true" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/settings/workspace">
            <Building2 aria-hidden="true" />
            Workspace
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/settings/billing">
            <CreditCard aria-hidden="true" />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void onSignOut()}>
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="min-h-dvh bg-page">
      {/* ---------------------------------------------------- desktop rail */}
      <aside
        aria-label="Workspace navigation"
        className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-line bg-canvas lg:flex"
      >
        <div className="px-3 pb-2 pt-4">
          <Link
            href="/app"
            className={cn(
              'inline-flex items-center gap-2 rounded-control px-2 py-1.5 text-ink',
              'transition-colors duration-200 ease-editorial hover:bg-surface',
              'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
            )}
          >
            <CaseSignalMark className="size-[18px]" />
            <span className="text-[14px] font-medium tracking-tight">CaseSignal</span>
          </Link>
        </div>

        {/* Workspace switcher */}
        <div className="px-3 pb-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 rounded-control border border-line px-2 py-1.5 text-left',
                  'transition-colors duration-200 ease-editorial hover:bg-surface',
                  'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center rounded-[5px] bg-surface text-[10px] font-medium uppercase text-ink-secondary"
                >
                  {initialsOf(workspace.name) || 'W'}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{workspace.name}</span>
                <ChevronDown className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[216px]">
              <DropdownMenuLabel>Workspace</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/app/settings/workspace">
                  <Building2 aria-hidden="true" />
                  <span className="truncate">{workspace.name}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <Tip
                content={
                  clerkAuth
                    ? 'Create additional workspaces from your Clerk organization settings.'
                    : 'Team workspaces are available with Clerk organizations'
                }
              >
                <div>
                  <DropdownMenuItem disabled>
                    <FolderPlus aria-hidden="true" />
                    Create workspace
                  </DropdownMenuItem>
                </div>
              </Tip>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav aria-label="Sections" className="min-h-0 flex-1 overflow-y-auto scrollbar-slim px-2 pb-4">
          <ul className="flex flex-col gap-0.5">
            {NAV.map((entry) => {
              const active = isActive(pathname, entry)
              const Icon = entry.icon
              return (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center gap-2.5 rounded-control py-1.5 pl-3 pr-2 text-[13px]',
                      'transition-colors duration-200 ease-editorial',
                      'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
                      active
                        ? 'bg-surface font-medium text-ink'
                        : 'text-ink-secondary hover:bg-surface/60 hover:text-ink',
                    )}
                  >
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-evidence"
                      />
                    ) : null}
                    <Icon className="size-4 shrink-0 text-ink-muted" />
                    {entry.label}
                  </Link>
                </li>
              )
            })}

            {/* Recent — expandable */}
            <li className="mt-1">
              <button
                type="button"
                onClick={() => setRecentOpen((open) => !open)}
                aria-expanded={recentOpen}
                aria-controls="rail-recent"
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-control py-1.5 pl-3 pr-2 text-[13px]',
                  'text-ink-secondary transition-colors duration-200 ease-editorial',
                  'hover:bg-surface/60 hover:text-ink',
                  'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
                )}
              >
                <ChevronRight
                  className={cn(
                    'size-4 shrink-0 text-ink-muted transition-transform duration-200 ease-editorial',
                    recentOpen && 'rotate-90',
                  )}
                  aria-hidden="true"
                />
                Recent
                <span className="ml-auto tabular text-[11px] text-ink-muted">
                  {recentCases.length}
                </span>
              </button>

              {recentOpen ? (
                <ul id="rail-recent" className="mb-1 mt-0.5 flex flex-col gap-0.5 pl-[26px] pr-2">
                  {recentCases.length === 0 ? (
                    <li className="px-2 py-1.5 text-[12px] text-ink-muted">No cases yet.</li>
                  ) : (
                    recentCases.map((item) => {
                      const active = pathname.startsWith(`/app/cases/${item.id}`)
                      return (
                        <li key={item.id}>
                          <Link
                            href={`/app/cases/${item.id}`}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'block truncate rounded-control px-2 py-1.5 text-[12.5px]',
                              'transition-colors duration-200 ease-editorial',
                              'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
                              active
                                ? 'bg-surface font-medium text-ink'
                                : 'text-ink-secondary hover:bg-surface/60 hover:text-ink',
                            )}
                          >
                            {item.title}
                          </Link>
                        </li>
                      )
                    })
                  )}
                </ul>
              ) : null}
            </li>
          </ul>
        </nav>

        {/* Usage meter + user */}
        <div className="border-t border-line px-3 py-3">
          <Link
            href="/app/usage"
            className={cn(
              'block rounded-control px-2 py-1.5',
              'transition-colors duration-200 ease-editorial hover:bg-surface',
              'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
            )}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wide text-ink-muted">
                {usage.label}
              </span>
              <span className="tabular text-[11px] text-ink-secondary">
                {formatUsage(usage.used, usage.unit)} / {formatUsage(usage.limit, usage.unit)}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-surface"
            >
              <span
                className={cn(
                  'block h-full rounded-full transition-[width] duration-500 ease-editorial',
                  usage.ratio >= 1
                    ? 'bg-status-contradicted'
                    : usage.ratio >= 0.8
                      ? 'bg-signal'
                      : 'bg-evidence',
                )}
                style={{ width: `${Math.round(usage.ratio * 100)}%` }}
              />
            </span>
            <span className="mt-1.5 block text-[11px] text-ink-muted">{planName} plan</span>
          </Link>

          <div className="mt-1.5 border-t border-line pt-1.5">{userMenu}</div>
        </div>
      </aside>

      {/* ------------------------------------------------------- mobile top */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas px-4 lg:hidden">
        <Link href="/app" className="flex shrink-0 items-center gap-2 rounded-[3px] text-ink">
          <CaseSignalMark className="size-[18px]" />
          <span className="sr-only">CaseSignal</span>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-[15px] font-medium tracking-tight text-ink">
          {pageTitle}
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPaletteOpen(true)}
          aria-label="Search cases"
        >
          <Search aria-hidden="true" />
        </Button>
      </header>

      {/* ------------------------------------------------------------- main */}
      <div className="lg:pl-[240px]">
        <div className="hidden justify-end gap-2 border-b border-line bg-canvas px-6 py-2 lg:flex">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={cn(
              'flex items-center gap-2 rounded-control border border-line px-2.5 py-1.5',
              'text-[12.5px] text-ink-muted transition-colors duration-200 ease-editorial',
              'hover:border-line-strong hover:text-ink-secondary',
              'focus-visible:outline-2 focus-visible:outline-evidence focus-visible:outline-offset-2',
            )}
          >
            <Search className="size-3.5" aria-hidden="true" />
            Search cases
            <span className="ml-2 flex items-center gap-0.5">
              <Kbd aria-hidden="true">⌘</Kbd>
              <Kbd aria-hidden="true">K</Kbd>
            </span>
          </button>
        </div>

        <main className="min-h-[calc(100dvh-3.5rem)] pb-[calc(56px+env(safe-area-inset-bottom))] lg:min-h-dvh lg:pb-0">
          {children}
        </main>
      </div>

      {/* ---------------------------------------------------- mobile bottom */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="grid h-14 grid-cols-4">
          <li>
            <Link
              href="/app"
              aria-current={pathname === '/app' ? 'page' : undefined}
              className={cn(
                'flex h-full flex-col items-center justify-center gap-1 text-[11px]',
                pathname === '/app' ? 'text-ink' : 'text-ink-muted',
              )}
            >
              <SquareStack className="size-[18px]" aria-hidden="true" />
              Cases
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] text-ink-muted"
            >
              <Search className="size-[18px]" aria-hidden="true" />
              Search
            </button>
          </li>
          <li>
            <Link
              href="/app/cases/new"
              aria-current={pathname === '/app/cases/new' ? 'page' : undefined}
              className={cn(
                'flex h-full flex-col items-center justify-center gap-1 text-[11px]',
                pathname === '/app/cases/new' ? 'text-ink' : 'text-ink-muted',
              )}
            >
              <FolderPlus className="size-[18px]" aria-hidden="true" />
              New
            </Link>
          </li>
          <li>
            <Link
              href="/app/settings/profile"
              aria-current={pathname.startsWith('/app/settings') ? 'page' : undefined}
              className={cn(
                'flex h-full flex-col items-center justify-center gap-1 text-[11px]',
                pathname.startsWith('/app/settings') ? 'text-ink' : 'text-ink-muted',
              )}
            >
              <Settings className="size-[18px]" aria-hidden="true" />
              Settings
            </Link>
          </li>
        </ul>
      </nav>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        cases={paletteCases}
        demoCaseId={demoCaseId}
      />
    </div>
  )
}
