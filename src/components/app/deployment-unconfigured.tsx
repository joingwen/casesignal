import Link from 'next/link'
import { ServerCrash } from 'lucide-react'

import { Logo } from '@/components/brand/logo'

/**
 * Shown when the application cannot start because a deployment is missing
 * configuration it cannot run without — currently only a database.
 *
 * This is deliberately not the generic error boundary. Retrying will never help,
 * so the screen says what is missing and who can fix it instead of inviting the
 * visitor to try again.
 */
export function DeploymentUnconfigured({ variable, message }: { variable: string; message: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <header className="border-b border-line bg-canvas px-5 py-4 lg:px-10">
        <Link href="/" aria-label="CaseSignal home">
          <Logo />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center px-5 py-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">Deployment not configured</p>
        <h1 className="mt-4 text-[30px] font-semibold leading-tight tracking-tight text-ink lg:text-[36px]">
          CaseSignal cannot start here yet.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-secondary">{message}</p>

        <div className="mt-7 rounded-panel border border-signal-border bg-signal-soft p-5">
          <div className="flex gap-3">
            <ServerCrash className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
            <div>
              <p className="text-[13.5px] font-medium text-ink">
                Missing: <span className="font-mono text-[12.5px]">{variable}</span>
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
                If you operate this deployment, set it in your hosting provider&rsquo;s environment variables and
                redeploy. Run <span className="font-mono text-[12.5px] text-ink">npm run preflight</span> to check
                everything else before you do.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-7 text-[13px] text-ink-muted">
          Nothing you saved has been lost — the application has not started, so nothing was written.
        </p>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-control border border-line-strong bg-canvas px-5 text-[14px] font-medium text-ink transition-colors duration-200 hover:bg-surface"
          >
            Back to the site
          </Link>
        </div>
      </main>
    </div>
  )
}
