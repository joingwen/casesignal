import * as React from 'react'

import { requireCaseAccess } from '@/server/auth/guard'
import { getGraph } from '@/server/queries/case-detail'
import { GraphCanvas } from '@/components/case/graph-canvas'

export default async function GraphPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  await requireCaseAccess(caseId)
  const graph = await getGraph(caseId)

  return <GraphCanvas caseId={caseId} graph={graph} />
}
