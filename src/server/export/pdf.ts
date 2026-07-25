/**
 * A minimal, dependency-free PDF writer for CaseSignal dossiers.
 *
 * The brief is already rendered to Markdown for the plain-text export, so the
 * PDF is produced from that same text: one source of truth, and a PDF whose
 * citations can never diverge from the Markdown a reader was given.
 *
 * Only the base-14 Helvetica faces are used, so no font is embedded and the
 * file stays small. Their AFM advance widths are tabulated below, which is what
 * lets the layout wrap text accurately rather than guessing at an average
 * character width.
 */

/* ------------------------------------------------------------------ metrics */

/** Helvetica advance widths, 1/1000 em, for WinAnsi codes 32–126. */
const HELVETICA_ASCII = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556,
  556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334,
  260, 334, 584,
]

/** Helvetica-Bold advance widths, 1/1000 em, for WinAnsi codes 32–126. */
const HELVETICA_BOLD_ASCII = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611,
  556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389,
  280, 389, 584,
]

/** The handful of WinAnsi codes above 127 that this document set can emit. */
const HIGH_WIDTHS: Record<number, [number, number]> = {
  0x85: [1000, 1000], // ellipsis
  0x91: [222, 238], // left single quote
  0x92: [222, 238], // right single quote
  0x93: [333, 500], // left double quote
  0x94: [333, 500], // right double quote
  0x95: [350, 350], // bullet
  0x96: [556, 556], // en dash
  0x97: [1000, 1000], // em dash
  0xb7: [278, 278], // middle dot
}

function advance(code: number, bold: boolean): number {
  if (code >= 32 && code <= 126) {
    const table = bold ? HELVETICA_BOLD_ASCII : HELVETICA_ASCII
    return table[code - 32] ?? (bold ? 611 : 556)
  }
  const high = HIGH_WIDTHS[code]
  if (high) return bold ? high[1] : high[0]
  return bold ? 611 : 556
}

/* ----------------------------------------------------------------- encoding */

/**
 * Typographic characters the brief uses are mapped onto their WinAnsi codes;
 * anything else outside Latin-1 is transliterated rather than dropped, so a
 * status symbol never silently disappears from an exported dossier.
 */
const TRANSLITERATE: Record<string, string> = {
  '‘': '\x91',
  '’': '\x92',
  '“': '\x93',
  '”': '\x94',
  '–': '\x96',
  '—': '\x97',
  '…': '\x85',
  '•': '\x95',
  '·': '\xb7',
  '−': '-',
  '≈': '~',
  '≠': '!=',
  '≡': '=',
  '●': '\x95',
  '◐': 'o',
  '▭': '[ ]',
  '⚠': '!',
  '✓': 'v',
  '✕': 'x',
  '→': '->',
  ' ': ' ',
  '​': '',
  '﻿': '',
}

/** Reduces arbitrary text to the WinAnsi byte range the fonts can render. */
function toWinAnsi(text: string): string {
  let out = ''
  for (const char of text) {
    const mapped = TRANSLITERATE[char]
    if (mapped !== undefined) {
      out += mapped
      continue
    }
    const code = char.codePointAt(0) ?? 63
    out += code <= 0xff ? char : '?'
  }
  return out
}

/** Escapes the three characters that terminate or nest a PDF literal string. */
function escapeString(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

/* -------------------------------------------------------------- text model */

interface Run {
  text: string
  bold: boolean
}

interface Word {
  parts: Run[]
  width: number
}

function runWidth(run: Run, size: number): number {
  let total = 0
  for (let i = 0; i < run.text.length; i += 1) {
    total += advance(run.text.charCodeAt(i), run.bold)
  }
  return (total / 1000) * size
}

function partsWidth(parts: Run[], size: number): number {
  return parts.reduce((sum, part) => sum + runWidth(part, size), 0)
}

/** Splits `**bold**` spans out of a line, leaving plain runs either side. */
function parseInline(line: string): Run[] {
  const runs: Run[] = []
  const pattern = /\*\*([^*]+)\*\*|__([^_]+)__/g
  let cursor = 0
  for (const match of line.matchAll(pattern)) {
    const start = match.index ?? 0
    if (start > cursor) runs.push({ text: line.slice(cursor, start), bold: false })
    runs.push({ text: match[1] ?? match[2] ?? '', bold: true })
    cursor = start + match[0].length
  }
  if (cursor < line.length) runs.push({ text: line.slice(cursor), bold: false })
  // Remaining single-asterisk and underscore emphasis carries no extra face.
  return runs
    .map((run) => ({ ...run, text: toWinAnsi(run.text.replace(/\*/g, '').replace(/(^|\s)_([^_]+)_(?=\s|$)/g, '$1$2')) }))
    .filter((run) => run.text.length > 0)
}

/** Groups runs into whitespace-delimited words that may span a font change. */
function toWords(runs: Run[], size: number): Word[] {
  const words: Word[] = []
  let current: Run[] = []

  const flush = () => {
    if (current.length === 0) return
    words.push({ parts: current, width: partsWidth(current, size) })
    current = []
  }

  for (const run of runs) {
    const pieces = run.text.split(/(\s+)/)
    for (const piece of pieces) {
      if (piece === '') continue
      if (/^\s+$/.test(piece)) {
        flush()
        continue
      }
      const last = current[current.length - 1]
      if (last && last.bold === run.bold) last.text += piece
      else current.push({ text: piece, bold: run.bold })
    }
  }
  flush()
  return words
}

function wrap(runs: Run[], size: number, maxWidth: number): Run[][] {
  const words = toWords(runs, size)
  if (words.length === 0) return [[]]

  const spaceWidth = (advance(32, false) / 1000) * size
  const lines: Run[][] = []
  let line: Run[] = []
  let lineWidth = 0

  const push = (parts: Run[]) => {
    for (const part of parts) {
      const last = line[line.length - 1]
      if (last && last.bold === part.bold) last.text += part.text
      else line.push({ ...part })
    }
  }

  for (const word of words) {
    if (line.length === 0) {
      push(word.parts)
      lineWidth = word.width
      continue
    }
    if (lineWidth + spaceWidth + word.width > maxWidth) {
      lines.push(line)
      line = []
      push(word.parts)
      lineWidth = word.width
      continue
    }
    push([{ text: ' ', bold: line[line.length - 1]?.bold ?? false }])
    push(word.parts)
    lineWidth += spaceWidth + word.width
  }
  if (line.length > 0) lines.push(line)
  return lines
}

/* ------------------------------------------------------------------ layout */

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN_X = 64
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2
const TOP_Y = PAGE_HEIGHT - 68
const BOTTOM_Y = 96

const INK: [number, number, number] = [0.067, 0.067, 0.067]
const SECONDARY: [number, number, number] = [0.404, 0.404, 0.384]
const MUTED: [number, number, number] = [0.573, 0.573, 0.549]
const RULE: [number, number, number] = [0.874, 0.874, 0.851]

function color(rgb: [number, number, number]): string {
  return `${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)}`
}

class Layout {
  readonly pages: string[][] = []
  private ops: string[] = []
  private y = TOP_Y

  constructor() {
    this.pages.push(this.ops)
  }

  newPage() {
    this.ops = []
    this.pages.push(this.ops)
    this.y = TOP_Y
  }

  ensure(height: number) {
    if (this.y - height < BOTTOM_Y) this.newPage()
  }

  space(amount: number) {
    if (this.y === TOP_Y) return
    this.y -= amount
  }

  rule(indent = 0) {
    this.ensure(12)
    this.y -= 6
    this.ops.push(
      `q ${color(RULE)} RG 0.7 w ${MARGIN_X + indent} ${this.y.toFixed(2)} m ${PAGE_WIDTH - MARGIN_X} ${this.y.toFixed(2)} l S Q`,
    )
    this.y -= 10
  }

  /** Draws one already-wrapped line at an absolute position. */
  private drawLine(parts: Run[], x: number, y: number, size: number, rgb: [number, number, number]) {
    let cursorX = x
    for (const part of parts) {
      if (!part.text) continue
      this.ops.push(
        `BT ${color(rgb)} rg /${part.bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${cursorX.toFixed(2)} ${y.toFixed(2)} Tm (${escapeString(part.text)}) Tj ET`,
      )
      cursorX += runWidth(part, size)
    }
  }

  paragraph(options: {
    runs: Run[]
    size: number
    leading: number
    rgb?: [number, number, number]
    indent?: number
    hanging?: Run[]
    spaceBefore?: number
    spaceAfter?: number
    keepWithNext?: number
  }) {
    const indent = options.indent ?? 0
    const rgb = options.rgb ?? INK
    const width = CONTENT_WIDTH - indent
    const lines = wrap(options.runs, options.size, width)

    this.space(options.spaceBefore ?? 0)
    // Keep a heading with at least the first lines of what follows it.
    this.ensure(options.leading + (options.keepWithNext ?? 0))

    lines.forEach((line, index) => {
      this.ensure(options.leading)
      this.y -= options.leading
      if (index === 0 && options.hanging) {
        this.drawLine(options.hanging, MARGIN_X + indent - 14, this.y, options.size, rgb)
      }
      this.drawLine(line, MARGIN_X + indent, this.y, options.size, rgb)
    })

    if (options.spaceAfter) this.y -= options.spaceAfter
  }

  /** Places a block at the very bottom of the current page. */
  footerBlock(draw: (emit: (op: string) => void) => void) {
    draw((op) => this.ops.push(op))
  }

}

/* ------------------------------------------------------------- composition */

export interface BriefPdfInput {
  /** Document title, shown in the title block and the PDF metadata. */
  title: string
  /** Markdown produced by `renderBriefMarkdown`. */
  markdown: string
  /** Standing disclaimer placed in the footer of the last page. */
  disclaimer: string
  /** Optional line under the title, e.g. the case description. */
  subtitle?: string
  /** Small label above the title. */
  eyebrow?: string
  preparedOn?: Date
}

const DISCLAIMER_SIZE = 7.6
const DISCLAIMER_LEADING = 10
/** Baseline of the last disclaimer line, just above the running foot. */
const DISCLAIMER_BASELINE = 52

function formatStamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/**
 * `renderBriefMarkdown` opens with the case title, its description and the
 * preparation stamp, closed by a horizontal rule. The PDF title block already
 * presents all three, so that leading block is dropped rather than repeated.
 */
function dropFrontMatter(lines: string[]): string[] {
  const firstContent = lines.findIndex((line) => line.trim().length > 0)
  if (firstContent === -1 || !/^#\s+/.test(lines[firstContent]!.trim())) return lines

  const limit = Math.min(lines.length, firstContent + 14)
  for (let i = firstContent + 1; i < limit; i += 1) {
    if (/^\s*-{3,}\s*$/.test(lines[i]!)) return lines.slice(i + 1)
    // A second heading means there was no front-matter block to drop.
    if (/^#{1,6}\s+/.test(lines[i]!)) break
  }
  return lines.slice(firstContent + 1)
}

function compose(input: BriefPdfInput): Layout {
  const layout = new Layout()
  const preparedOn = input.preparedOn ?? new Date()

  /* -- title block ------------------------------------------------------- */

  layout.paragraph({
    runs: [{ text: toWinAnsi((input.eyebrow ?? 'CaseSignal dossier').toUpperCase()), bold: true }],
    size: 8,
    leading: 12,
    rgb: MUTED,
  })
  layout.paragraph({
    runs: [{ text: toWinAnsi(input.title), bold: true }],
    size: 21,
    leading: 26,
    spaceBefore: 10,
  })
  if (input.subtitle?.trim()) {
    layout.paragraph({
      runs: parseInline(input.subtitle.trim()),
      size: 10.5,
      leading: 15,
      rgb: SECONDARY,
      spaceBefore: 6,
    })
  }
  layout.paragraph({
    runs: [{ text: toWinAnsi(`Prepared with CaseSignal · ${formatStamp(preparedOn)}`), bold: false }],
    size: 9,
    leading: 13,
    rgb: MUTED,
    spaceBefore: 6,
  })
  layout.rule()
  layout.space(6)

  /* -- body -------------------------------------------------------------- */

  const lines = dropFrontMatter(input.markdown.replace(/\r\n?/g, '\n').split('\n'))
  let previousBlank = true

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')

    if (!line.trim()) {
      previousBlank = true
      continue
    }

    // Horizontal rules.
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      layout.rule()
      previousBlank = true
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1]!.length
      const text = heading[2]!.trim()
      layout.paragraph({
        runs: [{ text: toWinAnsi(text.replace(/\*/g, '')), bold: true }],
        size: level <= 2 ? 13 : 11,
        leading: level <= 2 ? 18 : 15,
        spaceBefore: previousBlank ? (level <= 2 ? 18 : 12) : 10,
        spaceAfter: 3,
        keepWithNext: 30,
      })
      previousBlank = false
      continue
    }

    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line)
    if (bullet) {
      layout.paragraph({
        runs: parseInline(bullet[1]!),
        size: 10.5,
        leading: 14.5,
        indent: 16,
        hanging: [{ text: '\x95', bold: false }],
        spaceBefore: previousBlank ? 6 : 2,
      })
      previousBlank = false
      continue
    }

    const ordered = /^\s*(\d{1,2})[.)]\s+(.*)$/.exec(line)
    if (ordered) {
      layout.paragraph({
        runs: parseInline(ordered[2]!),
        size: 10.5,
        leading: 14.5,
        indent: 20,
        hanging: [{ text: `${ordered[1]}.`, bold: false }],
        spaceBefore: previousBlank ? 6 : 2,
      })
      previousBlank = false
      continue
    }

    const quote = /^\s*>\s?(.*)$/.exec(line)
    if (quote) {
      layout.paragraph({
        runs: parseInline(quote[1]!),
        size: 10,
        leading: 14,
        rgb: SECONDARY,
        indent: 18,
        spaceBefore: previousBlank ? 8 : 2,
      })
      previousBlank = false
      continue
    }

    // Whole-line italics are used for standing notes; render them muted.
    const emphasised = /^_(.+)_$/.exec(line.trim())
    layout.paragraph({
      runs: emphasised ? parseInline(emphasised[1]!) : parseInline(line),
      size: emphasised ? 9.5 : 11,
      leading: emphasised ? 13.5 : 15.5,
      rgb: emphasised ? SECONDARY : INK,
      spaceBefore: previousBlank ? 9 : 0,
    })
    previousBlank = false
  }

  /* -- footer disclaimer on the final page -------------------------------- */

  // The footer occupies the reserved band below the content floor, so it can
  // never collide with body text however the last page happens to fill.
  const disclaimerLines = wrap([{ text: toWinAnsi(input.disclaimer), bold: false }], DISCLAIMER_SIZE, CONTENT_WIDTH)
  const firstBaseline = DISCLAIMER_BASELINE + (disclaimerLines.length - 1) * DISCLAIMER_LEADING

  layout.footerBlock((emit) => {
    const rule = firstBaseline + 11
    emit(`q ${color(RULE)} RG 0.7 w ${MARGIN_X} ${rule} m ${PAGE_WIDTH - MARGIN_X} ${rule} l S Q`)
    let y = firstBaseline
    for (const parts of disclaimerLines) {
      let x = MARGIN_X
      for (const part of parts) {
        emit(
          `BT ${color(MUTED)} rg /F1 ${DISCLAIMER_SIZE} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapeString(part.text)}) Tj ET`,
        )
        x += runWidth(part, DISCLAIMER_SIZE)
      }
      y -= DISCLAIMER_LEADING
    }
  })

  return layout
}

/* ------------------------------------------------------------ serialisation */

function pageNumberOps(index: number, total: number): string[] {
  const label = `${index + 1} / ${total}`
  const size = 8.5
  const width = runWidth({ text: label, bold: false }, size)
  const x = PAGE_WIDTH - MARGIN_X - width
  return [
    `BT ${color(MUTED)} rg /F1 ${size} Tf 1 0 0 1 ${x.toFixed(2)} 32 Tm (${escapeString(label)}) Tj ET`,
    `BT ${color(MUTED)} rg /F1 ${size} Tf 1 0 0 1 ${MARGIN_X} 32 Tm (${escapeString('CaseSignal')}) Tj ET`,
  ]
}

function pdfDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `D:${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

/**
 * Renders the brief Markdown to a paginated PDF.
 *
 * The cross-reference table is written from measured byte offsets, so the file
 * opens in Preview and Acrobat rather than only in permissive viewers.
 */
export function renderBriefPdf(input: BriefPdfInput): Buffer {
  const layout = compose(input)
  const total = layout.pages.length

  const streams = layout.pages.map((ops, index) => [...ops, ...pageNumberOps(index, total)].join('\n'))

  const objects: string[] = []
  const firstPageObject = 6

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Count ${total} /Kids [${streams
    .map((_, i) => `${firstPageObject + i * 2} 0 R`)
    .join(' ')}] >>`
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  objects[5] =
    `<< /Title (${escapeString(toWinAnsi(input.title))}) /Producer (CaseSignal) /Creator (CaseSignal) /CreationDate (${pdfDateString(input.preparedOn ?? new Date())}) >>`

  streams.forEach((stream, index) => {
    const pageObject = firstPageObject + index * 2
    const contentObject = pageObject + 1
    objects[pageObject] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /ProcSet [/PDF /Text] >> /Contents ${contentObject} 0 R >>`
    objects[contentObject] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`
  })

  const count = objects.length
  const chunks: Buffer[] = []
  let offset = 0
  const offsets: number[] = new Array(count).fill(0)

  const write = (text: string) => {
    const buffer = Buffer.from(text, 'latin1')
    chunks.push(buffer)
    offset += buffer.byteLength
  }

  write('%PDF-1.4\n')
  // A binary comment marks the file as containing binary data for transports.
  write('%\xe2\xe3\xcf\xd3\n')

  for (let i = 1; i < count; i += 1) {
    const body = objects[i]
    if (body === undefined) continue
    offsets[i] = offset
    write(`${i} 0 obj\n${body}\nendobj\n`)
  }

  const xrefOffset = offset
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`
  for (let i = 1; i < count; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  write(xref)

  const id = Buffer.from(`${input.title}:${(input.preparedOn ?? new Date()).toISOString()}`, 'utf8')
    .toString('hex')
    .slice(0, 32)
    .padEnd(32, '0')
  write(`trailer\n<< /Size ${count} /Root 1 0 R /Info 5 0 R /ID [<${id}> <${id}>] >>\nstartxref\n${xrefOffset}\n%%EOF\n`)

  return Buffer.concat(chunks)
}
