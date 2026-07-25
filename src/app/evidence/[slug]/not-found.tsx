import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Evidence room unavailable',
  robots: { index: false, follow: false },
}

/**
 * Shown for a slug that does not exist, has been revoked, has expired or was
 * never enabled. All four cases render identically, so the page cannot be used
 * to work out which evidence rooms exist.
 */
export default function EvidenceNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-page px-5 py-16">
      <div className="w-full max-w-[520px] rounded-panel border border-line bg-canvas px-8 py-10 shadow-panel">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">Evidence room</p>
        <h1 className="mt-3 text-[26px] font-medium leading-tight tracking-tight text-ink">
          This link is no longer open.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          The evidence room you followed is not available. A published room can be closed by the analyst who
          created it, or set to expire on a date that has now passed. If you were sent this link recently, ask
          them for a current one.
        </p>
        <p className="mt-6 text-[13px] text-ink-muted">
          <Link href="/" className="underline underline-offset-4 hover:text-evidence">
            What is CaseSignal?
          </Link>
        </p>
      </div>
    </main>
  )
}
