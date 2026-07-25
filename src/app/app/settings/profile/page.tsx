import type { Metadata } from 'next'

import { requireSession } from '@/server/auth/session'
import { capabilities } from '@/lib/env'
import { ProfileForm } from '@/components/app/profile-form'
import { SignOutControl } from '@/components/app/sign-out-control'

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Your name, role and sign-in details.',
}

export default async function ProfileSettingsPage() {
  const session = await requireSession()

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="text-[17px] font-medium tracking-tight text-ink">
          Profile
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
          How you appear on cases you create in this workspace.
        </p>

        <div className="mt-5">
          <ProfileForm
            displayName={session.profile.displayName}
            role={session.profile.role}
            primaryUseCase={session.profile.primaryUseCase}
          />
        </div>
      </section>

      <section aria-labelledby="account-heading" className="border-t border-line pt-8">
        <h2 id="account-heading" className="text-[17px] font-medium tracking-tight text-ink">
          Account
        </h2>

        <dl className="mt-4 divide-y divide-line border-y border-line">
          <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:items-baseline sm:gap-4">
            <dt className="text-[12.5px] uppercase tracking-wide text-ink-muted">Email</dt>
            <dd className="break-all text-sm text-ink">{session.profile.email}</dd>
          </div>
          <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:items-baseline sm:gap-4">
            <dt className="text-[12.5px] uppercase tracking-wide text-ink-muted">Workspace role</dt>
            <dd className="text-sm capitalize text-ink">{session.membershipRole}</dd>
          </div>
          <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:items-baseline sm:gap-4">
            <dt className="text-[12.5px] uppercase tracking-wide text-ink-muted">
              Authentication
            </dt>
            <dd className="text-sm text-ink">
              {capabilities.clerkAuth ? (
                'Clerk'
              ) : (
                <>
                  Local development session
                  <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-secondary">
                    Clerk is not configured, so your identity is stored in a cookie on this machine.
                    Email changes are made by signing in again with a different address.
                  </span>
                </>
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-5">
          <SignOutControl />
        </div>
      </section>
    </div>
  )
}
