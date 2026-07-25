/**
 * Format-specific text extraction.
 *
 * Every parser answers the same question in the same shape: what text does this
 * record contain, and *where* in the record does each piece of it live? The
 * location fields (page, sheet, row, section) are what makes a later citation
 * checkable against the original document, so they are populated as precisely
 * as each format allows and left null rather than guessed.
 *
 * Nothing here calls a model. Parsing is deterministic; images are deliberately
 * deferred to the vision step in the pipeline.
 */

import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import mammoth from 'mammoth'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

import type { SourceFormat } from '@/lib/domain'
import { splitSentences, tokenize } from '@/server/ai/local/text'
import { AppError, ValidationError } from '@/server/auth/errors'

/* ------------------------------------------------------------------- types */

export interface ParsedSegment {
  text: string
  pageNumber?: number | null
  sheetName?: string | null
  rowStart?: number | null
  rowEnd?: number | null
  sectionPath?: string | null
  timecode?: string | null
  regionLabel?: string | null
}

export interface ParsedSheet {
  name: string
  index: number
  headers: string[]
  rows: string[][]
}

export interface ParseResult {
  text: string
  segments: ParsedSegment[]
  pages: { pageNumber: number; text: string }[]
  sheets: ParsedSheet[]
  pageCount: number
  wordCount: number
  /** 0–1 confidence that text was extracted cleanly. Scanned/empty PDFs score low. */
  confidence: number
  warnings: string[]
  metadata: Record<string, unknown>
}

/* --------------------------------------------------------------- constants */

/** Hard ceiling on extracted text. Anything past this is truncated with a warning. */
const MAX_TEXT_CHARS = 2_000_000

/** Segments aim for this window so an excerpt is quotable but still specific. */
const SEGMENT_MIN_CHARS = 700
const SEGMENT_MAX_CHARS = 1200

/** Formats without real pagination get a synthetic page every this many words. */
const WORDS_PER_SYNTHETIC_PAGE = 450

/** Spreadsheet rows per segment — small enough that a citation points at a few rows. */
const ROWS_PER_SEGMENT = 12

const SECTION_SEPARATOR = ' > '

const SCANNED_PDF_WARNING =
  'This PDF appears to be scanned — little machine-readable text was found. Extraction confidence is low; consider adding an image source so text can be read from the page image.'

const IMAGE_WARNING = 'Image sources are read with vision extraction — see the image extraction step.'

/* ----------------------------------------------------------------- helpers */

/** Removes NULL bytes and control characters, keeping newlines and tabs. */
function stripControlChars(input: string): string {
  return input
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')
}

/** Canonical whitespace: LF line endings, no runs of spaces, at most one blank line. */
function normalizeWhitespace(input: string): string {
  return stripControlChars(input.replace(/\r\n?/g, '\n'))
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function capText(text: string, warnings: string[]): string {
  if (text.length <= MAX_TEXT_CHARS) return text
  warnings.push(
    `This record is very large. Only the first ${(MAX_TEXT_CHARS / 1_000_000).toFixed(0)} million characters were extracted — split the record if the rest matters.`,
  )
  return text.slice(0, MAX_TEXT_CHARS)
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

function decodeTextBuffer(buffer: Buffer): string {
  return buffer.toString('utf8').replace(/^\uFEFF/, '')
}

function makeSegment(text: string, extra: Omit<ParsedSegment, 'text'> = {}): ParsedSegment | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  return { text: trimmed, ...extra }
}

function pagesFromSegments(segments: ParsedSegment[]): { pageNumber: number; text: string }[] {
  const grouped = new Map<number, string[]>()
  for (const segment of segments) {
    const pageNumber = segment.pageNumber ?? 1
    const bucket = grouped.get(pageNumber) ?? []
    bucket.push(segment.text)
    grouped.set(pageNumber, bucket)
  }
  return [...grouped.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([pageNumber, parts]) => ({ pageNumber, text: parts.join('\n\n') }))
}

function emptyResult(overrides: Partial<ParseResult> = {}): ParseResult {
  return {
    text: '',
    segments: [],
    pages: [],
    sheets: [],
    pageCount: 0,
    wordCount: 0,
    confidence: 0,
    warnings: [],
    metadata: {},
    ...overrides,
  }
}

/**
 * Wraps a library failure in a message an analyst can act on. Library stack
 * traces never reach the caller — they say nothing useful about the record.
 */
function wrapFormatError(format: SourceFormat, error: unknown): never {
  if (error instanceof AppError) throw error

  const name = error instanceof Error ? error.name : ''
  if (name === 'PasswordException') {
    throw new ValidationError(
      'This PDF is password-protected. Remove the password and upload it again.',
      { file: 'password-protected' },
    )
  }

  const messages: Record<string, string> = {
    pdf: 'This PDF could not be read. It may be corrupted or password-protected.',
    docx: 'This DOCX file could not be read. It may be corrupted or password-protected.',
    xlsx: 'This spreadsheet could not be read. It may be corrupted or password-protected.',
    csv: 'This CSV file could not be read. Check that it is valid comma-separated text.',
    html: 'This page could not be read. The HTML may be incomplete or malformed.',
    txt: 'This text file could not be read. It may not be valid UTF-8 text.',
    markdown: 'This Markdown file could not be read. It may not be valid UTF-8 text.',
    image: 'This image could not be read. It may be corrupted or in an unsupported encoding.',
    note: 'This note could not be read.',
  }

  throw new ValidationError(messages[format] ?? 'This file could not be read. It may be corrupted.', {
    file: 'unreadable',
  })
}

/* --------------------------------------------------- headings and sections */

const MARKDOWN_HEADING = /^(#{1,6})\s+(.+?)\s*#*$/

/**
 * Heading-like lines: short, not a sentence, and either ALL CAPS or Title Case.
 * Deliberately conservative — a false heading corrupts every sectionPath below it.
 */
function headingLevelOf(line: string): number | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const markdown = MARKDOWN_HEADING.exec(trimmed)
  if (markdown) return Math.min(6, markdown[1]!.length)

  if (trimmed.length > 80) return null
  if (/[.!?,;]$/.test(trimmed)) return null

  const words = trimmed.split(/\s+/)
  if (words.length > 12) return null

  const letters = trimmed.replace(/[^A-Za-z]/g, '')
  if (letters.length < 2) return null

  const isAllCaps = letters === letters.toUpperCase()
  if (isAllCaps) return 1

  const capitalised = words.filter((word) => /^[A-Z0-9(["']/.test(word)).length
  const titleCase = capitalised / words.length >= 0.7
  if (!titleCase) return null

  // Numbered headings ("3. Findings") read as level two under a bare title.
  return /^\d+[.)]/.test(trimmed) ? 2 : 2
}

function headingTextOf(line: string): string {
  const markdown = MARKDOWN_HEADING.exec(line.trim())
  return (markdown ? markdown[2]! : line).trim()
}

/** A piece of a document: either body text, or a heading that scopes what follows. */
interface Piece {
  text: string
  headingLevel: number | null
}

class SectionStack {
  private readonly stack: { level: number; title: string }[] = []

  push(level: number, title: string): void {
    while (this.stack.length > 0 && this.stack[this.stack.length - 1]!.level >= level) this.stack.pop()
    this.stack.push({ level, title })
  }

  path(): string | null {
    if (this.stack.length === 0) return null
    return this.stack.map((entry) => entry.title).join(SECTION_SEPARATOR) || null
  }
}

/* -------------------------------------------------------- segment building */

/**
 * Splits an oversized paragraph on sentence boundaries. Falls back to a word-
 * boundary wrap when sentence splitting would drop material (splitSentences
 * discards very short fragments, which is right for analysis but not for
 * reconstructing a segment).
 */
function splitLongParagraph(text: string): string[] {
  if (text.length <= SEGMENT_MAX_CHARS) return [text]

  const sentences = splitSentences(text).map((sentence) => sentence.text)
  const recovered = sentences.join(' ').length
  if (sentences.length > 0 && recovered >= text.length * 0.6) {
    const out: string[] = []
    let current = ''
    for (const sentence of sentences) {
      if (current && current.length + sentence.length + 1 > SEGMENT_MAX_CHARS) {
        out.push(current)
        current = ''
      }
      current = current ? `${current} ${sentence}` : sentence
    }
    if (current) out.push(current)
    return out
  }

  // Word-boundary wrap: never cuts a token in half.
  const out: string[] = []
  let current = ''
  for (const word of text.split(/\s+/)) {
    if (current && current.length + word.length + 1 > SEGMENT_MAX_CHARS) {
      out.push(current)
      current = ''
    }
    current = current ? `${current} ${word}` : word
  }
  if (current) out.push(current)
  return out
}

function piecesFromText(text: string): Piece[] {
  const pieces: Piece[] = []
  for (const block of text.split(/\n{2,}/)) {
    const trimmed = block.trim()
    if (!trimmed) continue

    const lines = trimmed.split('\n')
    let buffer: string[] = []

    const flushBuffer = () => {
      if (buffer.length === 0) return
      const paragraph = buffer.join(' ').trim()
      buffer = []
      if (!paragraph) return
      for (const part of splitLongParagraph(paragraph)) pieces.push({ text: part, headingLevel: null })
    }

    for (const line of lines) {
      const level = lines.length === 1 || /^#{1,6}\s/.test(line.trim()) ? headingLevelOf(line) : null
      if (level !== null) {
        flushBuffer()
        pieces.push({ text: headingTextOf(line), headingLevel: level })
        continue
      }
      if (line.trim()) buffer.push(line.trim())
    }
    flushBuffer()
  }
  return pieces
}

/**
 * Groups pieces into segments of roughly 700–1200 characters, never splitting a
 * sentence, and stamps each with the section it sits under and a synthetic page.
 */
function segmentsFromPieces(pieces: Piece[]): ParsedSegment[] {
  const segments: ParsedSegment[] = []
  const sections = new SectionStack()

  let buffer: string[] = []
  let bufferLength = 0
  let bufferSection: string | null = null
  let bufferHasBody = false
  let wordsSoFar = 0

  const flush = () => {
    if (buffer.length === 0) return
    const text = buffer.join('\n\n').trim()
    buffer = []
    bufferLength = 0
    bufferHasBody = false
    if (!text) return
    const pageNumber = Math.floor(wordsSoFar / WORDS_PER_SYNTHETIC_PAGE) + 1
    wordsSoFar += countWords(text)
    const segment = makeSegment(text, { pageNumber, sectionPath: bufferSection })
    if (segment) segments.push(segment)
  }

  for (const piece of pieces) {
    if (piece.headingLevel !== null) {
      if (bufferHasBody && bufferLength >= SEGMENT_MIN_CHARS) flush()
      sections.push(piece.headingLevel, piece.text)
      if (buffer.length === 0) bufferSection = sections.path()
      buffer.push(piece.text)
      bufferLength += piece.text.length + 2
      continue
    }

    // A buffer holding only headings is never flushed on its own — a bare
    // heading is not a quotable excerpt, so it stays attached to its body.
    if (bufferHasBody && bufferLength + piece.text.length + 2 > SEGMENT_MAX_CHARS) flush()
    if (buffer.length === 0) bufferSection = sections.path()
    buffer.push(piece.text)
    bufferLength += piece.text.length + 2
    bufferHasBody = true
    if (bufferLength >= SEGMENT_MIN_CHARS) flush()
  }
  flush()

  return segments
}

/* ------------------------------------------------------------- plain text */

export function parsePlainText(input: { text: string; title?: string; format?: SourceFormat }): ParseResult {
  const warnings: string[] = []
  const text = capText(normalizeWhitespace(input.text ?? ''), warnings)
  const wordCount = countWords(text)

  if (!text) {
    return emptyResult({
      confidence: 0,
      warnings: ['This record contains no readable text.'],
      pageCount: 0,
      metadata: { title: input.title ?? null, format: input.format ?? 'txt' },
    })
  }

  let segments = segmentsFromPieces(piecesFromText(text))
  if (segments.length === 0) {
    const fallback = makeSegment(text, { pageNumber: 1, sectionPath: null })
    segments = fallback ? [fallback] : []
  }

  const pageCount = Math.max(1, Math.ceil(wordCount / WORDS_PER_SYNTHETIC_PAGE))

  return {
    text,
    segments,
    pages: pagesFromSegments(segments),
    sheets: [],
    pageCount,
    wordCount,
    confidence: 0.98,
    warnings,
    metadata: { title: input.title ?? null, format: input.format ?? 'txt' },
  }
}

/* -------------------------------------------------------------------- pdf */

type PdfjsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs')

let pdfjsPromise: Promise<PdfjsModule> | null = null

/**
 * Loads pdf.js with its worker running in-process.
 *
 * There is no Web Worker on the server, and the fallback path resolves a worker
 * *file path* at runtime — which does not survive bundling. Publishing the
 * worker module on `globalThis.pdfjsWorker` makes pdf.js use it directly, so no
 * URL is ever resolved or fetched.
 */
async function loadPdfjs(): Promise<PdfjsModule> {
  pdfjsPromise ??= (async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    // `as string` only widens the specifier for the type checker — pdf.worker.mjs
    // ships no declarations. The emitted literal still bundles statically.
    const worker: unknown = await import('pdfjs-dist/legacy/build/pdf.worker.mjs' as string)
    ;(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker
    pdfjs.GlobalWorkerOptions.workerSrc = ''
    return pdfjs
  })()
  return pdfjsPromise
}

async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  const warnings: string[] = []

  // Loaded lazily: pdf.js is large and only a fraction of sources are PDFs.
  const pdfjs = await loadPdfjs()

  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  })

  const doc = await task.promise
  const pageCount = doc.numPages

  const pages: { pageNumber: number; text: string }[] = []
  const segments: ParsedSegment[] = []

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await doc.getPage(pageNumber)
    const content = await page.getTextContent()

    let raw = ''
    let lastY: number | null = null
    for (const item of content.items) {
      if (!('str' in item)) continue
      const transform = Array.isArray(item.transform) ? item.transform : null
      const y = transform ? Number(transform[5]) : null

      // pdf.js emits positioned runs, not lines. A material change in the
      // baseline y means a new line; without this the page becomes one blob.
      if (lastY !== null && y !== null && Number.isFinite(y) && Math.abs(y - lastY) > 2) raw += '\n'
      raw += item.str
      if (item.hasEOL) raw += '\n'
      if (y !== null && Number.isFinite(y)) lastY = y
    }

    const pageText = normalizeWhitespace(raw)
    page.cleanup()
    if (!pageText) continue

    pages.push({ pageNumber, text: pageText })
    const segment = makeSegment(pageText, { pageNumber })
    if (segment) segments.push(segment)
  }

  let metadata: Record<string, unknown> = { pageCount }
  try {
    const info = (await doc.getMetadata()).info as Record<string, unknown> | undefined
    if (info) {
      metadata = {
        ...metadata,
        title: typeof info.Title === 'string' ? info.Title : null,
        author: typeof info.Author === 'string' ? info.Author : null,
        producer: typeof info.Producer === 'string' ? info.Producer : null,
        creationDate: typeof info.CreationDate === 'string' ? info.CreationDate : null,
      }
    }
  } catch {
    // Metadata is a nicety; a document that will not report it still parses.
  }

  await doc.destroy().catch(() => undefined)

  const text = capText(pages.map((page) => page.text).join('\n\n'), warnings)
  const wordCount = countWords(text)
  const charsPerPage = pageCount > 0 ? text.length / pageCount : 0

  let confidence: number
  if (text.length === 0) {
    // An empty PDF is a low-confidence result, never a thrown error: the caller
    // should be able to record the source and route it to vision extraction.
    confidence = 0.15
    warnings.push(SCANNED_PDF_WARNING)
  } else if (charsPerPage < 40) {
    confidence = 0.25
    warnings.push(SCANNED_PDF_WARNING)
  } else {
    // Lexical density catches garbled font-encoding extraction, which produces
    // plenty of characters but almost no real words.
    const density = wordCount > 0 ? tokenize(text).length / wordCount : 0
    if (density < 0.25) {
      confidence = 0.45
      warnings.push(
        'Text was extracted from this PDF but much of it does not resolve into readable words. Check a few excerpts against the original pages.',
      )
    } else {
      confidence = charsPerPage >= 200 ? 0.95 : 0.75
    }
  }

  return {
    text,
    segments,
    pages,
    sheets: [],
    pageCount,
    wordCount,
    confidence,
    warnings,
    metadata,
  }
}

/* ------------------------------------------------------------------- docx */

async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  const warnings: string[] = []
  const result = await mammoth.extractRawText({ buffer })

  for (const message of result.messages ?? []) {
    if (message?.type === 'error' && typeof message.message === 'string') warnings.push(message.message)
  }

  const text = capText(normalizeWhitespace(result.value ?? ''), warnings)
  const wordCount = countWords(text)

  if (!text) {
    return emptyResult({
      confidence: 0.1,
      warnings: [...warnings, 'This DOCX file contains no readable text.'],
      metadata: { format: 'docx' },
    })
  }

  let segments = segmentsFromPieces(piecesFromText(text))
  if (segments.length === 0) {
    const fallback = makeSegment(text, { pageNumber: 1 })
    segments = fallback ? [fallback] : []
  }

  // DOCX has no page concept in the raw text stream — pages are synthetic and
  // labelled as approximate wherever they surface in a citation.
  const pageCount = Math.max(1, Math.ceil(wordCount / WORDS_PER_SYNTHETIC_PAGE))

  return {
    text,
    segments,
    pages: pagesFromSegments(segments),
    sheets: [],
    pageCount,
    wordCount,
    confidence: 0.95,
    warnings,
    metadata: { format: 'docx', syntheticPages: true, wordsPerPage: WORDS_PER_SYNTHETIC_PAGE },
  }
}

/* ------------------------------------------------------------ spreadsheets */

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return ''
  return stripControlChars(String(value)).replace(/\s+/g, ' ').trim()
}

function normaliseHeaders(headerRow: string[], width: number): string[] {
  const headers: string[] = []
  for (let index = 0; index < width; index += 1) {
    const raw = cellToString(headerRow[index])
    headers.push(raw || `Column ${index + 1}`)
  }
  return headers
}

/** `Sheet "Invoices" row 12 — Item: Chair; Quantity: 240; Amount: $18,400` */
function describeRow(sheetName: string, rowNumber: number, headers: string[], row: string[]): string {
  const pairs: string[] = []
  for (let index = 0; index < headers.length; index += 1) {
    const value = cellToString(row[index])
    if (!value) continue
    pairs.push(`${headers[index]}: ${value}`)
  }
  if (pairs.length === 0) return ''
  return `Sheet "${sheetName}" row ${rowNumber} — ${pairs.join('; ')}`
}

function buildSheetResult(sheets: ParsedSheet[], warnings: string[], metadata: Record<string, unknown>): ParseResult {
  const segments: ParsedSegment[] = []
  const pages: { pageNumber: number; text: string }[] = []

  for (const sheet of sheets) {
    const pageNumber = sheet.index + 1
    const sheetTexts: string[] = []

    if (sheet.headers.length > 0) {
      const headerText = `Sheet "${sheet.name}" columns: ${sheet.headers.join('; ')}`
      const headerSegment = makeSegment(headerText, {
        pageNumber,
        sheetName: sheet.name,
        rowStart: null,
        rowEnd: null,
      })
      if (headerSegment) {
        segments.push(headerSegment)
        sheetTexts.push(headerText)
      }
    }

    for (let offset = 0; offset < sheet.rows.length; offset += ROWS_PER_SEGMENT) {
      const slice = sheet.rows.slice(offset, offset + ROWS_PER_SEGMENT)
      const lines: string[] = []
      for (let index = 0; index < slice.length; index += 1) {
        // Row numbers are 1-based over *data* rows, so the row under the header is row 1.
        const description = describeRow(sheet.name, offset + index + 1, sheet.headers, slice[index]!)
        if (description) lines.push(description)
      }
      if (lines.length === 0) continue

      const body = lines.join('\n')
      const segment = makeSegment(body, {
        pageNumber,
        sheetName: sheet.name,
        rowStart: offset + 1,
        rowEnd: offset + slice.length,
      })
      if (segment) {
        segments.push(segment)
        sheetTexts.push(body)
      }
    }

    if (sheetTexts.length > 0) pages.push({ pageNumber, text: sheetTexts.join('\n\n') })
  }

  const text = capText(pages.map((page) => page.text).join('\n\n'), warnings)
  const wordCount = countWords(text)
  const totalRows = sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0)

  if (totalRows === 0) warnings.push('No data rows were found in this spreadsheet.')

  return {
    text,
    segments,
    pages,
    sheets,
    pageCount: Math.max(1, sheets.length),
    wordCount,
    confidence: totalRows === 0 ? 0.3 : 0.95,
    warnings,
    metadata: { ...metadata, sheetCount: sheets.length, rowCount: totalRows },
  }
}

function toSheet(name: string, index: number, table: unknown[][]): ParsedSheet {
  const rows = table.map((row) => (Array.isArray(row) ? row.map(cellToString) : []))
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0)
  const headerRow = rows.length > 0 ? rows[0]! : []
  const headers = normaliseHeaders(headerRow, width)
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell !== ''))
  return { name, index, headers, rows: dataRows }
}

async function parseXlsx(buffer: Buffer, filename: string): Promise<ParseResult> {
  const warnings: string[] = []
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  const sheets: ParsedSheet[] = []
  workbook.SheetNames.forEach((name, index) => {
    const sheet = workbook.Sheets[name]
    if (!sheet) return
    const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' })
    sheets.push(toSheet(name || `Sheet ${index + 1}`, index, table))
  })

  if (sheets.length === 0) warnings.push('This workbook contains no sheets.')

  return buildSheetResult(sheets, warnings, { format: 'xlsx', filename })
}

function parseCsv(text: string, filename: string): ParseResult {
  const warnings: string[] = []
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true })

  for (const error of parsed.errors ?? []) {
    if (error?.type === 'Delimiter' || error?.code === 'UndetectableDelimiter') {
      warnings.push('The column delimiter in this CSV could not be detected with confidence. Check the parsed rows.')
      break
    }
  }

  const name = filename.replace(/\.[^.]+$/, '').trim() || 'Data'
  const sheet = toSheet(name, 0, parsed.data ?? [])

  return buildSheetResult([sheet], warnings, { format: 'csv', filename })
}

/* -------------------------------------------------------------------- html */

const BLOCK_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,figcaption,dd,dt,td,th'
const STRIP_SELECTOR = 'script,style,noscript,iframe,svg,object,embed,canvas,template'

function stripUnsafeElements(root: ParentNode): void {
  for (const element of Array.from(root.querySelectorAll(STRIP_SELECTOR))) element.remove()
}

/** Ordered leaf blocks, so headings keep their position relative to body text. */
function piecesFromElement(root: Element): Piece[] {
  const pieces: Piece[] = []
  const blocks = Array.from(root.querySelectorAll(BLOCK_SELECTOR))

  for (const block of blocks) {
    // Only leaf blocks — otherwise a wrapper repeats everything nested inside it.
    if (block.querySelector(BLOCK_SELECTOR)) continue

    const text = normalizeWhitespace(block.textContent ?? '').replace(/\n+/g, ' ').trim()
    if (!text) continue

    const tag = block.tagName.toLowerCase()
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      pieces.push({ text, headingLevel: Number(tag.slice(1)) })
      continue
    }
    if (/^h[4-6]$/.test(tag)) {
      pieces.push({ text, headingLevel: Number(tag.slice(1)) })
      continue
    }
    for (const part of splitLongParagraph(text)) pieces.push({ text: part, headingLevel: null })
  }

  if (pieces.length === 0) {
    const fallback = normalizeWhitespace(root.textContent ?? '')
    if (fallback) return piecesFromText(fallback)
  }

  return pieces
}

/**
 * Builds an inert DOM. `runScripts` is never set and no resource loader is
 * supplied, so jsdom neither executes page script nor fetches anything.
 */
function buildDom(html: string, url: string, warnings: string[]): JSDOM {
  try {
    return new JSDOM(html, { url: url || 'https://example.invalid/' })
  } catch {
    try {
      const dom = new JSDOM(html)
      warnings.push('The page address could not be used as a document base URL.')
      return dom
    } catch (error) {
      return wrapFormatError('html', error)
    }
  }
}

export async function parseHtmlDocument(input: { html: string; url: string }): Promise<ParseResult> {
  const warnings: string[] = []

  // No runScripts and no resource loader: the page is inert data, never code.
  const dom = buildDom(input.html ?? '', input.url, warnings)
  const document = dom.window.document
  let title = (document.title ?? '').trim()
  let byline: string | null = null
  let siteName: string | null = null

  try {
    stripUnsafeElements(document)

    let root: Element | null = null
    let confidence = 0.6

    // Readability mutates the document it is given, so anything read from the
    // original DOM must be read before this point.
    let article: ReturnType<Readability['parse']> = null
    try {
      article = new Readability(document, { charThreshold: 200 }).parse()
    } catch {
      warnings.push('Article extraction did not succeed on this page; the full page body was used instead.')
    }

    if (article?.content) {
      const holder = dom.window.document.createElement('div')
      holder.innerHTML = article.content
      stripUnsafeElements(holder)
      root = holder
      confidence = 0.9
      title = (article.title ?? title ?? '').trim()
      byline = article.byline?.trim() || null
      siteName = article.siteName?.trim() || null
    } else {
      root = document.body
      warnings.push('No main article could be identified on this page; the full page body was read instead.')
    }

    const pieces = root ? piecesFromElement(root) : []
    const rawText = pieces.map((piece) => piece.text).join('\n\n')
    const text = capText(normalizeWhitespace(rawText), warnings)
    const wordCount = countWords(text)

    const metadata: Record<string, unknown> = { title: title || null, byline, siteName, url: input.url }

    if (!text) {
      return emptyResult({
        confidence: 0,
        warnings: [...warnings, 'No readable text was found on this page.'],
        metadata,
      })
    }

    let segments = segmentsFromPieces(pieces)
    if (segments.length === 0) {
      const fallback = makeSegment(text, { pageNumber: 1 })
      segments = fallback ? [fallback] : []
    }

    return {
      text,
      segments,
      pages: pagesFromSegments(segments),
      sheets: [],
      pageCount: Math.max(1, Math.ceil(wordCount / WORDS_PER_SYNTHETIC_PAGE)),
      wordCount,
      confidence,
      warnings,
      metadata,
    }
  } catch (error) {
    wrapFormatError('html', error)
  } finally {
    dom.window.close()
  }
}

/* ------------------------------------------------------------------ image */

function imageResult(filename: string, mimeType: string): ParseResult {
  return emptyResult({
    confidence: 0,
    warnings: [IMAGE_WARNING],
    metadata: { needsVision: true, filename, mimeType },
  })
}

/* ------------------------------------------------------------- entry point */

export async function parseBuffer(input: {
  buffer: Buffer
  filename: string
  mimeType: string
  format: SourceFormat
}): Promise<ParseResult> {
  const { buffer, filename, mimeType, format } = input

  if (!buffer || buffer.length === 0) {
    throw new ValidationError('This file is empty. Upload a file that contains data.', { file: 'empty' })
  }

  try {
    switch (format) {
      case 'pdf':
        return await parsePdf(buffer)
      case 'docx':
        return await parseDocx(buffer)
      case 'xlsx':
        return await parseXlsx(buffer, filename)
      case 'csv':
        return parseCsv(decodeTextBuffer(buffer), filename)
      case 'txt':
      case 'markdown':
      case 'note':
        return parsePlainText({ text: decodeTextBuffer(buffer), title: filename, format })
      case 'html':
        return await parseHtmlDocument({ html: decodeTextBuffer(buffer), url: 'https://example.invalid/' })
      case 'image':
        return imageResult(filename, mimeType)
      default:
        throw new ValidationError(`CaseSignal cannot read "${format}" records.`, { format: 'unsupported' })
    }
  } catch (error) {
    wrapFormatError(format, error)
  }
}
