import { redirect } from 'next/navigation'

import { capabilities } from '@/lib/env'
import { getSession } from '@/server/auth/session'
import { listCases, findDemoCase } from '@/server/queries/cases'
import { listRecentCases } from '@/server/actions/cases'
import { getPlanState, getUsageSnapshot } from '@/server/billing/limits'
import { AppShell } from '@/components/app/app-shell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/sign-in')

  const [recent, allCases, usage, planState, demoCaseId] = await Promise.all([
    listRecentCases(6),
    listCases(session, { status: 'all' }),
    getUsageSnapshot(session.organization.id),
    getPlanState(session.organization.id),
    findDemoCase(session),
  ])

  const activeCases = usage.find((entry) => entry.metric === 'active_cases') ?? usage[0]

  return (
    <AppShell
      user={{
        name: session.profile.displayName,
        email: session.profile.email,
        avatarUrl: session.profile.avatarUrl,
      }}
      workspace={{ name: session.organization.name }}
      planName={planState.plan.name}
      recentCases={recent.map((item) => ({ id: item.id, title: item.title }))}
      paletteCases={allCases.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        isDemo: item.isDemo,
      }))}
      demoCaseId={demoCaseId}
      usage={{
        label: activeCases.label,
        used: activeCases.used,
        limit: activeCases.limit,
        ratio: activeCases.ratio,
        unit: activeCases.unit,
      }}
      clerkAuth={capabilities.clerkAuth}
    >
      {children}
    </AppShell>
  )
}
