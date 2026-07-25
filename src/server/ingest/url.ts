/**
 * Fetching a public web page as a case source.
 *
 * A URL supplied by an analyst is a request for *this server* to make an
 * outbound connection, so the whole file is written around one assumption: the
 * address is hostile until proved otherwise. Every address is checked before it
 * is fetched, and — because a public host can answer with a redirect to a
 * private one — every redirect target is checked again with the same function.
 *
 * Known limitation: this validates addresses, not DNS answers. A hostname that
 * resolves to a private address (DNS rebinding) is not caught here; deployments
 * that need that guarantee should also run this traffic through an egress proxy.
 */

import { ValidationError } from '@/server/auth/errors'

export interface FetchedPage {
  html: string
  finalUrl: string
  contentType: string
  title: string
}

const USER_AGENT = 'CaseSignal/1.0 (+https://casesignal.ai)'
const TIMEOUT_MS = 15_000
const MAX_REDIRECTS = 3
const MAX_BODY_BYTES = 5 * 1024 * 1024

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])
const ALLOWED_PORTS = new Set(['', '80', '443'])

/** Suffixes that only ever address something inside a private network. */
const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.localdomain', '.home.arpa', '.onion']
const BLOCKED_HOSTS = new Set(['localhost', 'ip6-localhost', 'ip6-loopback', 'broadcasthost'])

const HTML_CONTENT_TYPES = ['text/html', 'application/xhtml+xml']

/* ------------------------------------------------------- IPv4 normalisation */

/**
 * Parses one label of a dotted address in the three notations `inet_aton`
 * accepts: decimal, octal (leading zero) and hexadecimal (`0x`). Encoded forms
 * such as `0177.0.0.1` and `0x7f.1` are how a blocklist that only understands
 * `127.0.0.1` gets bypassed, so they are decoded before any range check.
 */
function parseIpv4Label(label: string): number | null {
  if (label === '') return null
  let value: number
  if (/^0[xX][0-9a-fA-F]+$/.test(label)) value = parseInt(label.slice(2), 16)
  else if (/^0[0-7]+$/.test(label)) value = parseInt(label.slice(1), 8)
  else if (/^(0|[1-9][0-9]*)$/.test(label)) value = Number(label)
  else return null
  return Number.isFinite(value) && value >= 0 ? value : null
}

/** Returns the host as a 32-bit number, or null when it is not an IPv4 address. */
function toIpv4Number(host: string): number | null {
  const labels = host.split('.')
  if (labels.length === 0 || labels.length > 4) return null

  const values: number[] = []
  for (const label of labels) {
    const value = parseIpv4Label(label)
    if (value === null) return null
    values.push(value)
  }

  // inet_aton semantics: the final label absorbs every remaining byte, which is
  // what makes `2130706433` and `127.1` both mean 127.0.0.1.
  const count = values.length
  const last = values[count - 1]!
  if (last >= Math.pow(256, 4 - count + 1)) return null

  let result = last
  for (let index = 0; index < count - 1; index += 1) {
    const value = values[index]!
    if (value > 255) return null
    result += value * Math.pow(256, 3 - index)
  }

  return result >>> 0
}

function cidr(base: string, prefix: number): { start: number; end: number } {
  const start = toIpv4Number(base)!
  const size = Math.pow(2, 32 - prefix)
  return { start, end: start + size - 1 }
}

/** Everything that is not a routable public IPv4 address. */
const BLOCKED_IPV4_RANGES = [
  cidr('0.0.0.0', 8), // "this network"
  cidr('10.0.0.0', 8), // private
  cidr('100.64.0.0', 10), // carrier-grade NAT
  cidr('127.0.0.0', 8), // loopback
  cidr('169.254.0.0', 16), // link-local, including 169.254.169.254 cloud metadata
  cidr('172.16.0.0', 12), // private
  cidr('192.0.0.0', 24), // IETF protocol assignments
  cidr('192.168.0.0', 16), // private
  cidr('198.18.0.0', 15), // benchmarking
  cidr('224.0.0.0', 4), // multicast
  cidr('240.0.0.0', 4), // reserved, including 255.255.255.255
]

function isBlockedIpv4(value: number): boolean {
  return BLOCKED_IPV4_RANGES.some((range) => value >= range.start && value <= range.end)
}

/* ---------------------------------------------------------------- checking */

function reject(message: string, field = 'url'): never {
  throw new ValidationError(message, { [field]: 'blocked' })
}

export function assertSafeUrl(raw: string): URL {
  const trimmed = (typeof raw === 'string' ? raw : '').trim()
  if (!trimmed) reject('Enter a web address to add as a source.')
  if (trimmed.length > 2048) reject('That web address is too long to fetch.')

  let url: URL
  try {
    // A bare `example.com/report` is a reasonable thing for an analyst to paste.
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    reject('That does not look like a valid web address. Include the full address, for example https://example.com/report.')
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    reject('Only http and https addresses can be fetched.')
  }

  if (url.username || url.password) {
    reject('Web addresses containing a username or password cannot be fetched.')
  }

  if (!ALLOWED_PORTS.has(url.port)) {
    reject('Only the standard web ports (80 and 443) can be fetched.')
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, '')

  if (!host) reject('That web address has no host name.')

  // URL.hostname keeps the brackets on an IPv6 literal. IPv6 has its own set of
  // private and loopback ranges, so literals are refused outright.
  if (host.startsWith('[') || host.includes(':')) {
    reject('IPv6 addresses cannot be fetched. Use a public host name.')
  }

  if (BLOCKED_HOSTS.has(host) || BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    reject('That address points at a private or internal host, which CaseSignal will not fetch.')
  }

  const ipv4 = toIpv4Number(host)
  if (ipv4 !== null) {
    if (isBlockedIpv4(ipv4)) {
      reject('That address points at a private, loopback or link-local IP address, which CaseSignal will not fetch.')
    }
  } else if (/^[0-9.]+$/.test(host) || /^0[xX]/.test(host)) {
    // Numeric-looking but not a valid address: an encoding trick, not a hostname.
    reject('That does not look like a valid public web address.')
  } else if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host)) {
    // A public page always has a dotted, registrable host name.
    reject('That address does not name a public web host.')
  }

  return url
}

/* ---------------------------------------------------------------- fetching */

function charsetFrom(contentType: string): string {
  const match = /charset=([^;]+)/i.exec(contentType)
  const label = match?.[1]?.trim().replace(/^["']|["']$/g, '')
  return label || 'utf-8'
}

function decodeBody(bytes: Uint8Array, contentType: string): string {
  const label = charsetFrom(contentType)
  try {
    return new TextDecoder(label, { fatal: false }).decode(bytes)
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  }
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match)
}

function extractTitle(html: string): string {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  if (!match?.[1]) return ''
  return decodeEntities(match[1]).replace(/\s+/g, ' ').trim().slice(0, 300)
}

/** Reads the body with a hard byte cap, aborting rather than buffering past it. */
async function readCappedBody(response: Response): Promise<Uint8Array> {
  const declared = Number(response.headers.get('content-length') ?? '')
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    await response.body?.cancel().catch(() => undefined)
    reject('That page is larger than 5 MB. Save the relevant part and upload it as a file instead.')
  }

  const body = response.body
  if (!body) return new Uint8Array(0)

  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      total += value.byteLength
      if (total > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined)
        reject('That page is larger than 5 MB. Save the relevant part and upload it as a file instead.')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock?.()
  }

  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return merged
}

export async function fetchPublicPage(raw: string): Promise<FetchedPage> {
  let current = assertSafeUrl(raw)
  let response: Response | null = null

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let attempt: Response
    try {
      attempt = await fetch(current.toString(), {
        method: 'GET',
        // Manual redirects are the point: the browser-style automatic follow
        // would take us to an unchecked host.
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'en',
        },
      })
    } catch (error) {
      const name = error instanceof Error ? error.name : ''
      if (name === 'TimeoutError' || name === 'AbortError') {
        reject('That page took longer than 15 seconds to respond. Try again, or save the page and upload it as a file.')
      }
      reject('That page could not be reached. Check the address and that the site is publicly available.')
    }

    if (attempt.status >= 300 && attempt.status < 400) {
      const location = attempt.headers.get('location')
      await attempt.body?.cancel().catch(() => undefined)

      if (!location) reject('That address returned a redirect without a destination.')
      if (hop === MAX_REDIRECTS) reject('That address redirected too many times. Use the final address directly.')

      let next: URL
      try {
        next = new URL(location, current)
      } catch {
        reject('That address redirected to a destination that could not be read.')
      }

      // Re-validated on every hop: a public host is allowed to answer with a
      // redirect to 169.254.169.254, and this is where that is stopped.
      current = assertSafeUrl(next.toString())
      continue
    }

    response = attempt
    break
  }

  if (!response) reject('That address redirected too many times. Use the final address directly.')

  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined)
    if (response.status === 401 || response.status === 403) {
      reject('That page requires a sign-in, so it cannot be fetched. Save the page and upload it as a file instead.')
    }
    if (response.status === 404) reject('That page was not found (404). Check the address.')
    if (response.status === 429) reject('That site is rate-limiting requests. Try again in a few minutes.')
    reject(`That page returned HTTP ${response.status}. It could not be read.`)
  }

  const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
  const baseType = contentType.split(';')[0]!.trim()
  if (baseType && !HTML_CONTENT_TYPES.includes(baseType)) {
    await response.body?.cancel().catch(() => undefined)
    reject(
      `That address returned "${baseType}", not a web page. Download the file and upload it as a source instead.`,
    )
  }

  const bytes = await readCappedBody(response)
  const html = decodeBody(bytes, contentType)

  if (!html.trim()) reject('That page returned no content.')

  return {
    html,
    finalUrl: current.toString(),
    contentType: contentType || 'text/html',
    title: extractTitle(html),
  }
}
