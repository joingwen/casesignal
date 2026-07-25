import type { Metadata } from 'next'
import Link from 'next/link'

import { capabilities } from '@/lib/env'
import { LocalAuthForm } from '@/components/app/local-auth-form'
import { AuthUnconfigured } from '@/components/app/auth-unconfigured'
import { clerkAppearance } from '@/components/app/clerk-appearance'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your CaseSignal workspace.',
}

export default async function SignInPage() {
  return (
    <div>
      <h1 className="text-[26px] font-medium leading-tight tracking-tight text-ink">
        Sign in to CaseSignal
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        Your cases stay in your workspace. Every claim keeps the citation it came from, so you can
        always check the record yourself.
      </p>

      <div className="mt-7">
        {capabilities.clerkAuth ? (
          <ClerkSignIn />
        ) : capabilities.localAuth ? (
          <LocalAuthForm redirectTo="/app" />
        ) : (
          <AuthUnconfigured action="sign-in" />
        )}
      </div>

      <p className="mt-6 text-sm text-ink-secondary">
        New here?{' '}
        <Link
          href="/sign-up"
          className="rounded-[3px] font-medium text-ink underline underline-offset-4 transition-colors duration-200 ease-editorial hover:text-evidence"
        >
          Create a workspace
        </Link>
      </p>
    </div>
  )
}

async function ClerkSignIn() {
  const { SignIn } = await import('@clerk/nextjs')
  return <SignIn appearance={clerkAppearance} signUpUrl="/sign-up" forceRedirectUrl="/app" />
}
