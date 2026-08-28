import { useState } from 'react'
import { useNotificationStore } from '@/store/notificationStore'
import { formatRelativeTime, cn } from '@/lib/utils'
import { Bell, ArrowLeft, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotificationsPage() {
  const { notifications, markRead } = useNotificationStore()
  const [filter, setFilter] = useState<'All' | 'Expenses' | 'Settlements' | 'System'>('All')

  // Mocking filter logic since backend might not have these types yet
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'All') return true
    if (filter === 'Expenses') return n.type === 'expense_added' || n.type === 'expense_updated'
    if (filter === 'Settlements') return n.type === 'settlement'
    return true
  })

  return (
    <div className="flex flex-col bg-[#F7F9FC] dark:bg-gray-950 px-4 pt-12 pb-24 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-1">
        <Link to="/" className="text-navy dark:text-white shrink-0 hover:bg-gray-200 dark:hover:bg-gray-800 p-1.5 rounded-full transition-colors -ml-1.5">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-[22px] font-extrabold text-navy dark:text-white">Notifications</h1>
        <button className="text-navy dark:text-white shrink-0 hover:bg-gray-200 dark:hover:bg-gray-800 p-1.5 rounded-full transition-colors -mr-1.5">
          <Settings className="h-6 w-6" />
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 pb-6 shrink-0 overflow-x-auto scrollbar-hide">
        {(['All', 'Expenses', 'Settlements', 'System'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 rounded-[12px] text-[13px] font-bold transition-all whitespace-nowrap',
              filter === f 
                ? 'bg-[#107C41] text-white shadow-sm' 
                : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 space-y-1 pb-4">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm font-semibold">No new notifications</p>
          </div>
        ) : (
          filteredNotifications.map(n => {
            // Determine icon and color based on content mock
            const isSettlement = n.title.toLowerCase().includes('paid') || n.title.toLowerCase().includes('settle') || n.type === 'settlement'
            const isExpense = n.title.toLowerCase().includes('expense') || n.type === 'expense_added'
            const isSystem = n.title.toLowerCase().includes('joined') || n.title.toLowerCase().includes('reminder')

            let IconColor = 'bg-red-50 text-red-500'
            let IconEmoji = '🔔'
            if (isSettlement) { IconColor = 'bg-orange-50 text-orange-500'; IconEmoji = '💸' }
            if (isExpense) { IconColor = 'bg-blue-50 text-blue-500'; IconEmoji = '🧾' }
            if (isSystem) { IconColor = 'bg-purple-50 text-purple-500'; IconEmoji = '✨' }

            return (
              <div 
                key={n.id} 
                className={cn(
                  "py-3 flex gap-4 transition-colors cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-0",
                  !n.is_read && "bg-white/50"
                )}
                onClick={() => !n.is_read && markRead(n.id)}
              >
                <div className={cn("w-[42px] h-[42px] rounded-full flex items-center justify-center text-lg shrink-0", IconColor)}>
                  {IconEmoji}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-extrabold text-[14px] text-navy dark:text-white leading-snug truncate">
                      {n.title}
                    </p>
                    <p className="text-[12px] text-gray-400 font-medium whitespace-nowrap pt-0.5">
                      {formatRelativeTime(n.created_at)}
                    </p>
                  </div>
                  <p className="text-[13px] text-gray-500 mt-0.5 font-medium truncate">{n.body}</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
