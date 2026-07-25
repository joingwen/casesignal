import { MarketingFooter } from '@/components/marketing/footer'
import { MarketingHeader } from '@/components/marketing/header'
import { MarketingShell } from '@/components/marketing/shell'
import { capabilities } from '@/lib/env'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingShell>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      {/*
        Evaluated on the server at build time, so marketing pages stay static:
        it reflects whether Clerk is configured, not who is signed in.
      */}
      <MarketingHeader clerkEnabled={capabilities.clerkAuth} />
      <main id="main">{children}</main>
      <MarketingFooter />
    </MarketingShell>
  )
}
