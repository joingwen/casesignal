import * as React from 'react'

import { appUrl } from '@/lib/env'
import { requireCaseAccess } from '@/server/auth/guard'
import { getBrief, getShare } from '@/server/queries/case-detail'
import { BriefBuilder } from '@/components/case/brief-builder'
import { EvidenceRoomPanel } from '@/components/case/evidence-room-panel'

export default async function BriefPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  const { caseRecord, canWrite } = await requireCaseAccess(caseId)

  const [brief, share] = await Promise.all([
    getBrief(caseId, caseRecord.title),
    getShare(caseId, appUrl),
  ])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <BriefBuilder caseId={caseId} brief={brief} canWrite={canWrite} />
      <EvidenceRoomPanel caseId={caseId} share={share} canWrite={canWrite} />
    </div>
  )
}
