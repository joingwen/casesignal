import * as React from 'react'

import { requireCaseAccess } from '@/server/auth/guard'
import { getClaims, getSourceDetail, getSources } from '@/server/queries/case-detail'
import { ClaimsLedger } from '@/components/case/claims-ledger'
import type { ChunkIndexItem } from '@/components/case/claim-detail'
import { truncate } from '@/lib/utils'

/** Cap on the excerpt picker so a very large case cannot blow up the payload. */
const MAX_INDEXED_CHUNKS = 400

export default async function ClaimsPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  const { canWrite } = await requireCaseAccess(caseId)

  const [claims, sources] = await Promise.all([getClaims(caseId), getSources(caseId)])

  const citable = sources.filter((source) => source.status === 'complete' || source.status === 'needs_review')
  const details = await Promise.all(citable.map((source) => getSourceDetail(caseId, source.id)))

  const chunkIndex: ChunkIndexItem[] = []
  for (const detail of details) {
    if (!detail) continue
    for (const chunk of detail.chunks) {
      if (chunkIndex.length >= MAX_INDEXED_CHUNKS) break
      chunkIndex.push({
        id: chunk.id,
        sourceId: detail.id,
        sourceLabel: detail.label,
        sourceTitle: detail.title,
        locator: chunk.locator,
        text: truncate(chunk.text, 320),
      })
    }
  }

  return (
    <React.Suspense fallback={null}>
      <ClaimsLedger caseId={caseId} claims={claims} chunkIndex={chunkIndex} canWrite={canWrite} />
    </React.Suspense>
  )
}
