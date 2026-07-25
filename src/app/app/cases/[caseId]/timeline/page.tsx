import * as React from 'react'

import { requireCaseAccess } from '@/server/auth/guard'
import { getDiscrepancies, getSources, getTimeline } from '@/server/queries/case-detail'
import { TimelineWorkspace } from '@/components/case/timeline-workspace'

export default async function TimelinePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  const { canWrite } = await requireCaseAccess(caseId)

  const [events, discrepancies, sources] = await Promise.all([
    getTimeline(caseId),
    getDiscrepancies(caseId),
    getSources(caseId),
  ])

  return (
    <TimelineWorkspace
      caseId={caseId}
      events={events}
      discrepancies={discrepancies}
      sources={sources}
      canWrite={canWrite}
    />
  )
}
