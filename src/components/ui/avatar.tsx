import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn, getInitials, getAvatarColor } from '@/lib/utils'

const AvatarRoot = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn('relative flex shrink-0 overflow-hidden rounded-full', className)}
    {...props}
  />
))
AvatarRoot.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full text-white font-semibold text-sm',
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

// ── Composed Avatar ───────────────────────────────────────────
interface UserAvatarProps {
  name: string
  avatarUrl?: string | null
  userId?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  xs: 'h-6 w-6 text-2xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

export function UserAvatar({ name, avatarUrl, userId, size = 'md', className }: UserAvatarProps) {
  const colorClass = getAvatarColor(userId ?? name)
  return (
    <AvatarRoot className={cn(sizeClasses[size], className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className={colorClass}>
        {getInitials(name)}
      </AvatarFallback>
    </AvatarRoot>
  )
}

// ── Avatar Group (overlapping) ─────────────────────────────────
interface AvatarGroupProps {
  users: { id: string; full_name: string; avatar_url?: string | null }[]
  max?: number
  size?: 'xs' | 'sm' | 'md'
}

export function AvatarGroup({ users, max = 4, size = 'sm' }: AvatarGroupProps) {
  const visible = users.slice(0, max)
  const overflow = users.length - max

  return (
    <div className="flex items-center">
      {visible.map((user, i) => (
        <div
          key={user.id}
          className={cn('ring-2 ring-white dark:ring-gray-900 rounded-full', i > 0 && '-ml-2')}
          style={{ zIndex: visible.length - i }}
        >
          <UserAvatar
            name={user.full_name}
            avatarUrl={user.avatar_url}
            userId={user.id}
            size={size}
          />
        </div>
      ))}
      {overflow > 0 && (
        <div className={cn(
          '-ml-2 ring-2 ring-white dark:ring-gray-900 rounded-full',
          'flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
          'font-semibold',
          sizeClasses[size]
        )}>
          <span className="text-2xs">+{overflow}</span>
        </div>
      )}
    </div>
  )
}

export { AvatarRoot, AvatarImage, AvatarFallback }
