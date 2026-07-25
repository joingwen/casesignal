import type { Metadata } from 'next'

import { requireSession } from '@/server/auth/session'
import { PageHeader } from '@/components/app/page-header'
import { NewCaseWizard } from '@/components/app/new-case-wizard'

export const metadata: Metadata = {
  title: 'New case',
  description: 'Create a new case file.',
}

export default async function NewCasePage() {
  await requireSession()

  return (
    <>
      <PageHeader
        eyebrow="New case"
        title="Open a case file"
        description="Four short steps. The case exists only in your workspace until you explicitly share it."
      />
      <NewCaseWizard />
    </>
  )
}
