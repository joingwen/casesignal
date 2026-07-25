import Link from 'next/link'
import type { Metadata } from 'next'

import { Button } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Page not found',
}

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-page px-6 py-20">
      <div className="w-full max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">Error 404</p>
        <h1 className="mt-3 text-[28px] font-medium leading-tight tracking-tight text-ink">
          This page is not in the record.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          The address you followed does not match anything in CaseSignal. It may have been renamed, or
          the case it pointed at may have been deleted.
        </p>
        <div className="mt-7 flex flex-wrap gap-2">
          <Button asChild variant="primary">
            <Link href="/app">Go to your cases</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Back to the homepage</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
