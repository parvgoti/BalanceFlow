import { useActivityFeed } from '@/hooks/useExpenses'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { StatusBadge } from '@/components/shared/CategoryIcon'
import { ExpenseListSkeleton } from '@/components/shared/Skeleton'
import { formatRelativeTime, formatCurrency, cn } from '@/lib/utils'
import type { ActivityItem, ExpenseCategory } from '@/types/database'

export function ActivityPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useActivityFeed()
  const allItems = (data?.pages.flatMap(p => p.data) ?? []) as ActivityItem[]

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Activity Feed</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          All expenses and settlements across your groups
        </p>
      </div>

      <div className="card divide-y divide-gray-50 dark:divide-gray-800">
        {isLoading ? (
          <div className="p-4">
            <ExpenseListSkeleton />
          </div>
        ) : allItems.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium">No activity yet</p>
          </div>
        ) : (
          allItems.map((item: ActivityItem) => (
            <div key={`${item.type}-${item.id}`} className={cn("flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors", item.type === 'deleted_expense' && "opacity-75 grayscale")}>
              <CategoryIcon category={item.category as ExpenseCategory} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={cn("font-semibold text-sm", item.type === 'deleted_expense' ? "text-gray-500 line-through" : "text-gray-900 dark:text-white")}>{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.group_name} • {formatRelativeTime(item.created_at)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.type === 'deleted_expense' ? 'deleted by ' : 'by '} {item.actor_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className={cn("font-bold text-sm", item.type === 'deleted_expense' ? "text-gray-400 line-through" : "text-gray-900 dark:text-white")}>
                      {formatCurrency(item.amount)}
                    </p>
                    {item.type === 'deleted_expense' ? (
                      <div className="inline-block px-2 py-0.5 rounded text-2xs font-semibold bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 uppercase tracking-wider">
                        Deleted
                      </div>
                    ) : (
                      <StatusBadge status={item.type === 'settlement' ? 'settled' : 'split'} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {hasNextPage && (
          <div className="p-4 text-center">
            <button
              id="load-more-activity-btn"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-sm text-brand font-medium hover:underline disabled:opacity-50"
            >
              {isFetchingNextPage ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
