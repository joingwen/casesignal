import { ShieldAlert } from 'lucide-react'

/**
 * Shown when no authentication provider is configured and the local development
 * session is refused — which is the case for any production deployment missing
 * its Clerk keys.
 *
 * The alternative would be to offer the local cookie form, which accepts any
 * email with no password: on a public URL that is an open door, so sign-in is
 * closed instead and the operator is told exactly what to set.
 */
export function AuthUnconfigured({ action }: { action: 'sign-in' | 'sign-up' }) {
  return (
    <div className="rounded-panel border border-signal-border bg-signal-soft p-5">
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
        <div>
          <h2 className="text-[15px] font-medium text-ink">Sign-{action === 'sign-in' ? 'in' : 'up'} is not available</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
            This deployment has no authentication provider configured. CaseSignal will not fall back to its local
            development session on a public deployment, because that session accepts any address without a password.
          </p>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-secondary">
            If you operate this deployment, set{' '}
            <span className="font-mono text-[12.5px] text-ink">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</span> and{' '}
            <span className="font-mono text-[12.5px] text-ink">CLERK_SECRET_KEY</span>, then redeploy. Run{' '}
            <span className="font-mono text-[12.5px] text-ink">npm run preflight</span> to check the rest of the
            configuration.
          </p>
        </div>
      </div>
    </div>
  )
}
