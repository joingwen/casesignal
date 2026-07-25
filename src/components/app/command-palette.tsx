'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { FileText, FolderPlus, Search, Settings, Sparkles } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Kbd,
  toast,
} from '@/components/ui'
import { duplicateDemoCase } from '@/server/actions/cases'
import { DEMO_BANNER } from '@/lib/domain'

export interface PaletteCase {
  id: string
  title: string
  description: string
  isDemo: boolean
}

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cases: PaletteCase[]
  /** An existing demo case, if the workspace already has one. */
  demoCaseId: string | null
}

const ITEM_CLASS = [
  'flex cursor-pointer select-none items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-sm text-ink',
  'outline-none transition-colors duration-150 ease-editorial',
  'data-[selected=true]:bg-surface',
  'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
  '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-muted',
].join(' ')

/**
 * Workspace command palette. Searches the cases the server already sent with
 * the shell, so opening it costs no request and works offline of any index.
 */
export function CommandPalette({ open, onOpenChange, cases, demoCaseId }: CommandPaletteProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  function go(href: string) {
    onOpenChange(false)
    router.push(href)
  }

  async function openDemo() {
    if (demoCaseId) {
      go(`/app/cases/${demoCaseId}`)
      return
    }
    setPending(true)
    const result = await duplicateDemoCase()
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Demo case ready.', { description: DEMO_BANNER })
    go(`/app/cases/${result.data.caseId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="top-[12%] max-w-xl translate-y-0 overflow-hidden p-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Search CaseSignal</DialogTitle>
        <DialogDescription className="sr-only">
          Search your cases or run a workspace action. Use the arrow keys to move and Enter to open.
        </DialogDescription>

        <Command label="Search CaseSignal" loop className="flex max-h-[60vh] flex-col">
          <div className="flex items-center gap-2.5 border-b border-line px-4">
            <Search className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <Command.Input
              autoFocus
              placeholder="Search cases or type an action…"
              className="h-12 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
            />
            <Kbd aria-hidden="true">esc</Kbd>
          </div>

          <Command.List className="min-h-0 flex-1 overflow-y-auto scrollbar-slim p-2">
            <Command.Empty className="px-3 py-8 text-center text-sm text-ink-secondary">
              Nothing matches that. Try part of a case title.
            </Command.Empty>

            {cases.length > 0 ? (
              <Command.Group
                heading="Cases"
                className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-muted"
              >
                {cases.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.title} ${item.description}`}
                    onSelect={() => go(`/app/cases/${item.id}`)}
                    className={ITEM_CLASS}
                  >
                    <FileText aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    {item.isDemo ? (
                      <span className="shrink-0 text-[11px] text-ink-muted">Demo</span>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-muted"
            >
              <Command.Item
                value="New case create"
                onSelect={() => go('/app/cases/new')}
                className={ITEM_CLASS}
              >
                <FolderPlus aria-hidden="true" />
                <span>New case</span>
              </Command.Item>
              <Command.Item
                value="Open demo case example fictional"
                disabled={pending}
                onSelect={() => void openDemo()}
                className={ITEM_CLASS}
              >
                <Sparkles aria-hidden="true" />
                <span>{demoCaseId ? 'Open demo case' : 'Create the demo case'}</span>
              </Command.Item>
              <Command.Item
                value="Go to settings profile workspace billing"
                onSelect={() => go('/app/settings/profile')}
                className={ITEM_CLASS}
              >
                <Settings aria-hidden="true" />
                <span>Go to settings</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
