import { Bell } from 'lucide-react'
import { useNotificationStore } from '@/store/notificationStore'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const { unreadCount } = useNotificationStore()
  return (
    <div className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className={cn(
          'absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-2xs',
          'flex items-center justify-center font-bold'
        )}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  )
}
