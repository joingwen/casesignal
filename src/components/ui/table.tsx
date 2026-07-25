import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Semantic table primitives. Ledgers in CaseSignal are read closely, so rows
 * are separated by hairlines rather than fills and numeric columns switch to
 * tabular figures so digits line up column-to-column.
 */

export interface TableProps extends React.ComponentProps<'table'> {
  /** Wrapper classes for the horizontal scroll container. */
  containerClassName?: string
}

function Table({ className, containerClassName, ...props }: TableProps) {
  return (
    <div className={cn('w-full overflow-x-auto scrollbar-slim', containerClassName)}>
      <table
        className={cn('w-full caption-bottom border-collapse text-sm text-ink', className)}
        {...props}
      />
    </div>
  )
}
Table.displayName = 'Table'

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('border-b border-line', className)} {...props} />
}
TableHeader.displayName = 'TableHeader'

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={className} {...props} />
}
TableBody.displayName = 'TableBody'

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot className={cn('border-t border-line bg-page/60 font-medium', className)} {...props} />
  )
}
TableFooter.displayName = 'TableFooter'

export interface TableRowProps extends React.ComponentProps<'tr'> {
  /** Row responds to pointer input (opens a detail panel, etc.). */
  interactive?: boolean
}

function TableRow({ className, interactive, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        'border-b border-line transition-colors duration-150 ease-editorial',
        'last:border-b-0',
        'hover:bg-page/60',
        'data-[state=selected]:bg-evidence-soft',
        interactive && 'cursor-pointer',
        className,
      )}
      {...props}
    />
  )
}
TableRow.displayName = 'TableRow'

/** Alignment shared by header and body cells. */
type CellAlign = 'left' | 'right' | 'center'

const ALIGN_CLASSES: Record<CellAlign, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

export interface TableHeadProps extends Omit<React.ComponentProps<'th'>, 'align'> {
  align?: CellAlign
  /** Renders tabular figures and right-aligns unless told otherwise. */
  numeric?: boolean
}

function TableHead({ className, align, numeric, ...props }: TableHeadProps) {
  const resolved: CellAlign = align ?? (numeric ? 'right' : 'left')
  return (
    <th
      scope={props.scope ?? 'col'}
      className={cn(
        'whitespace-nowrap px-3 py-2 align-middle font-medium',
        'text-[11px] uppercase tracking-wide text-ink-muted',
        ALIGN_CLASSES[resolved],
        numeric && 'tabular',
        className,
      )}
      {...props}
    />
  )
}
TableHead.displayName = 'TableHead'

export interface TableCellProps extends Omit<React.ComponentProps<'td'>, 'align'> {
  align?: CellAlign
  /** Renders tabular figures and right-aligns unless told otherwise. */
  numeric?: boolean
}

function TableCell({ className, align, numeric, ...props }: TableCellProps) {
  const resolved: CellAlign = align ?? (numeric ? 'right' : 'left')
  return (
    <td
      className={cn(
        'px-3 py-2.5 align-middle text-sm text-ink',
        ALIGN_CLASSES[resolved],
        numeric && 'tabular',
        className,
      )}
      {...props}
    />
  )
}
TableCell.displayName = 'TableCell'

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return <caption className={cn('mt-3 text-xs text-ink-secondary', className)} {...props} />
}
TableCaption.displayName = 'TableCaption'

export { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption }
