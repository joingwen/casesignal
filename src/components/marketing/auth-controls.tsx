'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Show, UserButton } from '@clerk/nextjs'

import { clerkAppearance } from '@/components/app/clerk-appearance'
import { cn } from '@/lib/utils'

/**
 * Marketing header auth controls.
 *
 * Rendered only when Clerk is configured — the components below require a
 * `ClerkProvider`, which `AppProviders` mounts on the same condition. In local
 * development mode the header falls back to plain links instead.
 *
 * Signed out: sign in + start a case. Signed in: a direct route back into the
 * workspace, plus the account control, so a returning visitor never has to
 * work out where their cases went.
 */
export function ClerkAuthControls({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Show when="signed-out">
        <Link
          href="/sign-in"
          className="rounded-control px-3 py-1.5 text-[13.5px] text-ink-secondary transition-colors duration-200 hover:text-ink"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className="group inline-flex items-center gap-1.5 rounded-control bg-ink px-3.5 py-2 text-[13.5px] font-medium text-white transition-colors duration-200 ease-editorial hover:bg-ink/90"
        >
          Start a Case
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 ease-editorial group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </Show>

      <Show when="signed-in">
        <Link
          href="/app"
          className="group inline-flex items-center gap-1.5 rounded-control bg-ink px-3.5 py-2 text-[13.5px] font-medium text-white transition-colors duration-200 ease-editorial hover:bg-ink/90"
        >
          Open workspace
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 ease-editorial group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
        <UserButton appearance={clerkAppearance} />
      </Show>
    </div>
  )
}

/** Mobile equivalent, shown inside the collapsed navigation panel. */
export function ClerkAuthControlsMobile({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="mt-5 flex flex-col gap-2.5">
      <Show when="signed-out">
        <Link
          href="/sign-up"
          onClick={onNavigate}
          className="inline-flex h-11 items-center justify-center rounded-control bg-ink text-[15px] font-medium text-white"
        >
          Start a case
        </Link>
        <Link
          href="/sign-in"
          onClick={onNavigate}
          className="inline-flex h-11 items-center justify-center rounded-control border border-line-strong text-[15px] text-ink"
        >
          Sign in
        </Link>
      </Show>

      <Show when="signed-in">
        <Link
          href="/app"
          onClick={onNavigate}
          className="inline-flex h-11 items-center justify-center rounded-control bg-ink text-[15px] font-medium text-white"
        >
          Open workspace
        </Link>
        <div className="flex items-center gap-2.5 px-1 pt-1">
          <UserButton appearance={clerkAppearance} />
          <span className="text-[13.5px] text-ink-secondary">Your account</span>
        </div>
      </Show>
    </div>
  )
}
