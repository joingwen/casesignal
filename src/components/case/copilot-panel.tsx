'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CornerDownLeft, Eraser, FilePlus2, Info, Sparkles } from 'lucide-react'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Textarea,
  toast,
} from '@/components/ui'
import { scanCitations } from '@/lib/citations'
import type { MessageView } from '@/server/queries/case-detail'
import { askCase, clearConversation, convertAnswerToClaim } from '@/server/actions/copilot'
import { cn } from '@/lib/utils'
import { CitationChip } from './citation-chip'

type Citation = MessageView['citations'][number]

interface PendingMessage extends MessageView {
  pending?: boolean
}

/** Renders answer text with its verified markers turned into real citation links. */
function AnswerBody({
  caseId,
  text,
  citations,
}: {
  caseId: string
  text: string
  citations: Citation[]
}) {
  const byMarker = React.useMemo(() => {
    const map = new Map<string, Citation>()
    for (const citation of citations) if (!map.has(citation.marker)) map.set(citation.marker, citation)
    return map
  }, [citations])

  const nodes = React.useMemo(() => {
    const { spans } = scanCitations(text)
    const output: React.ReactNode[] = []
    let cursor = 0
    spans.forEach((span, spanIndex) => {
      if (span.start > cursor) output.push(text.slice(cursor, span.start))
      const chips = span.markers
        .map((marker) => byMarker.get(marker))
        .filter((citation): citation is Citation => Boolean(citation))
      if (chips.length === 0) {
        output.push(
          <span key={`raw-${spanIndex}`} className="font-mono text-[11px] text-ink-muted">
            {span.raw}
          </span>,
        )
      } else {
        chips.forEach((citation, index) => {
          output.push(
            <React.Fragment key={`chip-${spanIndex}-${index}`}>
              {index > 0 ? ' ' : ''}
              <CitationChip
                caseId={caseId}
                sourceId={citation.sourceId}
                chunkId={citation.chunkId}
                sourceLabel={citation.sourceLabel}
                locator={citation.locator}
                className="align-baseline"
              />
            </React.Fragment>,
          )
        })
      }
      cursor = span.end
    })
    if (cursor < text.length) output.push(text.slice(cursor))
    return output
  }, [text, byMarker, caseId])

  return <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{nodes}</p>
}

export interface CopilotPanelProps {
  caseId: string
  initialMessages: MessageView[]
  suggestions: string[]
  /** True when no Anthropic key is configured and analysis runs on this machine. */
  localAnalysis: boolean
  canWrite: boolean
}

export function CopilotPanel({
  caseId,
  initialMessages,
  suggestions,
  localAnalysis,
  canWrite,
}: CopilotPanelProps) {
  const router = useRouter()
  const [messages, setMessages] = React.useState<PendingMessage[]>(initialMessages)
  const [question, setQuestion] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [lastProvider, setLastProvider] = React.useState<'anthropic' | 'local' | null>(null)
  const [convertFor, setConvertFor] = React.useState<MessageView | null>(null)
  const [claimStatement, setClaimStatement] = React.useState('')
  const [converting, setConverting] = React.useState(false)
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const optimisticCount = React.useRef(0)

  // Re-seed from the server when the stored conversation changes (a clear, or a
  // navigation) without an extra render pass.
  const [loadedMessages, setLoadedMessages] = React.useState(initialMessages)
  if (loadedMessages !== initialMessages) {
    setLoadedMessages(initialMessages)
    setMessages(initialMessages)
  }

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, busy])

  async function ask(text: string) {
    const trimmed = text.trim()
    if (trimmed.length < 3 || busy) return
    setBusy(true)
    setQuestion('')
    optimisticCount.current += 1
    const optimisticId = `pending-${optimisticCount.current}`
    setMessages((current) => [
      ...current,
      {
        id: optimisticId,
        role: 'user',
        content: trimmed,
        citations: [],
        insufficientEvidence: false,
        createdAt: new Date().toISOString(),
        pending: true,
      },
    ])

    const result = await askCase({ caseId, question: trimmed })
    setBusy(false)

    if (!result.ok) {
      setMessages((current) => current.filter((message) => message.id !== optimisticId))
      setQuestion(trimmed)
      toast.error(result.error)
      return
    }

    setLastProvider(result.data.provider)
    setMessages((current) => [
      ...current.map((message) => (message.id === optimisticId ? { ...message, pending: false } : message)),
      {
        id: result.data.messageId,
        role: 'assistant',
        content: result.data.answer,
        citations: result.data.citations.map((citation) => ({
          marker: citation.marker,
          chunkId: citation.chunkId,
          sourceId: citation.sourceId,
          sourceLabel: citation.sourceLabel,
          locator: citation.locator,
          excerpt: citation.excerpt,
        })),
        insufficientEvidence: result.data.insufficientEvidence,
        createdAt: new Date().toISOString(),
      },
    ])
  }

  async function clearAll() {
    const result = await clearConversation(caseId)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setMessages([])
    setLastProvider(null)
    toast.success('Conversation cleared. Your sources and claims are untouched.')
    router.refresh()
  }

  async function submitClaim() {
    if (!convertFor) return
    setConverting(true)
    const result = await convertAnswerToClaim(caseId, convertFor.id, claimStatement)
    setConverting(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Claim created with the answer’s citations attached.')
    setConvertFor(null)
    router.refresh()
  }

  const showLocalNote = localAnalysis || lastProvider === 'local'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-slim px-4 py-4">
        {showLocalNote ? (
          <p className="mb-4 flex items-start gap-2 rounded-panel border border-line bg-page px-3 py-2 text-[11px] leading-relaxed text-ink-secondary">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            <span>
              Analysis is running locally on this machine. Answers are assembled from retrieved
              excerpts by deterministic local analysis rather than a hosted model.
            </span>
          </p>
        ) : null}

        {messages.length === 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <Sparkles className="size-3.5 text-ink-muted" aria-hidden="true" />
              Ask about these records
            </div>
            <p className="text-xs leading-relaxed text-ink-secondary">
              Every answer is assembled only from excerpts retrieved out of this case&rsquo;s sources,
              and every sentence carries the citation it came from. When the records do not settle a
              question, the answer says so.
            </p>
          </div>
        ) : (
          <ol className="space-y-4">
            {messages.map((message) =>
              message.role === 'user' ? (
                <li key={message.id} className="flex justify-end">
                  <p
                    className={cn(
                      'max-w-[92%] rounded-panel bg-surface px-3 py-2 text-[13px] leading-relaxed text-ink',
                      message.pending && 'opacity-70',
                    )}
                  >
                    {message.content}
                  </p>
                </li>
              ) : (
                <li key={message.id} className="space-y-2">
                  {message.insufficientEvidence ? (
                    <div className="rounded-panel border border-signal-border bg-signal-soft px-3 py-2">
                      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink">
                        <span
                          className="inline-block size-1.5 rounded-full bg-signal"
                          aria-hidden="true"
                        />
                        Insufficient evidence
                      </p>
                      <div className="mt-1.5">
                        <AnswerBody caseId={caseId} text={message.content} citations={message.citations} />
                      </div>
                    </div>
                  ) : (
                    <AnswerBody caseId={caseId} text={message.content} citations={message.citations} />
                  )}

                  {message.citations.length > 0 ? (
                    <details className="rounded-panel border border-line bg-page px-3 py-2">
                      <summary className="cursor-pointer text-[11px] text-ink-secondary">
                        {message.citations.length} cited excerpt
                        {message.citations.length === 1 ? '' : 's'}
                      </summary>
                      <ul className="mt-2 space-y-2.5">
                        {message.citations.map((citation) => (
                          <li key={`${citation.marker}-${citation.chunkId}`}>
                            <CitationChip
                              caseId={caseId}
                              sourceId={citation.sourceId}
                              chunkId={citation.chunkId}
                              sourceLabel={citation.sourceLabel}
                              locator={citation.locator}
                            />
                            <blockquote className="mt-1 border-l-2 border-evidence-border pl-2.5 text-[12px] leading-relaxed text-ink-secondary">
                              {citation.excerpt}
                            </blockquote>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canWrite}
                    title={canWrite ? undefined : 'You have read-only access to this case.'}
                    onClick={() => {
                      setConvertFor(message)
                      setClaimStatement(
                        message.content.replace(/\[[^\]]*\]/g, '').split(/(?<=[.!?])\s/)[0]?.trim().slice(0, 400) ??
                          '',
                      )
                    }}
                  >
                    <FilePlus2 />
                    Convert to claim
                  </Button>
                </li>
              ),
            )}
          </ol>
        )}

        {busy ? (
          <p className="mt-4 animate-pulse-soft text-[13px] text-ink-secondary">
            Retrieving excerpts and checking every citation…
          </p>
        ) : null}

        {suggestions.length > 0 && !busy ? (
          <div className="mt-5 space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide text-ink-muted">Suggested</p>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void ask(suggestion)}
                className="block w-full rounded-control border border-line bg-canvas px-2.5 py-1.5 text-left text-[12px] leading-snug text-ink-secondary transition-colors duration-200 ease-editorial hover:border-evidence-border hover:bg-evidence-soft hover:text-ink"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-line bg-canvas p-3">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void ask(question)
          }}
        >
          <Textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void ask(question)
              }
            }}
            rows={2}
            placeholder="Ask what the records show…"
            aria-label="Ask a question about this case"
            className="resize-none text-[13px]"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void clearAll()}
              disabled={messages.length === 0 || busy}
            >
              <Eraser />
              Clear
            </Button>
            <Button type="submit" variant="evidence" size="sm" loading={busy} disabled={question.trim().length < 3}>
              <CornerDownLeft />
              Ask
            </Button>
          </div>
        </form>
      </div>

      <Dialog open={Boolean(convertFor)} onOpenChange={(open) => (open ? null : setConvertFor(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert this answer to a claim</DialogTitle>
            <DialogDescription>
              The answer&rsquo;s verified citations are carried across intact. Write the claim as a
              single checkable sentence.
            </DialogDescription>
          </DialogHeader>
          <Field label="Claim statement" required hint={`${claimStatement.length} / 400`}>
            <Textarea
              value={claimStatement}
              onChange={(event) => setClaimStatement(event.target.value.slice(0, 400))}
              rows={4}
            />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConvertFor(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={converting}
              disabled={claimStatement.trim().length < 8}
              onClick={() => void submitClaim()}
            >
              Create claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
