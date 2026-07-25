import * as React from 'react'

import { capabilities } from '@/lib/env'
import { requireCaseAccess } from '@/server/auth/guard'
import { getCaseOverview, getConversation, getSources } from '@/server/queries/case-detail'
import { suggestedQuestions } from '@/server/actions/copilot'
import { CopilotPanel } from '@/components/case/copilot-panel'
import { WorkspaceProvider } from '@/components/case/workspace-context'
import { WorkspaceShell } from '@/components/case/workspace-shell'

export default async function CaseWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = await params
  const { session, caseRecord, canWrite } = await requireCaseAccess(caseId)

  const [sources, overview, conversation, suggestions] = await Promise.all([
    getSources(caseId),
    getCaseOverview(caseId, caseRecord),
    getConversation(caseId, session.profile.id),
    suggestedQuestions(caseId),
  ])

  return (
    <WorkspaceProvider caseId={caseId} canWrite={canWrite}>
      <WorkspaceShell
        caseId={caseId}
        title={caseRecord.title}
        isDemo={caseRecord.isDemo}
        isArchived={caseRecord.status === 'archived'}
        canWrite={canWrite}
        sources={sources}
        counts={{
          sources: overview.counts.sources,
          claims: overview.counts.claims,
          events: overview.counts.events,
          discrepancies: overview.counts.discrepancies,
        }}
        copilot={
          <CopilotPanel
            caseId={caseId}
            initialMessages={conversation.messages}
            suggestions={suggestions}
            localAnalysis={!capabilities.anthropic}
            canWrite={canWrite}
          />
        }
      >
        {children}
      </WorkspaceShell>
    </WorkspaceProvider>
  )
}
