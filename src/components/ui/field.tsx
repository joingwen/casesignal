'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { Label } from './label'

/** The wiring a `Field` hands to whatever control it wraps. */
export interface FieldControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
  'aria-required'?: true
}

export interface FieldProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Visible label text. Omit only when the control is labelled elsewhere. */
  label?: React.ReactNode
  /** Force a specific control id. Otherwise one is generated. */
  id?: string
  /** Quiet helper text beneath the control. */
  description?: React.ReactNode
  /** When present the field renders as invalid and this replaces the description. */
  error?: React.ReactNode
  /** Small trailing note on the label row, e.g. "Optional" or a character count. */
  hint?: React.ReactNode
  required?: boolean
  /**
   * Either a single element (it is cloned with the accessibility wiring) or a
   * render function that receives the wiring explicitly.
   */
  children: React.ReactNode | ((control: FieldControlProps) => React.ReactNode)
}

function Field({
  label,
  id,
  description,
  error,
  hint,
  required,
  children,
  className,
  ...props
}: FieldProps) {
  const generatedId = React.useId()
  const controlId = id ?? `field-${generatedId}`
  const descriptionId = `${controlId}-description`
  const errorId = `${controlId}-error`

  const hasError = Boolean(error)
  const describedBy =
    [description ? descriptionId : null, hasError ? errorId : null].filter(Boolean).join(' ') ||
    undefined

  const control: FieldControlProps = {
    id: controlId,
    'aria-describedby': describedBy,
    ...(hasError ? { 'aria-invalid': true as const } : {}),
    ...(required ? { 'aria-required': true as const } : {}),
  }

  let rendered: React.ReactNode
  if (typeof children === 'function') {
    rendered = children(control)
  } else if (React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>
    const existingDescribedBy = child.props['aria-describedby']
    rendered = React.cloneElement(child, {
      ...control,
      id: (child.props.id as string | undefined) ?? control.id,
      'aria-describedby':
        [typeof existingDescribedBy === 'string' ? existingDescribedBy : null, describedBy]
          .filter(Boolean)
          .join(' ') || undefined,
    })
  } else {
    rendered = children
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)} {...props}>
      {(label || hint) && (
        <div className="flex items-baseline justify-between gap-3">
          {label ? (
            <Label htmlFor={controlId}>
              {label}
              {required ? (
                <span className="ml-1 text-status-contradicted" aria-hidden="true">
                  *
                </span>
              ) : null}
            </Label>
          ) : (
            <span />
          )}
          {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
        </div>
      )}

      {rendered}

      {description ? (
        <p id={descriptionId} className="text-xs leading-relaxed text-ink-secondary">
          {description}
        </p>
      ) : null}

      {hasError ? (
        <p id={errorId} role="alert" className="text-xs leading-relaxed text-status-contradicted">
          {error}
        </p>
      ) : null}
    </div>
  )
}
Field.displayName = 'Field'

export { Field }
