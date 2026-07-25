import type { Metadata } from 'next'

import { requireSession } from '@/server/auth/session'
import { findDemoCase } from '@/server/queries/cases'
import { PageHeader } from '@/components/app/page-header'
import { OnboardingFlow } from '@/components/app/onboarding-flow'

export const metadata: Metadata = {
  title: 'Get started',
  description: 'Set up your CaseSignal workspace and open your first case.',
}

export default async function OnboardingPage() {
  const session = await requireSession()
  const demoCaseId = await findDemoCase(session)

  return (
    <>
      <PageHeader
        eyebrow="Setup"
        title="Welcome to CaseSignal"
        description="Three short questions, then you are in. Nothing here is published and everything can be changed later."
      />
      <OnboardingFlow
        defaultRole={session.profile.role}
        defaultUseCase={session.profile.primaryUseCase}
        demoCaseId={demoCaseId}
      />
    </>
  )
}
