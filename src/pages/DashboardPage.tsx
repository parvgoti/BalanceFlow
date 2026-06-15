import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useGroups } from '@/hooks/useGroups'
import { useActivityFeed } from '@/hooks/useExpenses'
import { useDashboardSummary } from '@/hooks/useSettlements'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { StatusBadge } from '@/components/shared/CategoryIcon'
import { CardSkeleton } from '@/components/shared/Skeleton'
import { TopCategoriesList } from '@/components/charts/Charts'
import { formatRelativeTime, CATEGORY_CONFIG, formatCurrency, cn } from '@/lib/utils'
import type { ExpenseCategory, ActivityItem } from '@/types/database'

export function DashboardPage() {
  const { profile } = useAuthStore()
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: groupsData } = useGroups()
  const { data: activityData, isLoading: activityLoading } = useActivityFeed()

  const recentActivity = (activityData?.pages.flatMap(p => p.data) ?? []) as ActivityItem[]

  // Compute category totals from activity
  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {}
    recentActivity
      .filter(a => a.type === 'expense')
      .forEach(a => {
        const cat = a.category as ExpenseCategory
        if (CATEGORY_CONFIG[cat]) {
          map[cat] = (map[cat] ?? 0) + Number(a.amount)
        }
      })
    return Object.entries(map)
      .map(([category, total]) => ({ category: category as ExpenseCategory, total }))
      .sort((a, b) => b.total - a.total)
  }, [recentActivity])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Overview</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {greeting}, {firstName}! Here&apos;s your financial status across all groups.
        </p>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Net balance (large) */}
        {summaryLoading ? (
          <div className="lg:col-span-2"><CardSkeleton /></div>
        ) : (
          <div className="lg:col-span-2 card p-6 bg-gradient-to-br from-brand-subtle to-primary-50 dark:from-brand-dark/20 dark:to-gray-900">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Total Net Balance
            </p>
            <div className="flex items-center gap-3 mb-4">
              <CurrencyDisplay
                amount={summary?.netBalance ?? 0}
                signed
                showColor
                size="2xl"
              />
              {(summary?.netBalance ?? 0) >= 0 ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">
                  <TrendingUp className="h-3 w-3" />
                  +12% this month
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-100 px-2.5 py-1 rounded-full">
                  <TrendingDown className="h-3 w-3" />
                  Settle up
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <TrendingDown className="h-3 w-3 text-emerald-500" />
                  YOU ARE OWED
                </div>
                <CurrencyDisplay amount={summary?.totalOweMe ?? 0} size="lg" className="text-gray-900 dark:text-white" />
              </div>
              <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <TrendingUp className="h-3 w-3 text-red-500" />
                  YOU OWE
                </div>
                <CurrencyDisplay amount={summary?.totalIOwe ?? 0} size="lg" className="text-gray-900 dark:text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Top categories */}
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Top Categories</h3>
          {categoryTotals.length > 0 ? (
            <TopCategoriesList data={categoryTotals} />
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              No expenses yet
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h2>
          <Link
            to="/activity"
            className="text-sm text-brand font-medium hover:underline flex items-center gap-1"
          >
            View All <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {activityLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            ))
          ) : recentActivity.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400 text-sm">
              <p className="text-4xl mb-3">📭</p>
              No recent activity. Add your first expense!
            </div>
          ) : (
            recentActivity.slice(0, 8).map((item: ActivityItem) => (
              <div key={`${item.type}-${item.id}`} className={cn("flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors", item.type === 'deleted_expense' && "opacity-75 grayscale")}>
                <CategoryIcon category={item.category as ExpenseCategory} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold truncate", item.type === 'deleted_expense' ? "text-gray-500 line-through" : "text-gray-900 dark:text-white")}>{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.group_name} • {formatRelativeTime(item.created_at)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn("text-sm font-bold", item.type === 'deleted_expense' ? "text-gray-400 line-through" : "text-gray-900 dark:text-white")}>
                    {formatCurrency(item.amount)}
                  </p>
                  {item.type === 'deleted_expense' ? (
                    <div className="inline-block px-1.5 py-0.5 mt-1 rounded text-2xs font-semibold bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 uppercase tracking-wider">
                      Deleted
                    </div>
                  ) : (
                    <StatusBadge status={item.type === 'settlement' ? 'settled' : 'split'} />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Groups quick access */}
      {(groupsData?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your Groups</h2>
            <Link to="/groups" className="text-sm text-brand font-medium hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {groupsData?.slice(0, 4).map((group: any) => group && (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="card-hover p-4 space-y-2"
              >
                <p className="text-2xl">
                  {['🏖️', '🏠', '🎉', '✈️'][group.name.charCodeAt(0) % 4]}
                </p>
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{group.name}</p>
                <p className="text-xs text-gray-500">{group.group_members?.length ?? 0} members</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
