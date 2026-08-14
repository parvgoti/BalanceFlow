import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useActivityFeed } from '@/hooks/useExpenses'
import { CategoryIcon, StatusBadge } from '@/components/shared/CategoryIcon'
import { formatCurrency, formatRelativeTime, cn } from '@/lib/utils'
import type { ActivityItem, ExpenseCategory } from '@/types/database'

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

  const { data } = useActivityFeed()
  const allItems = (data?.pages.flatMap(p => p.data) ?? []) as ActivityItem[]

  // Map dates to activity items
  const activityMap = useMemo(() => {
    const map = new Map<string, ActivityItem[]>()
    allItems.forEach(item => {
      const d = new Date(item.created_at)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    })
    return map
  }, [allItems])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []
    // Add empty slots for days before the 1st
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }
    // Add days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const days = getDaysInMonth(currentMonth)

  const selectedDateKey = selectedDate ? `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}` : null
  const selectedItems = selectedDateKey ? (activityMap.get(selectedDateKey) || []) : []

  return (
    <div className="px-4 py-5 space-y-5 max-w-lg mx-auto flex flex-col h-full bg-white dark:bg-gray-950 overflow-y-auto">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold text-navy dark:text-white">Calendar</h1>
      </div>

      <div className="shrink-0 space-y-5">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-extrabold text-navy dark:text-white uppercase tracking-widest">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <button 
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center text-sm">
          {days.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="aspect-square" />
            
            const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
            const items = activityMap.get(dateKey) || []
            const isSelected = selectedDateKey === dateKey
            
            // Check for dots
            const hasExpense = items.some(item => item.type === 'expense')
            const hasSettlement = items.some(item => item.type === 'settlement')

            return (
              <div 
                key={i} 
                onClick={() => setSelectedDate(date)}
                className="flex flex-col items-center justify-center cursor-pointer h-10 group"
              >
                <div className={cn(
                  "w-8 h-8 flex items-center justify-center font-bold rounded-full transition-all text-[15px]",
                  isSelected 
                    ? "bg-[#107C41] text-white shadow-sm" 
                    : "text-navy dark:text-white group-hover:bg-gray-100 dark:group-hover:bg-gray-800"
                )}>
                  {date.getDate()}
                </div>
                {/* Dots */}
                <div className="flex gap-0.5 mt-0.5 h-1">
                  {hasExpense && <div className={cn("w-1 h-1 rounded-full bg-orange-400", isSelected && "opacity-0")} />}
                  {hasSettlement && <div className={cn("w-1 h-1 rounded-full bg-blue-500", isSelected && "opacity-0")} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {selectedDate && (
          <div className="h-full flex flex-col">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 shrink-0">
              {selectedDate.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
            </h3>
            
            {selectedItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm font-semibold text-gray-500">No activity on this day</p>
              </div>
            ) : (
              <div className="space-y-1">
                {selectedItems.map((item) => (
                  <div key={`${item.type}-${item.id}`} className={cn(
                    "flex items-center gap-3 py-3 hover:bg-gray-50/50 transition-colors",
                    item.type === 'deleted_expense' && "opacity-60 grayscale"
                  )}>
                    <CategoryIcon category={item.category as ExpenseCategory} size="sm" />
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-[15px] font-semibold truncate tracking-tight",
                        item.type === 'deleted_expense' ? "text-gray-400 line-through" : "text-navy dark:text-white"
                      )}>
                        {item.title}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 font-medium">
                        {item.group_name} · {formatRelativeTime(item.created_at)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-[15px] font-bold tracking-tight mb-1",
                        item.type === 'deleted_expense' ? "text-gray-400 line-through" : "text-navy dark:text-white"
                      )}>
                        {formatCurrency(item.amount)}
                      </p>
                      <StatusBadge status={item.type === 'settlement' ? 'settled' : 'split'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
