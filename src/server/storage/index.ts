import 'server-only'

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { capabilities, env } from '@/lib/env'

/**
 * Private object storage.
 *
 * Files are never public. With Supabase configured they are written to a
 * private bucket and read through short-lived signed URLs; without it they are
 * written to a local directory outside the web root and streamed through an
 * authorized route handler. Neither path ever exposes a durable public URL.
 */

const SIGNED_URL_TTL_SECONDS = 300

function localRoot() {
  return env.LOCAL_STORAGE_DIR ?? path.join(process.cwd(), '.casesignal', 'storage')
}

/** Storage keys are server-generated; user input never reaches the path. */
export function buildStorageKey(input: { caseId: string; filename: string }): string {
  const ext = path.extname(input.filename).toLowerCase().replace(/[^a-z0-9.]/g, '')
  return `cases/${input.caseId}/${crypto.randomUUID()}${ext}`
}

function assertSafeKey(key: string) {
  if (!/^cases\/[0-9a-f-]{36}\/[0-9a-f-]{36}(\.[a-z0-9]{1,8})?$/i.test(key)) {
    throw new Error('Invalid storage key.')
  }
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  assertSafeKey(key)
  if (capabilities.supabaseStorage) {
    const response = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket()}/${encodeURI(key)}`,
      {
        method: 'POST',
        headers: storageHeaders({ 'content-type': contentType, 'x-upsert': 'true' }),
        body: new Uint8Array(body),
      },
    )
    if (!response.ok) {
      throw new Error(`Storage upload failed with status ${response.status}`)
    }
    return
  }
  const target = path.join(localRoot(), key)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, body)
}

export async function getObject(key: string): Promise<Buffer | null> {
  assertSafeKey(key)
  if (capabilities.supabaseStorage) {
    const response = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket()}/${encodeURI(key)}`,
      { headers: storageHeaders() },
    )
    if (!response.ok) return null
    return Buffer.from(await response.arrayBuffer())
  }
  try {
    return await fs.readFile(path.join(localRoot(), key))
  } catch {
    return null
  }
}

export async function deleteObject(key: string): Promise<void> {
  assertSafeKey(key)
  if (capabilities.supabaseStorage) {
    await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket()}/${encodeURI(key)}`, {
      method: 'DELETE',
      headers: storageHeaders(),
    })
    return
  }
  await fs.rm(path.join(localRoot(), key), { force: true })
}

/**
 * Returns a URL the browser may use to fetch the object.
 *
 * With Supabase this is a signed URL that expires in five minutes. Locally it
 * is an application route that re-checks case membership on every request, so
 * the authorization model is identical in both modes.
 */
export async function getReadUrl(key: string, sourceId: string): Promise<string> {
  assertSafeKey(key)
  if (capabilities.supabaseStorage) {
    const response = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/sign/${bucket()}/${encodeURI(key)}`,
      {
        method: 'POST',
        headers: storageHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
      },
    )
    if (response.ok) {
      const payload = (await response.json()) as { signedURL?: string }
      if (payload.signedURL) return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1${payload.signedURL}`
    }
  }
  return `/api/sources/${sourceId}/file`
}

function bucket() {
  return env.SUPABASE_STORAGE_BUCKET ?? 'case-sources'
}

/**
 * Supabase Storage authentication.
 *
 * Both headers are required. Legacy service-role keys are JWTs and are accepted
 * as a bearer token, but the current `sb_secret_…` keys are opaque: sending one
 * as a bare bearer token fails with "Invalid Compact JWS". The `apikey` header
 * is what Supabase actually authenticates against, so both are always sent.
 */
function storageHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  return { authorization: `Bearer ${key}`, apikey: key, ...extra }
}

export const storageMode = capabilities.supabaseStorage ? 'supabase' : 'local'
