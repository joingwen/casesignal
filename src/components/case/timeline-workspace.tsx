'use client'

import * as React from 'react'

import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from '@/components/ui'
import type {
  DiscrepancyView,
  SourceListItem,
  TimelineEventView,
} from '@/server/queries/case-detail'
import { DiscrepancyMatrix } from './discrepancy-matrix'
import { TimelineView } from './timeline-view'

export function TimelineWorkspace({
  caseId,
  events,
  discrepancies,
  sources,
  canWrite,
}: {
  caseId: string
  events: TimelineEventView[]
  discrepancies: DiscrepancyView[]
  sources: SourceListItem[]
  canWrite: boolean
}) {
  const openCount = discrepancies.filter(
    (item) => item.reviewState === 'unreviewed' || item.reviewState === 'needs_follow_up',
  ).length

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">
            Timeline
            <TabsCount>{events.length}</TabsCount>
          </TabsTrigger>
          <TabsTrigger value="discrepancies">
            Discrepancies
            <TabsCount>{discrepancies.length}</TabsCount>
            {openCount > 0 ? (
              <span
                className="ml-1 inline-block size-1.5 rounded-full bg-signal"
                title={`${openCount} still open`}
                aria-label={`${openCount} still open`}
              />
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <TimelineView caseId={caseId} events={events} sources={sources} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="discrepancies">
          <DiscrepancyMatrix caseId={caseId} discrepancies={discrepancies} canWrite={canWrite} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
