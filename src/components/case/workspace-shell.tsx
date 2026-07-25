'use client'

import * as React from 'react'

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui'
import type { SourceListItem } from '@/server/queries/case-detail'
import { cn } from '@/lib/utils'
import { AddSourceDialog } from './add-source-dialog'
import { CaseToolbar } from './case-toolbar'
import { Shortcuts } from './shortcuts'
import { SourceRail } from './source-rail'
import { TabStrip } from './tab-strip'
import { useMediaQuery, useWorkspace } from './workspace-context'

export interface WorkspaceShellProps {
  caseId: string
  title: string
  isDemo: boolean
  isArchived: boolean
  canWrite: boolean
  sources: SourceListItem[]
  counts: { sources: number; claims: number; events: number; discrepancies: number }
  /** Server-rendered copilot, mounted once and shown in the panel or a sheet. */
  copilot: React.ReactNode
  children: React.ReactNode
}

/**
 * The three-region workspace.
 *
 * Left: the record rail — what the case is made of. Centre: the current view.
 * Right: the copilot and whatever is currently selected. The height is driven
 * by `--workspace-offset` so an outer application header can reserve its own
 * space without this shell guessing at it.
 */
export function WorkspaceShell({
  caseId,
  title,
  isDemo,
  isArchived,
  canWrite,
  sources,
  counts,
  copilot,
  children,
}: WorkspaceShellProps) {
  const {
    railOpen,
    setRailOpen,
    railCollapsed,
    panelCollapsed,
    panelView,
    setPanelView,
    detailPresent,
    setDetailEl,
    copilotSheetOpen,
    setCopilotSheetOpen,
  } = useWorkspace()

  // The copilot is stateful, so it is mounted in exactly one place at a time.
  const isXl = useMediaQuery('(min-width: 1280px)')

  /**
   * The workspace fills whatever the application shell leaves it. Measuring is
   * more honest than hard-coding the surrounding chrome's height; the CSS
   * variable below is the server-render fallback and an explicit override.
   */
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState('calc(100dvh - var(--workspace-offset, 0px))')

  React.useEffect(() => {
    function measure() {
      const element = rootRef.current
      if (!element) return
      const top = Math.round(element.getBoundingClientRect().top + window.scrollY)
      // Below lg the shell keeps a fixed bottom navigation bar in view.
      const bottom = window.matchMedia('(min-width: 1024px)').matches ? 0 : 56
      setHeight(`calc(100dvh - ${top}px - ${bottom}px)`)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  return (
    <div ref={rootRef} className="flex w-full overflow-hidden bg-page" style={{ height }}>
      {/* ------------------------------------------------------- left rail */}
      <aside
        aria-label="Records in this case"
        className={cn(
          'hidden shrink-0 border-r border-line bg-canvas lg:block',
          railCollapsed ? 'w-[52px]' : 'w-[260px]',
        )}
      >
        <SourceRail caseId={caseId} sources={sources} />
      </aside>

      <Sheet open={railOpen} onOpenChange={setRailOpen}>
        <SheetContent side="left" className="max-w-[300px]">
          <SheetHeader>
            <SheetTitle>Records</SheetTitle>
          </SheetHeader>
          <SheetBody className="px-0 py-0">
            <SourceRail
              caseId={caseId}
              sources={sources}
              collapsible={false}
              onNavigate={() => setRailOpen(false)}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* ---------------------------------------------------------- centre */}
      <div className="flex min-w-0 flex-1 flex-col">
        <CaseToolbar
          caseId={caseId}
          title={title}
          isDemo={isDemo}
          isArchived={isArchived}
          canWrite={canWrite}
          sourceCount={counts.sources}
        />
        <TabStrip caseId={caseId} counts={counts} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-slim">
          {children}
        </main>
      </div>

      {/* ------------------------------------------------------ right panel */}
      <aside
        aria-label="Copilot and selection"
        className={cn(
          'hidden shrink-0 flex-col border-l border-line bg-canvas xl:flex',
          panelCollapsed && 'xl:hidden',
          'w-[360px]',
        )}
      >
        <div
          className="flex shrink-0 items-center gap-4 border-b border-line px-4"
          role="tablist"
          aria-label="Context panel"
        >
          <button
            type="button"
            role="tab"
            aria-selected={panelView === 'copilot'}
            onClick={() => setPanelView('copilot')}
            className={cn(
              'border-b-2 px-0.5 pb-2 pt-2.5 text-[13px] transition-colors duration-200 ease-editorial',
              panelView === 'copilot'
                ? 'border-evidence font-medium text-ink'
                : 'border-transparent text-ink-secondary hover:text-ink',
            )}
          >
            Copilot
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={panelView === 'detail'}
            disabled={!detailPresent}
            onClick={() => setPanelView('detail')}
            title={detailPresent ? undefined : 'Select a claim, event or discrepancy to see its detail here.'}
            className={cn(
              'border-b-2 px-0.5 pb-2 pt-2.5 text-[13px] transition-colors duration-200 ease-editorial',
              'disabled:cursor-not-allowed disabled:text-ink-muted',
              panelView === 'detail'
                ? 'border-evidence font-medium text-ink'
                : 'border-transparent text-ink-secondary hover:text-ink',
            )}
          >
            Selected
          </button>
        </div>

        <div className={cn('min-h-0 flex-1', panelView === 'copilot' ? 'flex flex-col' : 'hidden')}>
          {isXl ? copilot : null}
        </div>
        <div
          ref={setDetailEl}
          className={cn('min-h-0 flex-1', panelView === 'detail' ? 'flex flex-col' : 'hidden')}
        />
      </aside>

      {/* Copilot as a drawer below xl. */}
      <Sheet open={copilotSheetOpen} onOpenChange={setCopilotSheetOpen}>
        <SheetContent side="right" className="max-w-md">
          <SheetHeader>
            <SheetTitle>Case copilot</SheetTitle>
          </SheetHeader>
          <SheetBody className="px-0 py-0">{!isXl && copilotSheetOpen ? copilot : null}</SheetBody>
        </SheetContent>
      </Sheet>

      <AddSourceDialog caseId={caseId} />
      <Shortcuts caseId={caseId} />
    </div>
  )
}
