'use client'

import * as React from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'

import { cn } from '@/lib/utils'
import { FRAME_SIZES, type FrameSize } from './frame-size'

/**
 * The capture harness around the showcase frames.
 *
 * Frames render at their true pixel size so a screenshot is pixel-exact; the
 * zoom control only scales the preview. Each frame can also be opened on its
 * own at `?frame=<id>`, which is what the copyable capture command targets — so
 * the command and what you see here cannot drift apart.
 */

export interface ShowcaseFrame {
  id: string
  title: string
  blurb: string
  instructions: string[]
  content: React.ReactNode
}

const ZOOMS = [1, 0.75, 0.5] as const

function captureCommand(origin: string, frameId: string, size: FrameSize) {
  const { width, height } = FRAME_SIZES[size]
  return [
    'npx playwright screenshot',
    `--viewport-size="${width},${height}"`,
    '--wait-for-timeout=1500',
    `"${origin}/showcase?frame=${frameId}&size=${size}"`,
    `"casesignal-${frameId}-${width}x${height}.png"`,
  ].join(' ')
}

function CopyCommandButton({ command }: { command: string }) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(command)
          setCopied(true)
        } catch {
          setCopied(false)
        }
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line-strong bg-canvas px-3 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface"
    >
      {copied ? <Check className="size-3.5 text-status-supported" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : 'Copy capture command'}
    </button>
  )
}

export function ShowcaseShell({ frames, origin }: { frames: ShowcaseFrame[]; origin: string }) {
  const [size, setSize] = React.useState<FrameSize>('16x9')
  const [zoom, setZoom] = React.useState<number>(0.75)
  const dimensions = FRAME_SIZES[size]

  return (
    <div className="min-h-dvh bg-page">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3.5">
          <div className="mr-auto">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
              CaseSignal · capture frames
            </p>
            <p className="mt-0.5 text-[13.5px] text-ink">
              Built from the seeded demonstration case — every value below is real case data.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">Aspect</span>
            {(Object.keys(FRAME_SIZES) as FrameSize[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSize(key)}
                aria-pressed={size === key}
                className={cn(
                  'h-8 rounded-control border px-3 text-[12.5px] font-medium transition-colors',
                  size === key
                    ? 'border-ink bg-ink text-white'
                    : 'border-line-strong bg-canvas text-ink hover:bg-surface',
                )}
              >
                {FRAME_SIZES[key].label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">Preview</span>
            {ZOOMS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setZoom(value)}
                aria-pressed={zoom === value}
                className={cn(
                  'h-8 rounded-control border px-2.5 text-[12.5px] font-medium tabular transition-colors',
                  zoom === value
                    ? 'border-ink bg-ink text-white'
                    : 'border-line-strong bg-canvas text-ink hover:bg-surface',
                )}
              >
                {Math.round(value * 100)}%
              </button>
            ))}
          </div>

          <span className="rounded-control border border-line bg-surface px-2.5 py-1 font-mono text-[12px] tabular text-ink-secondary">
            {dimensions.width} × {dimensions.height}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] space-y-16 px-6 py-12">
        {frames.map((frame, index) => (
          <section key={frame.id} id={frame.id} className="scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
                  Frame {String(index + 1).padStart(2, '0')}
                </p>
                <h2 className="mt-1.5 text-[22px] font-medium leading-tight tracking-[-0.02em] text-ink">
                  {frame.title}
                </h2>
                <p className="mt-1.5 max-w-[70ch] text-[13.5px] leading-relaxed text-ink-secondary">
                  {frame.blurb}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <CopyCommandButton command={captureCommand(origin, frame.id, size)} />
                <a
                  href={`/showcase?frame=${frame.id}&size=${size}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line-strong bg-canvas px-3 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface"
                >
                  <ExternalLink className="size-3.5" />
                  Open solo
                </a>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-panel border border-line bg-surface p-4">
              <div
                style={{ width: dimensions.width * zoom, height: dimensions.height * zoom }}
                className="relative"
              >
                <div
                  style={{
                    width: dimensions.width,
                    height: dimensions.height,
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                  }}
                  className="overflow-hidden rounded-preview shadow-preview"
                >
                  {frame.content}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-start gap-x-10 gap-y-3">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">Capture</p>
                <ul className="mt-1.5 space-y-1">
                  {frame.instructions.map((line) => (
                    <li key={line} className="relative pl-4 text-[12.5px] leading-relaxed text-ink-secondary">
                      <span className="absolute left-0 top-[0.6em] size-[3px] rounded-full bg-ink-muted" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
              <code className="max-w-full flex-1 overflow-x-auto whitespace-pre rounded-control border border-line bg-canvas px-3 py-2 font-mono text-[11.5px] leading-relaxed text-ink-secondary">
                {captureCommand(origin, frame.id, size)}
              </code>
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
