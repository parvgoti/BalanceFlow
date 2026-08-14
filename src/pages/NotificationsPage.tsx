import { useNotificationStore } from '@/store/notificationStore'
import { formatRelativeTime } from '@/lib/utils'
import { Bell } from 'lucide-react'

export function NotificationsPage() {
  const { notifications, markRead } = useNotificationStore()

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto flex flex-col h-full bg-white dark:bg-gray-950">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-navy dark:text-white">Notifications</h1>
      </div>

      <div className="card divide-y divide-gray-50 dark:divide-gray-800 flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No new notifications</p>
          </div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id} 
              className={`p-4 flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!n.is_read ? 'bg-brand/5 dark:bg-brand/10' : ''}`}
              onClick={() => !n.is_read && markRead(n.id)}
            >
              <div className="mt-0.5">
                {n.type === 'expense_added' ? '🧾' : '💸'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-navy dark:text-white">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">{formatRelativeTime(n.created_at)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
