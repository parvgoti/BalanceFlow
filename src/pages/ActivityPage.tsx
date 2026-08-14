import { useState, useMemo } from 'react'
import { useActivityFeed } from '@/hooks/useExpenses'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { StatusBadge } from '@/components/shared/CategoryIcon'
import { UserAvatar } from '@/components/ui/avatar'
import { ExpenseListSkeleton } from '@/components/shared/Skeleton'
import { formatRelativeTime, formatCurrency, formatDateGroup, groupBy, cn } from '@/lib/utils'
import type { ActivityItem, ExpenseCategory } from '@/types/database'

const FILTERS = ['All', 'Expenses', 'Settlements', 'Group'] as const
type Filter = typeof FILTERS[number]

export function ActivityPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useActivityFeed()
  const allItems = (data?.pages.flatMap(p => p.data) ?? []) as ActivityItem[]
  const [filter, setFilter] = useState<Filter>('All')

  const filteredItems = useMemo(() => {
    if (filter === 'All') return allItems
    if (filter === 'Expenses') return allItems.filter(i => i.type === 'expense' || i.type === 'deleted_expense')
    if (filter === 'Settlements') return allItems.filter(i => i.type === 'settlement')
    return allItems
  }, [allItems, filter])

  // Group items by date
  const groupedByDate = groupBy(filteredItems, (item) => {
    const d = new Date(item.created_at)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return `Today, ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  })

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy dark:text-white">Activity Feed</h1>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'filter-pill',
              filter === f ? 'filter-pill-active' : 'filter-pill-inactive'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="p-4">
          <ExpenseListSkeleton />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center">
          <div className="h-12 w-12 rounded-2xl bg-brand/10 flex items-center justify-center text-xl mb-3 mx-auto">
            📭
          </div>
          <p className="font-semibold text-navy dark:text-white text-sm">No activity yet</p>
          <p className="text-xs text-gray-400 mt-1">Your expense and settlement history will appear here.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">{date}</p>
              <div className="space-y-1">
                {(items as ActivityItem[]).map((item) => (
                  <div key={`${item.type}-${item.id}`} className={cn(
                    "flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors",
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
            </div>
          ))}

          {hasNextPage && (
            <div className="text-center pt-2">
              <button
                id="load-more-activity-btn"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="text-xs text-brand font-semibold hover:underline disabled:opacity-50"
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Import needed for category labels
import { CATEGORY_CONFIG } from '@/lib/utils'
