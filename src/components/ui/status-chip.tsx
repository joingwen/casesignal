import * as React from 'react'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  CLAIM_STATUS_META,
  DATE_PRECISION_META,
  EVIDENCE_ROLE_META,
  PROCESSING_STATUS_META,
  REVIEW_STATE_META,
  type ClaimStatus,
  type DatePrecision,
  type EvidenceRole,
  type ProcessingStatus,
  type ReviewState,
} from '@/lib/domain'

/**
 * Status is never carried by colour alone.
 *
 * Every chip renders a monospace symbol (or an explicit word) next to the
 * label taken from `@/lib/domain`, so the meaning survives greyscale printing,
 * colour-blind readers and low-contrast displays.
 */

export type StatusTone = 'supported' | 'partial' | 'contradicted' | 'unresolved' | 'context'

/**
 * Literal class strings only — Tailwind's scanner cannot see template
 * interpolation, so tone classes are written out in full here.
 */
const TONE_CLASSES: Record<StatusTone, string> = {
  supported: 'border-status-supported/25 bg-status-supported-soft text-status-supported',
  partial: 'border-status-partial/25 bg-status-partial-soft text-status-partial',
  contradicted: 'border-status-contradicted/25 bg-status-contradicted-soft text-status-contradicted',
  unresolved: 'border-status-unresolved/25 bg-status-unresolved-soft text-status-unresolved',
  context: 'border-status-context/25 bg-status-context-soft text-status-context',
}

const CHIP_BASE =
  'inline-flex items-center gap-1.5 rounded-full border font-medium leading-[1.4] whitespace-nowrap align-middle'

const SIZE_CLASSES = {
  sm: 'px-1.5 py-px text-[11px]',
  md: 'px-2 py-0.5 text-xs',
} as const

export type ChipSize = keyof typeof SIZE_CLASSES

function toTone(tone: string): StatusTone {
  return tone in TONE_CLASSES ? (tone as StatusTone) : 'context'
}

interface BaseChipProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  tone: StatusTone
  symbol?: React.ReactNode
  label: string
  size?: ChipSize
}

function BaseChip({ tone, symbol, label, size = 'md', className, ...props }: BaseChipProps) {
  return (
    <span
      className={cn(CHIP_BASE, SIZE_CLASSES[size], TONE_CLASSES[tone], className)}
      {...props}
    >
      {symbol !== undefined && symbol !== null ? (
        <span className="font-mono text-[0.95em] leading-none opacity-80" aria-hidden="true">
          {symbol}
        </span>
      ) : null}
      <span>{label}</span>
    </span>
  )
}
BaseChip.displayName = 'BaseChip'

/* ------------------------------------------------------------------ claims */

export interface ClaimStatusChipProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  status: ClaimStatus
  size?: ChipSize
  /** Use the short label ("Partial") instead of the full one. */
  short?: boolean
}

function ClaimStatusChip({ status, size = 'md', short = false, ...props }: ClaimStatusChipProps) {
  const meta = CLAIM_STATUS_META[status]
  return (
    <BaseChip
      tone={toTone(meta.tone)}
      symbol={meta.symbol}
      label={short ? meta.short : meta.label}
      size={size}
      title={meta.description}
      {...props}
    />
  )
}
ClaimStatusChip.displayName = 'ClaimStatusChip'

/* ------------------------------------------------------------------ review */

const REVIEW_STATE_TONE: Record<ReviewState, StatusTone> = {
  unreviewed: 'context',
  reviewed: 'partial',
  approved: 'supported',
  needs_follow_up: 'unresolved',
}

const REVIEW_STATE_SYMBOL: Record<ReviewState, string> = {
  unreviewed: '○',
  reviewed: '◐',
  approved: '✓',
  needs_follow_up: '!',
}

export interface ReviewStateChipProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  state: ReviewState
  size?: ChipSize
}

function ReviewStateChip({ state, size = 'md', ...props }: ReviewStateChipProps) {
  const meta = REVIEW_STATE_META[state]
  return (
    <BaseChip
      tone={REVIEW_STATE_TONE[state]}
      symbol={REVIEW_STATE_SYMBOL[state]}
      label={meta.label}
      size={size}
      title={meta.description}
      {...props}
    />
  )
}
ReviewStateChip.displayName = 'ReviewStateChip'

/* -------------------------------------------------------------- processing */

const PROCESSING_TONE: Record<ProcessingStatus, StatusTone> = {
  queued: 'context',
  extracting: 'partial',
  indexing: 'partial',
  analyzing: 'partial',
  complete: 'supported',
  needs_review: 'unresolved',
  failed: 'contradicted',
}

const PROCESSING_SYMBOL: Record<ProcessingStatus, string> = {
  queued: '·',
  extracting: '›',
  indexing: '›',
  analyzing: '›',
  complete: '✓',
  needs_review: '?',
  failed: '✕',
}

export interface ProcessingStatusChipProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  status: ProcessingStatus
  size?: ChipSize
}

function ProcessingStatusChip({ status, size = 'md', className, ...props }: ProcessingStatusChipProps) {
  const meta = PROCESSING_STATUS_META[status]
  const inFlight = !meta.terminal

  return (
    <span
      className={cn(
        CHIP_BASE,
        SIZE_CLASSES[size],
        TONE_CLASSES[PROCESSING_TONE[status]],
        className,
      )}
      title={meta.description}
      aria-live={inFlight ? 'polite' : undefined}
      {...props}
    >
      {inFlight ? (
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
      ) : (
        <span className="font-mono text-[0.95em] leading-none opacity-80" aria-hidden="true">
          {PROCESSING_SYMBOL[status]}
        </span>
      )}
      <span>{meta.label}</span>
    </span>
  )
}
ProcessingStatusChip.displayName = 'ProcessingStatusChip'

/* --------------------------------------------------------------- evidence */

export interface EvidenceRoleChipProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  role: EvidenceRole
  size?: ChipSize
}

function EvidenceRoleChip({ role, size = 'md', ...props }: EvidenceRoleChipProps) {
  const meta = EVIDENCE_ROLE_META[role]
  return (
    <BaseChip
      tone={toTone(meta.tone)}
      symbol={meta.symbol}
      label={meta.label}
      size={size}
      {...props}
    />
  )
}
EvidenceRoleChip.displayName = 'EvidenceRoleChip'

/* -------------------------------------------------------------- precision */

const PRECISION_TONE: Record<DatePrecision, StatusTone> = {
  exact: 'context',
  estimated: 'partial',
  range: 'context',
  conflicting: 'contradicted',
}

export interface PrecisionChipProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  precision: DatePrecision
  size?: ChipSize
}

function PrecisionChip({ precision, size = 'sm', ...props }: PrecisionChipProps) {
  const meta = DATE_PRECISION_META[precision]
  return (
    <BaseChip
      tone={PRECISION_TONE[precision]}
      symbol={meta.symbol}
      label={meta.label}
      size={size}
      title={meta.description}
      {...props}
    />
  )
}
PrecisionChip.displayName = 'PrecisionChip'

export {
  BaseChip as StatusChip,
  ClaimStatusChip,
  ReviewStateChip,
  ProcessingStatusChip,
  EvidenceRoleChip,
  PrecisionChip,
  TONE_CLASSES,
}
