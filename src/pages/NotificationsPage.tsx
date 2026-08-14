import { useState } from 'react'
import { useNotificationStore } from '@/store/notificationStore'
import { formatRelativeTime, cn } from '@/lib/utils'
import { Bell } from 'lucide-react'

export function NotificationsPage() {
  const { notifications, markRead } = useNotificationStore()
  const [filter, setFilter] = useState<'All' | 'Unread'>('All')

  const filteredNotifications = notifications.filter(n => filter === 'All' || !n.is_read)

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto flex flex-col h-full bg-white dark:bg-gray-950">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-navy dark:text-white">Notifications</h1>
      </div>

      <div className="flex items-center gap-2 pb-1 shrink-0">
        <button
          onClick={() => setFilter('All')}
          className={cn(
            'px-4 py-1.5 rounded-full text-xs font-bold transition-all',
            filter === 'All' ? 'bg-[#107C41] text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
          )}
        >
          All
        </button>
        <button
          onClick={() => setFilter('Unread')}
          className={cn(
            'px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5',
            filter === 'Unread' ? 'bg-[#107C41] text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
          )}
        >
          Unread
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm font-semibold">No new notifications</p>
          </div>
        ) : (
          filteredNotifications.map(n => (
            <div 
              key={n.id} 
              className={cn(
                "p-4 flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer",
                !n.is_read && "bg-[#F0FDF4]/50 dark:bg-[#107C41]/10"
              )}
              onClick={() => !n.is_read && markRead(n.id)}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 bg-blue-100 border border-blue-200">
                {n.type === 'expense_added' ? '🧾' : '💸'}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <p className="font-semibold text-[14px] text-navy dark:text-white leading-snug">
                  {n.title}
                </p>
                <p className="text-[12px] text-gray-500 mt-0.5 font-medium truncate">{n.body}</p>
                <p className="text-[11px] text-gray-400 mt-1.5 font-medium">{formatRelativeTime(n.created_at)}</p>
              </div>
              {!n.is_read && (
                <div className="shrink-0 pt-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#107C41]" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
