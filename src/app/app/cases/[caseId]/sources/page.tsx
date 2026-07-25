import * as React from 'react'

import { requireCaseAccess } from '@/server/auth/guard'
import { getSources } from '@/server/queries/case-detail'
import { SourcesLibrary } from '@/components/case/sources-library'

export default async function SourcesPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  const { canWrite } = await requireCaseAccess(caseId)
  const sources = await getSources(caseId)

  return (
    <React.Suspense fallback={null}>
      <SourcesLibrary caseId={caseId} sources={sources} canWrite={canWrite} />
    </React.Suspense>
  )
}
