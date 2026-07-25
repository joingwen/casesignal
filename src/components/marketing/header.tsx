'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { XIcon } from '@/components/brand/x-icon'
import { X_HANDLE, X_URL } from '@/lib/social'
import { ClerkAuthControls, ClerkAuthControlsMobile } from './auth-controls'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/product', label: 'Product' },
  { href: '/use-cases', label: 'Use Cases' },
  { href: '/security', label: 'Security' },
  { href: '/pricing', label: 'Pricing' },
]

/**
 * Marketing header. Full-bleed and visually light, it compacts slightly once the
 * page scrolls so the hero keeps the full weight of the composition.
 */
export function MarketingHeader({ clerkEnabled = false }: { clerkEnabled?: boolean }) {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-transparent bg-canvas/85 backdrop-blur-md transition-all duration-300 ease-editorial',
        scrolled && 'border-line bg-canvas/95',
      )}
    >
      <div
        className={cn(
          'mx-auto flex max-w-[1280px] items-center justify-between px-5 transition-all duration-300 ease-editorial lg:px-10',
          scrolled ? 'h-[60px]' : 'h-[72px]',
        )}
      >
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="rounded-[6px] focus-visible:outline-2 focus-visible:outline-evidence"
          aria-label="CaseSignal home"
        >
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-control px-3 py-1.5 text-[13.5px] transition-colors duration-200 ease-editorial',
                  active ? 'text-ink' : 'text-ink-secondary hover:text-ink',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/*
          The X link and the auth controls share one flex group so the header
          keeps its three-part balance — logo, centred nav, trailing actions —
          rather than becoming four evenly-spaced items.
        */}
        <div className="hidden items-center gap-1 md:flex">
          <a
            href={X_URL}
            rel="noreferrer noopener"
            target="_blank"
            aria-label={`CaseSignal on X (${X_HANDLE})`}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors duration-200 ease-editorial hover:bg-surface hover:text-ink"
          >
            <XIcon className="h-[15px] w-[15px]" />
          </a>

          {clerkEnabled ? (
            <ClerkAuthControls />
          ) : (
            <div className="flex items-center gap-2">
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
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="marketing-mobile-nav"
          className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-control text-ink md:hidden"
        >
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div id="marketing-mobile-nav" className="border-t border-line bg-canvas px-5 pb-6 pt-2 md:hidden">
          {/* Every link dismisses the menu itself, so navigating never leaves it open. */}
          <nav aria-label="Primary mobile" className="flex flex-col">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-line py-3.5 text-[17px] text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <a
            href={X_URL}
            rel="noreferrer noopener"
            target="_blank"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 border-b border-line py-3.5 text-[17px] text-ink"
          >
            <XIcon className="h-4 w-4" />
            {X_HANDLE}
          </a>

          {clerkEnabled ? (
            <ClerkAuthControlsMobile onNavigate={() => setOpen(false)} />
          ) : (
            <div className="mt-5 flex flex-col gap-2.5">
              <Link
                href="/sign-up"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-control bg-ink text-[15px] font-medium text-white"
              >
                Start a case
              </Link>
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-control border border-line-strong text-[15px] text-ink"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
