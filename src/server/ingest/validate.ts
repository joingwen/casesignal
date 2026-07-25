/**
 * Upload and paste validation.
 *
 * This is the boundary where an untrusted filename, an untrusted declared MIME
 * type and an untrusted byte count become values the rest of the ingest
 * pipeline is allowed to trust. Nothing downstream re-checks them, so every
 * rejection happens here and every message tells the analyst what to do next.
 */

import { ACCEPTED_UPLOADS, MAX_PASTE_CHARS, MAX_UPLOAD_BYTES, type SourceFormat } from '@/lib/domain'
import { ValidationError } from '@/server/auth/errors'

export interface ValidatedUpload {
  format: SourceFormat
  safeFilename: string
  mimeType: string
  byteSize: number
}

/**
 * Browsers and upload clients frequently send a placeholder content type. These
 * are treated as "unknown" rather than "wrong", and the extension decides.
 */
const GENERIC_MIMES = new Set([
  '',
  'application/octet-stream',
  'binary/octet-stream',
  'application/x-binary',
  'application/download',
  'application/unknown',
])

const MAX_FILENAME_CHARS = 120

/* --------------------------------------------------------------- filenames */

/**
 * Reduces any filename to a flat, safe basename. Directory components, control
 * characters and traversal sequences are removed rather than escaped, so the
 * result can never address a path outside its intended directory.
 */
export function sanitizeFilename(name: string): string {
  let out = typeof name === 'string' ? name : ''

  // Null bytes and control characters first: they can truncate a path in C-level APIs.
  out = out.replace(/\u0000/g, '').replace(/[\u0001-\u001F\u007F]/g, '')

  // Any directory component, in either separator style, is discarded. This is
  // what neutralises `../../etc/passwd` — only `passwd` survives.
  out = out.split(/[/\\]/).pop() ?? ''

  out = out.replace(/\s+/g, ' ').trim()

  // Leading dots: hides the file on POSIX, and turns `.` / `..` into a traversal token.
  out = out.replace(/^[.\s]+/, '')

  out = out.replace(/[^A-Za-z0-9._ -]/g, '-')
  out = out.replace(/-{2,}/g, '-').replace(/\s+/g, ' ').trim()

  if (!out || /^[.\s-]*$/.test(out)) return 'untitled'

  if (out.length > MAX_FILENAME_CHARS) {
    const dot = out.lastIndexOf('.')
    const hasExtension = dot > 0 && out.length - dot <= 12
    const extension = hasExtension ? out.slice(dot) : ''
    const base = hasExtension ? out.slice(0, dot) : out
    out = `${base.slice(0, Math.max(1, MAX_FILENAME_CHARS - extension.length))}${extension}`
  }

  return out || 'untitled'
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.')
  if (dot <= 0 || dot === filename.length - 1) return ''
  return filename.slice(dot).toLowerCase()
}

/* ------------------------------------------------------------------- mimes */

function acceptedExtensionList(): string {
  return ACCEPTED_UPLOADS.flatMap((entry) => entry.extensions).join(', ')
}

/**
 * The MIME CaseSignal records for a file, chosen from the domain vocabulary
 * rather than from whatever the client claimed. `.jpg` resolves to `image/jpeg`
 * and `.csv` to `text/csv`, never to the generic `text/plain` alias.
 */
function canonicalMime(entry: (typeof ACCEPTED_UPLOADS)[number], extension: string): string {
  const hint = extension.replace(/^\./, '').replace(/^jpg$/, 'jpeg')
  return (
    entry.mimes.find((mime) => mime.endsWith(`/${hint}`)) ??
    entry.mimes.find((mime) => mime !== 'text/plain') ??
    entry.mimes[0]!
  )
}

function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb >= 10) return `${Math.round(mb)} MB`
  return `${mb.toFixed(1)} MB`
}

export function validateUpload(input: { filename: string; mimeType: string; byteSize: number }): ValidatedUpload {
  const safeFilename = sanitizeFilename(input.filename)
  const extension = extensionOf(safeFilename)
  const declared = (typeof input.mimeType === 'string' ? input.mimeType : '')
    .toLowerCase()
    .split(';')[0]!
    .trim()

  const entry = extension ? ACCEPTED_UPLOADS.find((candidate) => candidate.extensions.includes(extension)) : undefined

  if (!entry) {
    throw new ValidationError(
      `CaseSignal cannot read ${extension ? `"${extension}"` : 'files without an extension'}. Accepted file types: ${acceptedExtensionList()}.`,
      { file: 'unsupported_type' },
    )
  }

  // `text/plain` is a real answer for `.txt` and a placeholder for everything
  // else — clients routinely send it for CSV and Markdown.
  const isGeneric = GENERIC_MIMES.has(declared) || (declared === 'text/plain' && extension !== '.txt')
  const declaredIsKnown = entry.mimes.includes(declared)

  if (!isGeneric && !declaredIsKnown) {
    throw new ValidationError(
      `The file type "${declared}" does not match the "${extension}" extension on this file. Accepted file types: ${acceptedExtensionList()}.`,
      { file: 'mime_mismatch' },
    )
  }

  const mimeType = isGeneric || !declaredIsKnown ? canonicalMime(entry, extension) : declared

  const byteSize = Number(input.byteSize)
  if (!Number.isFinite(byteSize) || byteSize < 0) {
    throw new ValidationError('The size of this file could not be determined. Try uploading it again.', {
      file: 'unknown_size',
    })
  }
  if (byteSize === 0) {
    throw new ValidationError('This file is empty. Upload a file that contains data.', { file: 'empty' })
  }
  if (byteSize > MAX_UPLOAD_BYTES) {
    throw new ValidationError(
      `This file is ${formatMegabytes(byteSize)}. The maximum upload size is ${formatMegabytes(MAX_UPLOAD_BYTES)} — split the record or upload a smaller export.`,
      { file: 'too_large' },
    )
  }

  return { format: entry.format, safeFilename, mimeType, byteSize }
}

/* ------------------------------------------------------------ pasted text */

export function validatePastedText(text: string): string {
  const raw = typeof text === 'string' ? text : ''

  const cleaned = raw
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    // Everything except newline and tab is stripped; those two carry structure.
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()

  if (!cleaned) {
    throw new ValidationError('Paste some text before adding it as a source.', { text: 'empty' })
  }

  if (cleaned.length > MAX_PASTE_CHARS) {
    throw new ValidationError(
      `This text is ${cleaned.length.toLocaleString('en-US')} characters. The maximum for a pasted source is ${MAX_PASTE_CHARS.toLocaleString('en-US')} characters — split it into more than one source.`,
      { text: 'too_long' },
    )
  }

  return cleaned
}
