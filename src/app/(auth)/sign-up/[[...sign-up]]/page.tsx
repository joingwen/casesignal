import type { Metadata } from 'next'
import Link from 'next/link'

import { capabilities } from '@/lib/env'
import { LocalAuthForm } from '@/components/app/local-auth-form'
import { clerkAppearance } from '@/components/app/clerk-appearance'

export const metadata: Metadata = {
  title: 'Create a workspace',
  description: 'Create a CaseSignal workspace and start your first case file.',
}

export default async function SignUpPage() {
  return (
    <div>
      <h1 className="text-[26px] font-medium leading-tight tracking-tight text-ink">
        Create your workspace
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        Start with the records you already have. CaseSignal indexes every excerpt so each finding
        stays traceable to its page.
      </p>

      <div className="mt-7">
        {capabilities.clerkAuth ? <ClerkSignUp /> : <LocalAuthForm redirectTo="/app" />}
      </div>

      <p className="mt-6 text-sm text-ink-secondary">
        Already have a workspace?{' '}
        <Link
          href="/sign-in"
          className="rounded-[3px] font-medium text-ink underline underline-offset-4 transition-colors duration-200 ease-editorial hover:text-evidence"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}

async function ClerkSignUp() {
  const { SignUp } = await import('@clerk/nextjs')
  return <SignUp appearance={clerkAppearance} signInUrl="/sign-in" forceRedirectUrl="/app" />
}
