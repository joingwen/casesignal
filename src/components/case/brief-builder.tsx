'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Check, Download, Eye, Loader2, RefreshCw, Sparkles } from 'lucide-react'

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Textarea,
  toast,
} from '@/components/ui'
import { NEUTRALITY_DISCLAIMER } from '@/lib/domain'
import { scanCitations } from '@/lib/citations'
import type { BriefView } from '@/server/queries/case-detail'
import {
  generateBrief,
  recordExport,
  renderBriefMarkdown,
  reorderBriefSections,
  updateBriefSection,
} from '@/server/actions/brief'
import { cn, formatRelative } from '@/lib/utils'

/** Renders brief prose with its citation markers visually marked. */
function Prose({ body }: { body: string }) {
  const nodes = React.useMemo(() => {
    const { spans } = scanCitations(body)
    const output: React.ReactNode[] = []
    let cursor = 0
    spans.forEach((span, index) => {
      if (span.start > cursor) output.push(body.slice(cursor, span.start))
      output.push(
        <span key={`c-${index}`} className="excerpt-mark font-mono text-[0.85em]">
          {span.raw}
        </span>,
      )
      cursor = span.end
    })
    if (cursor < body.length) output.push(body.slice(cursor))
    return output
  }, [body])

  return <div className="whitespace-pre-wrap text-[14px] leading-[1.75] text-ink">{nodes}</div>
}

export function BriefBuilder({
  caseId,
  brief,
  canWrite,
}: {
  caseId: string
  brief: BriefView
  canWrite: boolean
}) {
  const router = useRouter()

  const [sections, setSections] = React.useState(brief.sections)
  const [selectedId, setSelectedId] = React.useState(brief.sections[0]?.id ?? '')
  const [body, setBody] = React.useState(brief.sections[0]?.body ?? '')
  const [dirty, setDirty] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [savedAt, setSavedAt] = React.useState<string | null>(null)
  const [generating, setGenerating] = React.useState<'all' | 'section' | null>(null)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [exporting, setExporting] = React.useState<'markdown' | 'pdf' | null>(null)

  // Server state is re-seeded during render — an effect here would show one
  // frame of the previous section's text before correcting itself.
  const [loadedSections, setLoadedSections] = React.useState(brief.sections)
  if (loadedSections !== brief.sections) {
    setLoadedSections(brief.sections)
    setSections(brief.sections)
  }

  const selected = sections.find((section) => section.id === selectedId) ?? sections[0] ?? null

  const [loadedBodyKey, setLoadedBodyKey] = React.useState(
    selected ? `${selected.id}:${selected.updatedAt}` : '',
  )
  const bodyKey = selected ? `${selected.id}:${selected.updatedAt}` : ''
  if (selected && loadedBodyKey !== bodyKey && !dirty) {
    setLoadedBodyKey(bodyKey)
    setBody(selected.body)
  } else if (loadedBodyKey !== bodyKey && !selected) {
    setLoadedBodyKey(bodyKey)
  }

  /* -------------------------------------- autosave + unsaved-change guard */
  React.useEffect(() => {
    if (!dirty || !selected || !canWrite) return
    const timer = window.setTimeout(async () => {
      setSaving(true)
      const result = await updateBriefSection({ caseId, sectionId: selected.id, body })
      setSaving(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setDirty(false)
      setSavedAt(new Date().toISOString())
      router.refresh()
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [body, dirty, selected, caseId, canWrite, router])

  React.useEffect(() => {
    if (!dirty) return
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function flush() {
    if (!dirty || !selected || !canWrite) return
    setSaving(true)
    const result = await updateBriefSection({ caseId, sectionId: selected.id, body })
    setSaving(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setDirty(false)
  }

  async function selectSection(id: string) {
    await flush()
    setSelectedId(id)
  }

  async function toggleInclude(sectionId: string, included: boolean) {
    setSections((current) =>
      current.map((section) => (section.id === sectionId ? { ...section, included } : section)),
    )
    const result = await updateBriefSection({ caseId, sectionId, included })
    if (!result.ok) {
      setSections(brief.sections)
      toast.error(result.error)
      return
    }
    router.refresh()
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...sections]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved!)
    setSections(next)
    const result = await reorderBriefSections(caseId, next.map((section) => section.id))
    if (!result.ok) {
      setSections(brief.sections)
      toast.error(result.error)
      return
    }
    router.refresh()
  }

  async function generate(sectionKey?: string) {
    setGenerating(sectionKey ? 'section' : 'all')
    const result = await generateBrief(
      sectionKey
        ? { caseId, sectionKey: sectionKey as Parameters<typeof generateBrief>[0]['sectionKey'] }
        : { caseId },
    )
    setGenerating(null)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(
      `${result.data.sections} section${result.data.sections === 1 ? '' : 's'} drafted from the cited record.`,
    )
    router.refresh()
  }

  async function exportMarkdown() {
    setExporting('markdown')
    try {
      const markdown = await renderBriefMarkdown(caseId)
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${brief.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`
      anchor.click()
      URL.revokeObjectURL(url)
      await recordExport(caseId, 'markdown', blob.size)
      toast.success('Brief exported as Markdown.')
    } catch {
      toast.error('The brief could not be rendered for export.')
    } finally {
      setExporting(null)
    }
  }

  async function exportPdf() {
    setExporting('pdf')
    try {
      const response = await fetch(`/api/cases/${caseId}/export/pdf`, { method: 'POST' })
      if (!response.ok) {
        let message = `Export failed (${response.status}).`
        try {
          const payload = (await response.json()) as { error?: string }
          if (payload.error) message = payload.error
        } catch {
          /* keep the status message */
        }
        toast.error(message)
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${brief.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success('Brief exported as PDF.')
    } catch {
      toast.error('The PDF export could not be reached.')
    } finally {
      setExporting(null)
    }
  }

  const included = sections.filter((section) => section.included)

  return (
    <div className="space-y-4">
      {/* --------------------------------------------------------- actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          loading={generating === 'all'}
          disabled={!canWrite}
          onClick={() => void generate()}
        >
          <Sparkles />
          Generate draft
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
          <Eye />
          Preview
        </Button>
        <Button
          variant="secondary"
          size="sm"
          loading={exporting === 'markdown'}
          onClick={() => void exportMarkdown()}
        >
          <Download />
          Export Markdown
        </Button>
        <Button
          variant="secondary"
          size="sm"
          loading={exporting === 'pdf'}
          onClick={() => void exportPdf()}
        >
          <Download />
          Export PDF
        </Button>
        {brief.generatedAt ? (
          <span className="text-[11px] text-ink-muted">
            Last generated {formatRelative(brief.generatedAt)}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 2xl:grid-cols-[240px_minmax(0,1fr)]">
        {/* ------------------------------------------------------ sections */}
        <nav aria-label="Brief sections" className="panel overflow-hidden">
          <div className="border-b border-line px-3 py-2">
            <h2 className="text-[13px] font-medium text-ink">Sections</h2>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              {included.length} of {sections.length} included
            </p>
          </div>
          <ul className="divide-y divide-line">
            {sections.map((section, index) => (
              <li
                key={section.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-2',
                  section.id === selected?.id && 'bg-evidence-soft',
                )}
              >
                <Checkbox
                  checked={section.included}
                  disabled={!canWrite}
                  aria-label={`Include ${section.title}`}
                  onCheckedChange={(value) => void toggleInclude(section.id, value === true)}
                />
                <button
                  type="button"
                  onClick={() => void selectSection(section.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span
                    className={cn(
                      'block truncate text-[13px]',
                      section.included ? 'text-ink' : 'text-ink-muted line-through',
                    )}
                  >
                    {section.title}
                  </span>
                  <span className="block truncate text-[11px] text-ink-muted">
                    {section.body.trim() ? `${section.body.trim().split(/\s+/).length} words` : 'Empty'}
                  </span>
                </button>
                <span className="flex flex-col">
                  <button
                    type="button"
                    disabled={!canWrite || index === 0}
                    onClick={() => void move(index, -1)}
                    aria-label={`Move ${section.title} up`}
                    className="text-ink-muted disabled:opacity-30 hover:text-ink"
                  >
                    <ArrowUp className="size-3" />
                  </button>
                  <button
                    type="button"
                    disabled={!canWrite || index === sections.length - 1}
                    onClick={() => void move(index, 1)}
                    aria-label={`Move ${section.title} down`}
                    className="text-ink-muted disabled:opacity-30 hover:text-ink"
                  >
                    <ArrowDown className="size-3" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </nav>

        {/* ------------------------------------------------------- editor */}
        <div className="panel overflow-hidden">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                <div className="min-w-0">
                  <h2 className="text-[13px] font-medium text-ink">{selected.title}</h2>
                  <p className="mt-0.5 text-[11px] text-ink-secondary">{selected.hint}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-ink-muted" role="status">
                    {saving ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                        Saving…
                      </span>
                    ) : dirty ? (
                      'Unsaved changes'
                    ) : savedAt ? (
                      <span className="inline-flex items-center gap-1">
                        <Check className="size-3" aria-hidden="true" />
                        Saved
                      </span>
                    ) : null}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={generating === 'section'}
                    disabled={!canWrite}
                    onClick={() => void generate(selected.key)}
                  >
                    <RefreshCw />
                    Regenerate
                  </Button>
                </div>
              </div>

              <div className="p-4">
                <Textarea
                  value={body}
                  rows={22}
                  disabled={!canWrite}
                  onChange={(event) => {
                    setBody(event.target.value)
                    setDirty(true)
                  }}
                  placeholder="Write this section, or press Regenerate to draft it from the cited record."
                  className="font-normal leading-relaxed"
                  aria-label={`${selected.title} body`}
                />
                <p className="mt-2 text-[11px] text-ink-muted">
                  Citations are written as markers such as [S2 p. 4]. They are checked against the
                  case when the brief is rendered.
                </p>
              </div>
            </>
          ) : (
            <p className="px-4 py-6 text-sm text-ink-secondary">This brief has no sections.</p>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------- preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{brief.title}</DialogTitle>
            <DialogDescription>
              Preview of the {included.length} included section
              {included.length === 1 ? '' : 's'}, in order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {included.length === 0 ? (
              <p className="text-sm text-ink-secondary">
                No section is included, so the brief would be empty.
              </p>
            ) : (
              included.map((section) => (
                <section key={section.id}>
                  <h3 className="font-editorial text-lg text-ink">{section.title}</h3>
                  <div className="mt-2">
                    {section.body.trim() ? (
                      <Prose body={section.body} />
                    ) : (
                      <p className="text-sm italic text-ink-muted">
                        This section has not been written yet.
                      </p>
                    )}
                  </div>
                </section>
              ))
            )}
            <p className="border-t border-line pt-4 text-xs leading-relaxed text-ink-muted">
              {NEUTRALITY_DISCLAIMER}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
