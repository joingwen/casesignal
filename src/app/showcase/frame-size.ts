/**
 * Capture dimensions, shared by the server page and the client harness.
 *
 * This lives outside the `'use client'` module on purpose: only function
 * exports cross that boundary, so a plain object exported from the harness
 * would read as `undefined` on the server.
 */

export type FrameSize = '16x9' | '1x1'

export const FRAME_SIZES: Record<FrameSize, { width: number; height: number; label: string }> = {
  '16x9': { width: 1200, height: 675, label: '16 : 9' },
  '1x1': { width: 1200, height: 1200, label: '1 : 1' },
}

export function parseFrameSize(value: unknown): FrameSize {
  return value === '1x1' ? '1x1' : '16x9'
}
