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
              <div className="card divide-y divide-gray-50 dark:divide-gray-800">
                {(items as ActivityItem[]).map((item) => {
                  // Determine avatar color based on type
                  const avatarColors: Record<string, string> = {
                    expense: 'bg-brand',
                    settlement: 'bg-blue-500',
                    deleted_expense: 'bg-red-500',
                  }
                  const avatarColor = avatarColors[item.type] ?? 'bg-gray-400'

                  // Description text
                  let description = ''
                  if (item.type === 'expense') {
                    description = `You added an expense`
                  } else if (item.type === 'settlement') {
                    description = `${item.actor_name} settled`
                  } else if (item.type === 'deleted_expense') {
                    description = `Expense deleted`
                  }

                  return (
                    <div key={`${item.type}-${item.id}`} className={cn(
                      "flex items-start gap-3 px-4 py-3",
                      item.type === 'deleted_expense' && "opacity-60"
                    )}>
                      {/* Avatar circle */}
                      <div className={cn(
                        'h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
                        avatarColor
                      )}>
                        {item.actor_name?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">{description}</p>
                        <p className={cn(
                          "text-sm font-semibold mt-0.5",
                          item.type === 'deleted_expense' ? "text-gray-400 line-through" : "text-navy dark:text-white"
                        )}>
                          {item.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={cn('category-pill',
                            item.type === 'settlement' ? 'bg-blue-50 text-blue-700' :
                            item.type === 'deleted_expense' ? 'bg-red-50 text-red-600' :
                            'bg-orange-50 text-orange-700'
                          )}>
                            {item.type === 'settlement' ? 'Settled' : item.type === 'deleted_expense' ? 'Deleted' : (CATEGORY_CONFIG[item.category as ExpenseCategory]?.label ?? 'Other')}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-gray-400">
                          {new Date(item.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className={cn(
                          "text-sm font-bold mt-0.5",
                          item.type === 'deleted_expense' ? "text-gray-400 line-through" : "text-navy dark:text-white"
                        )}>
                          {formatCurrency(item.amount)}
                        </p>
                      </div>
                    </div>
                  )
                })}
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
