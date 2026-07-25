import { LogOut } from 'lucide-react'

import { capabilities } from '@/lib/env'
import { Button } from '@/components/ui'
import { signOutLocal } from '@/server/actions/account'

/**
 * Sign out, in whichever mode the deployment is running.
 *
 * With Clerk configured this hands off to Clerk's own sign-out so the session
 * is revoked there too. In local mode it clears the development cookie.
 */
export async function SignOutControl() {
  const button = (
    <Button type="submit" variant="secondary">
      <LogOut aria-hidden="true" />
      Sign out
    </Button>
  )

  if (capabilities.clerkAuth) {
    const { SignOutButton } = await import('@clerk/nextjs')
    return (
      <SignOutButton redirectUrl="/">
        <Button variant="secondary">
          <LogOut aria-hidden="true" />
          Sign out
        </Button>
      </SignOutButton>
    )
  }

  return <form action={signOutLocal}>{button}</form>
}
