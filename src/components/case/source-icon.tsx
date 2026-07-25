import * as React from 'react'
import {
  FileText,
  FileType2,
  Globe,
  Image as ImageIcon,
  NotebookPen,
  Sheet as SheetIcon,
  Table2,
} from 'lucide-react'

import type { SourceFormat } from '@/lib/domain'
import { cn } from '@/lib/utils'

const ICONS: Record<SourceFormat, React.ComponentType<{ className?: string }>> = {
  pdf: FileType2,
  docx: FileText,
  txt: FileText,
  markdown: FileText,
  csv: Table2,
  xlsx: SheetIcon,
  image: ImageIcon,
  html: Globe,
  note: NotebookPen,
}

/** A quiet, monochrome format mark. Never the only carrier of meaning. */
export function SourceFormatIcon({
  format,
  className,
}: {
  format: SourceFormat
  className?: string
}) {
  const Icon = ICONS[format] ?? FileText
  return <Icon className={cn('size-3.5 shrink-0 text-ink-muted', className)} />
}
