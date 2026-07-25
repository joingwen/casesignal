'use client'

import * as React from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui'

/**
 * The top-level recovery screen. It never shows a stack trace — server details
 * are stripped before they reach the browser — but it does show the digest so a
 * report can be matched to a server log line.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('[casesignal] route error', error)
  }, [error])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-page px-6 py-20">
      <div className="w-full max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          Something went wrong
        </p>
        <h1 className="mt-3 text-[28px] font-medium leading-tight tracking-tight text-ink">
          This screen could not be rendered.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          Nothing you saved has been lost. Retry the screen; if it fails again, go back to your cases
          and open the case directly.
        </p>

        {error.digest ? (
          <p className="mt-4 rounded-control border border-line bg-canvas px-3 py-2 font-mono text-[11px] text-ink-secondary">
            Reference: {error.digest}
          </p>
        ) : null}

        <div className="mt-7 flex flex-wrap gap-2">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="secondary">
            <Link href="/app">Go to your cases</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
