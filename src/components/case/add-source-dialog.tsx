'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, FileUp, Trash2, X } from 'lucide-react'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from '@/components/ui'
import { ACCEPTED_UPLOADS, MAX_PASTE_CHARS, MAX_UPLOAD_BYTES } from '@/lib/domain'
import { addTextSource, addUrlSource } from '@/server/actions/sources'
import { cn, formatBytes } from '@/lib/utils'
import { useWorkspace } from './workspace-context'

const ACCEPT_ATTR = ACCEPTED_UPLOADS.flatMap((entry) => entry.extensions).join(',')
const ACCEPTED_SUMMARY = ACCEPTED_UPLOADS.map((entry) => entry.extensions.join(' ')).join(', ')

interface QueuedFile {
  id: string
  file: File
  title: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  message: string
}

/** Extension and MIME must both be recognised before a byte leaves the browser. */
function validateFile(file: File): string | null {
  const lower = file.name.toLowerCase()
  const entry = ACCEPTED_UPLOADS.find((candidate) =>
    candidate.extensions.some((extension) => lower.endsWith(extension)),
  )
  if (!entry) {
    return `${file.name} is not an accepted file type. Accepted: ${ACCEPTED_SUMMARY}.`
  }
  if (file.type && !entry.mimes.includes(file.type)) {
    return `${file.name} does not look like a ${entry.format.toUpperCase()} file (reported type ${file.type}).`
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${file.name} is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`
  }
  if (file.size === 0) return `${file.name} is empty.`
  return null
}

function uploadOne(
  caseId: string,
  item: QueuedFile,
  onProgress: (value: number) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const form = new FormData()
    form.append('file', item.file)
    if (item.title.trim()) form.append('title', item.title.trim())

    const request = new XMLHttpRequest()
    request.open('POST', `/api/cases/${caseId}/sources/upload`)
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    })
    request.addEventListener('load', () => {
      onProgress(1)
      let payload: unknown = null
      try {
        payload = JSON.parse(request.responseText) as unknown
      } catch {
        payload = null
      }
      const body = payload as { ok?: boolean; error?: string } | null
      if (request.status >= 200 && request.status < 300 && body?.ok !== false) {
        resolve({ ok: true })
      } else {
        resolve({
          ok: false,
          error: body?.error ?? `Upload failed (${request.status || 'network error'}).`,
        })
      }
    })
    request.addEventListener('error', () =>
      resolve({ ok: false, error: 'The upload could not reach the server.' }),
    )
    request.addEventListener('abort', () => resolve({ ok: false, error: 'Upload cancelled.' }))
    request.send(form)
  })
}

export function AddSourceDialog({ caseId }: { caseId: string }) {
  const router = useRouter()
  const { addSourceOpen, setAddSourceOpen, canWrite } = useWorkspace()

  const [tab, setTab] = React.useState('upload')
  const [queue, setQueue] = React.useState<QueuedFile[]>([])
  const [rejected, setRejected] = React.useState<string[]>([])
  const [dragging, setDragging] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)

  const [url, setUrl] = React.useState('')
  const [urlTitle, setUrlTitle] = React.useState('')
  const [pasteTitle, setPasteTitle] = React.useState('')
  const [pasteText, setPasteText] = React.useState('')
  const [noteTitle, setNoteTitle] = React.useState('')
  const [noteText, setNoteText] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const inputRef = React.useRef<HTMLInputElement>(null)

  const reset = React.useCallback(() => {
    setQueue([])
    setRejected([])
    setError(null)
    setUrl('')
    setUrlTitle('')
    setPasteTitle('')
    setPasteText('')
    setNoteTitle('')
    setNoteText('')
  }, [])

  const acceptFiles = React.useCallback((files: FileList | File[]) => {
    const next: QueuedFile[] = []
    const problems: string[] = []
    for (const file of Array.from(files)) {
      const problem = validateFile(file)
      if (problem) {
        problems.push(problem)
        continue
      }
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        title: '',
        status: 'pending',
        progress: 0,
        message: '',
      })
    }
    setRejected(problems)
    setQueue((current) => {
      const ids = new Set(current.map((item) => item.id))
      return [...current, ...next.filter((item) => !ids.has(item.id))]
    })
  }, [])

  async function runUploads() {
    setUploading(true)
    let succeeded = 0
    for (const item of queue) {
      if (item.status === 'done') continue
      setQueue((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, status: 'uploading', progress: 0, message: '' } : entry,
        ),
      )
      const current = queue.find((entry) => entry.id === item.id) ?? item
      const result = await uploadOne(caseId, current, (value) => {
        setQueue((entries) =>
          entries.map((entry) => (entry.id === item.id ? { ...entry, progress: value } : entry)),
        )
      })
      setQueue((entries) =>
        entries.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: result.ok ? 'done' : 'error',
                progress: 1,
                message: result.ok ? '' : result.error,
              }
            : entry,
        ),
      )
      if (result.ok) succeeded += 1
    }
    setUploading(false)
    if (succeeded > 0) {
      toast.success(`${succeeded} record${succeeded === 1 ? '' : 's'} added. Processing has started.`)
      router.refresh()
    }
  }

  async function submitUrl() {
    setPending(true)
    setError(null)
    const result = await addUrlSource({ caseId, url, title: urlTitle || undefined })
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      toast.error(result.error)
      return
    }
    toast.success('Webpage captured and queued for extraction.')
    setUrl('')
    setUrlTitle('')
    router.refresh()
    setAddSourceOpen(false)
  }

  async function submitText(kind: 'paste' | 'note') {
    const title = kind === 'paste' ? pasteTitle : noteTitle
    const text = kind === 'paste' ? pasteText : noteText
    setPending(true)
    setError(null)
    const result = await addTextSource({ caseId, title, text, kind })
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      toast.error(result.error)
      return
    }
    toast.success(kind === 'paste' ? 'Text added as a record.' : 'Note added as a record.')
    if (kind === 'paste') {
      setPasteTitle('')
      setPasteText('')
    } else {
      setNoteTitle('')
      setNoteText('')
    }
    router.refresh()
    setAddSourceOpen(false)
  }

  const allDone = queue.length > 0 && queue.every((item) => item.status === 'done')

  return (
    <Dialog
      open={addSourceOpen}
      onOpenChange={(open) => {
        setAddSourceOpen(open)
        if (!open) reset()
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a source</DialogTitle>
          <DialogDescription>
            Every record you add is extracted, split into traceable excerpts and given a citation
            label. Nothing is analysed until it has been indexed.
          </DialogDescription>
        </DialogHeader>

        {!canWrite ? (
          <p className="mb-4 rounded-panel border border-line bg-surface px-3 py-2 text-sm text-ink-secondary">
            You have read-only access to this case, so records cannot be added.
          </p>
        ) : null}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="upload">Upload file</TabsTrigger>
            <TabsTrigger value="url">Webpage</TabsTrigger>
            <TabsTrigger value="paste">Paste text</TabsTrigger>
            <TabsTrigger value="note">Write a note</TabsTrigger>
          </TabsList>

          {/* ------------------------------------------------------ upload */}
          <TabsContent value="upload" className="space-y-3">
            <div
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                if (event.dataTransfer.files.length > 0) acceptFiles(event.dataTransfer.files)
              }}
              className={cn(
                'rounded-panel border border-dashed px-5 py-8 text-center transition-colors duration-200 ease-editorial',
                dragging ? 'border-evidence bg-evidence-soft' : 'border-line-strong bg-page',
              )}
            >
              <FileUp className="mx-auto size-5 text-ink-muted" aria-hidden="true" />
              <p className="mt-2 text-sm text-ink">Drop files here</p>
              <p className="mt-1 text-xs text-ink-secondary">
                {ACCEPTED_SUMMARY} · up to {formatBytes(MAX_UPLOAD_BYTES)} each
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                disabled={!canWrite}
                onClick={() => inputRef.current?.click()}
              >
                Choose files
              </Button>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPT_ATTR}
                className="sr-only"
                onChange={(event) => {
                  if (event.target.files) acceptFiles(event.target.files)
                  event.target.value = ''
                }}
              />
            </div>

            {rejected.length > 0 ? (
              <ul className="space-y-1" role="alert">
                {rejected.map((message) => (
                  <li
                    key={message}
                    className="flex items-start gap-2 rounded-control border border-status-contradicted/25 bg-status-contradicted-soft px-2.5 py-1.5 text-xs text-status-contradicted"
                  >
                    <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                    {message}
                  </li>
                ))}
              </ul>
            ) : null}

            {queue.length > 0 ? (
              <ul className="divide-y divide-line rounded-panel border border-line">
                {queue.map((item) => (
                  <li key={item.id} className="space-y-2 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {item.status === 'done' ? (
                        <CheckCircle2 className="size-4 shrink-0 text-status-supported" aria-hidden="true" />
                      ) : item.status === 'error' ? (
                        <AlertTriangle className="size-4 shrink-0 text-status-contradicted" aria-hidden="true" />
                      ) : (
                        <FileUp className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{item.file.name}</span>
                      <span className="tabular text-xs text-ink-muted">{formatBytes(item.file.size)}</span>
                      {item.status === 'pending' ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${item.file.name}`}
                          onClick={() =>
                            setQueue((current) => current.filter((entry) => entry.id !== item.id))
                          }
                        >
                          <X />
                        </Button>
                      ) : null}
                    </div>

                    <Input
                      value={item.title}
                      placeholder="Optional title (defaults to the file name)"
                      aria-label={`Title for ${item.file.name}`}
                      className="h-8 text-[13px]"
                      disabled={item.status !== 'pending'}
                      onChange={(event) =>
                        setQueue((current) =>
                          current.map((entry) =>
                            entry.id === item.id ? { ...entry, title: event.target.value } : entry,
                          ),
                        )
                      }
                    />

                    {item.status === 'uploading' ? (
                      <Progress value={Math.round(item.progress * 100)} />
                    ) : null}
                    {item.message ? (
                      <p className="text-xs text-status-contradicted" role="alert">
                        {item.message}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={queue.length === 0 || uploading}
                onClick={() => setQueue([])}
              >
                <Trash2 />
                Clear list
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={uploading}
                disabled={!canWrite || queue.length === 0 || allDone}
                onClick={runUploads}
              >
                {allDone ? 'All uploaded' : `Upload ${queue.length || ''}`.trim()}
              </Button>
            </div>
          </TabsContent>

          {/* --------------------------------------------------------- url */}
          <TabsContent value="url" className="space-y-3">
            <Field
              label="Webpage address"
              required
              description="The page is fetched once and its readable text is stored, so the citation survives if the page changes."
            >
              <Input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.gov/records/minutes-2024-03-12"
                inputMode="url"
              />
            </Field>
            <Field label="Title" hint="Optional">
              <Input
                value={urlTitle}
                onChange={(event) => setUrlTitle(event.target.value)}
                placeholder="Defaults to the page title"
              />
            </Field>
            {error ? (
              <p className="text-xs text-status-contradicted" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                loading={pending}
                disabled={!canWrite || url.trim().length < 4}
                onClick={submitUrl}
              >
                Capture page
              </Button>
            </div>
          </TabsContent>

          {/* ------------------------------------------------------- paste */}
          <TabsContent value="paste" className="space-y-3">
            <Field label="Title" required>
              <Input
                value={pasteTitle}
                onChange={(event) => setPasteTitle(event.target.value)}
                placeholder="Transcript — county board meeting, 12 March 2024"
              />
            </Field>
            <Field
              label="Text"
              required
              hint={`${pasteText.length.toLocaleString()} / ${MAX_PASTE_CHARS.toLocaleString()}`}
              error={pasteText.length > MAX_PASTE_CHARS ? 'This text is too long to index in one record.' : undefined}
            >
              <Textarea
                value={pasteText}
                onChange={(event) => setPasteText(event.target.value)}
                rows={9}
                placeholder="Paste the record text exactly as it appears."
              />
            </Field>
            {error ? (
              <p className="text-xs text-status-contradicted" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                loading={pending}
                disabled={
                  !canWrite ||
                  pasteTitle.trim().length < 2 ||
                  pasteText.trim().length === 0 ||
                  pasteText.length > MAX_PASTE_CHARS
                }
                onClick={() => submitText('paste')}
              >
                Add text
              </Button>
            </div>
          </TabsContent>

          {/* -------------------------------------------------------- note */}
          <TabsContent value="note" className="space-y-3">
            <p className="rounded-panel border border-line bg-page px-3 py-2 text-xs leading-relaxed text-ink-secondary">
              A note is your own writing, not a record. It is labelled and citable like any other
              source, so readers can see which statements came from you rather than from a document.
            </p>
            <Field label="Title" required>
              <Input
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
                placeholder="Analyst note — outstanding records request"
              />
            </Field>
            <Field label="Note" required>
              <Textarea
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                rows={7}
                placeholder="What you observed, and what it is based on."
              />
            </Field>
            {error ? (
              <p className="text-xs text-status-contradicted" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                loading={pending}
                disabled={!canWrite || noteTitle.trim().length < 2 || noteText.trim().length === 0}
                onClick={() => submitText('note')}
              >
                Add note
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setAddSourceOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
