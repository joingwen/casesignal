'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { Button, Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui'

/**
 * Workspace-wide UI state.
 *
 * The three regions of the case workspace (source rail, centre, context panel)
 * are rendered by the layout, but pages need to drive them: a claim row opens
 * the detail panel, a keyboard shortcut opens the add-source dialog. Rather
 * than lifting every page's state into the layout, the layout publishes the
 * handles here and pages reach for exactly the one they need.
 */

export type PanelView = 'copilot' | 'detail'

export interface WorkspaceValue {
  caseId: string
  canWrite: boolean
  addSourceOpen: boolean
  setAddSourceOpen: (open: boolean) => void
  railOpen: boolean
  setRailOpen: (open: boolean) => void
  copilotSheetOpen: boolean
  setCopilotSheetOpen: (open: boolean) => void
  shortcutsOpen: boolean
  setShortcutsOpen: (open: boolean) => void
  railCollapsed: boolean
  setRailCollapsed: (collapsed: boolean) => void
  panelCollapsed: boolean
  setPanelCollapsed: (collapsed: boolean) => void
  panelView: PanelView
  setPanelView: (view: PanelView) => void
  detailPresent: boolean
  setDetailPresent: (present: boolean) => void
  detailEl: HTMLElement | null
  setDetailEl: (el: HTMLElement | null) => void
  /** Opens the copilot wherever it currently lives (panel on xl, sheet below). */
  openCopilot: () => void
}

const WorkspaceContext = React.createContext<WorkspaceValue | null>(null)

export function useWorkspace(): WorkspaceValue {
  const value = React.useContext(WorkspaceContext)
  if (!value) throw new Error('useWorkspace must be used inside the case workspace layout.')
  return value
}

/** SSR-safe media query. Renders the "small" branch first, then corrects. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false)
  React.useEffect(() => {
    const mql = window.matchMedia(query)
    const update = () => setMatches(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [query])
  return matches
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

export function WorkspaceProvider({
  caseId,
  canWrite,
  children,
}: {
  caseId: string
  canWrite: boolean
  children: React.ReactNode
}) {
  const [addSourceOpen, setAddSourceOpen] = React.useState(false)
  const [railOpen, setRailOpen] = React.useState(false)
  const [copilotSheetOpen, setCopilotSheetOpen] = React.useState(false)
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false)
  const [railCollapsed, setRailCollapsed] = React.useState(false)
  const [panelCollapsed, setPanelCollapsed] = React.useState(false)
  const [panelView, setPanelView] = React.useState<PanelView>('copilot')
  const [detailPresent, setDetailPresent] = React.useState(false)
  const [detailEl, setDetailEl] = React.useState<HTMLElement | null>(null)

  const isXl = useMediaQuery('(min-width: 1280px)')

  const openCopilot = React.useCallback(() => {
    if (window.matchMedia('(min-width: 1280px)').matches) {
      setPanelCollapsed(false)
      setPanelView('copilot')
    } else {
      setCopilotSheetOpen(true)
    }
  }, [])

  // Derived rather than corrected in an effect: the panel can only show a
  // detail while one is mounted, and the copilot drawer only exists below xl.
  const effectivePanelView: PanelView = panelView === 'detail' && !detailPresent ? 'copilot' : panelView
  const effectiveSheetOpen = copilotSheetOpen && !isXl

  const value = React.useMemo<WorkspaceValue>(
    () => ({
      caseId,
      canWrite,
      addSourceOpen,
      setAddSourceOpen,
      railOpen,
      setRailOpen,
      copilotSheetOpen: effectiveSheetOpen,
      setCopilotSheetOpen,
      shortcutsOpen,
      setShortcutsOpen,
      railCollapsed,
      setRailCollapsed,
      panelCollapsed,
      setPanelCollapsed,
      panelView: effectivePanelView,
      setPanelView,
      detailPresent,
      setDetailPresent,
      detailEl,
      setDetailEl,
      openCopilot,
    }),
    [
      caseId,
      canWrite,
      addSourceOpen,
      railOpen,
      effectiveSheetOpen,
      shortcutsOpen,
      railCollapsed,
      panelCollapsed,
      effectivePanelView,
      detailPresent,
      detailEl,
      openCopilot,
    ],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

/**
 * Renders a page's selected-item detail into the right context panel on xl+,
 * and into a bottom/right sheet on anything narrower. Pages own the selection;
 * this only decides where the markup lands.
 */
export function DetailPortal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  const { detailEl, setDetailPresent, setPanelView, setPanelCollapsed } = useWorkspace()
  const isXl = useMediaQuery('(min-width: 1280px)')

  React.useEffect(() => {
    setDetailPresent(true)
    setPanelView('detail')
    setPanelCollapsed(false)
    return () => {
      setDetailPresent(false)
    }
  }, [setDetailPresent, setPanelView, setPanelCollapsed])

  if (isXl) {
    if (!detailEl) return null
    return createPortal(
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <h2 className="truncate text-[13px] font-medium text-ink">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close detail">
            <X />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-slim">{children}</div>
      </div>,
      detailEl,
    )
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent side="right" className="max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-0 py-0">{children}</SheetBody>
      </SheetContent>
    </Sheet>
  )
}
