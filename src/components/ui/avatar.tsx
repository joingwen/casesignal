'use client'

import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'

import { cn, initialsOf } from '@/lib/utils'

export type AvatarProps = React.ComponentProps<typeof AvatarPrimitive.Root>

function Avatar({ className, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative flex size-8 shrink-0 select-none overflow-hidden rounded-full border border-line',
        className,
      )}
      {...props}
    />
  )
}
Avatar.displayName = 'Avatar'

export type AvatarImageProps = React.ComponentProps<typeof AvatarPrimitive.Image>

function AvatarImage({ className, alt = '', ...props }: AvatarImageProps) {
  return (
    <AvatarPrimitive.Image className={cn('aspect-square size-full object-cover', className)} alt={alt} {...props} />
  )
}
AvatarImage.displayName = 'AvatarImage'

export type AvatarFallbackProps = React.ComponentProps<typeof AvatarPrimitive.Fallback>

function AvatarFallback({ className, ...props }: AvatarFallbackProps) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        'flex size-full items-center justify-center rounded-full bg-surface text-xs font-medium uppercase text-ink-secondary',
        className,
      )}
      {...props}
    />
  )
}
AvatarFallback.displayName = 'AvatarFallback'

export interface UserAvatarProps extends Omit<AvatarProps, 'children'> {
  name: string
  src?: string | null
  /** Delay before the fallback appears, avoiding a flash for cached images. */
  delayMs?: number
}

/** Convenience: an avatar that derives its initials from a display name. */
function UserAvatar({ name, src, delayMs = 200, className, ...props }: UserAvatarProps) {
  const initials = initialsOf(name) || '—'
  return (
    <Avatar className={className} {...props}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback delayMs={src ? delayMs : 0} aria-label={name}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
UserAvatar.displayName = 'UserAvatar'

export { Avatar, AvatarImage, AvatarFallback, UserAvatar }
