import * as React from 'react'
import { notFound } from 'next/navigation'

import { requireCaseAccess } from '@/server/auth/guard'
import { getClaims, getSourceDetail } from '@/server/queries/case-detail'
import { SourceViewer } from '@/components/case/source-viewer'

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ caseId: string; sourceId: string }>
}) {
  const { caseId, sourceId } = await params
  await requireCaseAccess(caseId)

  const [detail, claims] = await Promise.all([getSourceDetail(caseId, sourceId), getClaims(caseId)])
  if (!detail) notFound()

  const citingClaims = claims.filter((claim) =>
    claim.evidence.some((evidence) => evidence.sourceId === sourceId),
  )

  return (
    <React.Suspense fallback={null}>
      <SourceViewer caseId={caseId} detail={detail} citingClaims={citingClaims} />
    </React.Suspense>
  )
}
