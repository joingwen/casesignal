'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import {
  Kbd,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui'
import { useWorkspace } from './workspace-context'

const SHORTCUTS: { keys: string[]; label: string; description: string }[] = [
  { keys: ['⌘', 'U'], label: 'Add source', description: 'Opens the add-source dialog. Ctrl+U on Windows and Linux.' },
  { keys: ['⌘', 'J'], label: 'Ask the copilot', description: 'Focuses the source-backed question panel. Ctrl+J elsewhere.' },
  { keys: ['G', 'S'], label: 'Go to sources', description: 'Press G, then S.' },
  { keys: ['G', 'C'], label: 'Go to claims', description: 'Press G, then C.' },
  { keys: ['G', 'T'], label: 'Go to timeline', description: 'Press G, then T.' },
  { keys: ['G', 'G'], label: 'Go to graph', description: 'Press G, then G.' },
  { keys: ['G', 'B'], label: 'Go to brief', description: 'Press G, then B.' },
  { keys: ['?'], label: 'This list', description: 'Shows the keyboard shortcuts.' },
  { keys: ['Esc'], label: 'Close', description: 'Closes dialogs, drawers and this list.' },
]

const GO_TARGETS: Record<string, string> = {
  c: 'claims',
  t: 'timeline',
  g: 'graph',
  s: 'sources',
  b: 'brief',
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function Shortcuts({ caseId }: { caseId: string }) {
  const router = useRouter()
  const {
    setAddSourceOpen,
    setRailOpen,
    setCopilotSheetOpen,
    shortcutsOpen,
    setShortcutsOpen,
    openCopilot,
  } = useWorkspace()
  const pendingGo = React.useRef<number | null>(null)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAddSourceOpen(false)
        setRailOpen(false)
        setCopilotSheetOpen(false)
        setShortcutsOpen(false)
        return
      }

      if (isTypingTarget(event.target)) return

      const mod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (mod && key === 'u') {
        event.preventDefault()
        setAddSourceOpen(true)
        return
      }
      if (mod && key === 'j') {
        event.preventDefault()
        openCopilot()
        return
      }
      if (mod || event.altKey) return

      // Keyboard layouts differ on where "?" lives, so accept both the
      // resolved character and shift+/.
      if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        event.preventDefault()
        setShortcutsOpen(true)
        return
      }

      if (pendingGo.current !== null) {
        window.clearTimeout(pendingGo.current)
        pendingGo.current = null
        const target = GO_TARGETS[key]
        if (target) {
          event.preventDefault()
          router.push(`/app/cases/${caseId}/${target}`)
        }
        return
      }

      if (key === 'g') {
        pendingGo.current = window.setTimeout(() => {
          pendingGo.current = null
        }, 1400)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (pendingGo.current !== null) window.clearTimeout(pendingGo.current)
    }
  }, [caseId, router, setAddSourceOpen, setRailOpen, setCopilotSheetOpen, setShortcutsOpen, openCopilot])

  return (
    <Sheet open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Keyboard shortcuts</SheetTitle>
          <SheetDescription>Shortcuts are ignored while you are typing in a field.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <dl className="divide-y divide-line">
            {SHORTCUTS.map((shortcut) => (
              <div key={shortcut.label} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <dt className="text-[13px] font-medium text-ink">{shortcut.label}</dt>
                  <dd className="mt-0.5 text-xs leading-relaxed text-ink-secondary">
                    {shortcut.description}
                  </dd>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {shortcut.keys.map((key, index) => (
                    <React.Fragment key={`${shortcut.label}-${key}-${index}`}>
                      {index > 0 && shortcut.keys[0] === 'G' ? (
                        <span className="text-[11px] text-ink-muted">then</span>
                      ) : null}
                      <Kbd>{key}</Kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </dl>
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
