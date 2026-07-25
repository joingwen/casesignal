import type { ReactNode } from 'react'

import { capabilities } from '@/lib/env'
import { TooltipRoot } from '@/components/ui'

/**
 * Application-wide providers.
 *
 * `ClerkProvider` throws when it is rendered without publishable/secret keys,
 * so it is imported *and* rendered only when the capability flag says the keys
 * are present. In local development mode the tree is identical minus Clerk, so
 * nothing downstream has to branch.
 */
export async function AppProviders({ children }: { children: ReactNode }) {
  const tree = <TooltipRoot>{children}</TooltipRoot>

  if (!capabilities.clerkAuth) return tree

  const { ClerkProvider } = await import('@clerk/nextjs')
  return <ClerkProvider>{tree}</ClerkProvider>
}
