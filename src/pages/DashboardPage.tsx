import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, ArrowUpRight, Plus, Wallet } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useGroups } from '@/hooks/useGroups'
import { useActivityFeed } from '@/hooks/useExpenses'
import { useDashboardSummary } from '@/hooks/useSettlements'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { StatusBadge } from '@/components/shared/CategoryIcon'
import { CardSkeleton } from '@/components/shared/Skeleton'
import { TopCategoriesList } from '@/components/charts/Charts'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/uiStore'
import { formatRelativeTime, CATEGORY_CONFIG, formatCurrency, cn } from '@/lib/utils'
import type { ExpenseCategory, ActivityItem } from '@/types/database'

export function DashboardPage() {
  const { profile } = useAuthStore()
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: groupsData } = useGroups()
  const { data: activityData, isLoading: activityLoading } = useActivityFeed()
  const { openModal } = useUIStore()

  // Get active group IDs to filter out archived group data
  const activeGroupIds = useMemo(
    () => new Set((groupsData ?? []).map((g: any) => g.id)),
    [groupsData]
  )

  const recentActivity = useMemo(() => {
    const allActivity = (activityData?.pages.flatMap(p => p.data) ?? []) as ActivityItem[]
    // Only show activity from active (non-archived) groups
    return allActivity.filter(a => activeGroupIds.has(a.group_id))
  }, [activityData, activeGroupIds])

  // Compute category totals from activity (already filtered to active groups)
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
  const greeting = hour < 12 ? 'GOOD MORNING' : hour < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING'

  const netBalance = summary?.netBalance ?? 0
  const totalOweMe = summary?.totalOweMe ?? 0
  const totalIOwe = summary?.totalIOwe ?? 0

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
      {/* Greeting header */}
      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-widest">{greeting}</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-0.5">{profile?.full_name ?? firstName}</h1>
      </div>

      {/* ── Hero Net Balance Card ───────────────────────────────────── */}
      {summaryLoading ? (
        <CardSkeleton />
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-5 sm:p-6 text-white shadow-glow">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Total Net Balance</p>
          <p className={cn(
            "text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow",
            netBalance < 0
              ? "text-red-400 dark:text-red-400"
              : "text-emerald-300 dark:text-emerald-300"
          )}>
            {netBalance >= 0 ? '' : '-'}
            {formatCurrency(Math.abs(netBalance))}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            {netBalance > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                <TrendingUp className="h-3 w-3" /> Net Positive
              </span>
            ) : netBalance < 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30 px-2.5 py-0.5 rounded-full">
                <TrendingDown className="h-3 w-3" /> Net Negative
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                All settled up ✓
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── You are Owed / You Owe ─────────────────────────────────── */}
      {!summaryLoading && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
                You are owed
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(totalOweMe)}
              </p>
            </div>
          </div>
          <div className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-red-500" />
                You owe
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-red-500 dark:text-red-400 mt-1">
                {formatCurrency(totalIOwe)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Action Buttons ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          id="dashboard-add-expense-btn"
          onClick={() => openModal('add-expense')}
          className="bg-brand hover:bg-brand-light text-white font-semibold shadow-glow h-12 rounded-xl text-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Expense
        </Button>
        <Button
          variant="outline"
          className="h-12 rounded-xl text-sm font-semibold border-gray-200 dark:border-gray-700"
          onClick={() => {}}
        >
          <Wallet className="h-4 w-4 mr-1.5" />
          Settle Up
        </Button>
      </div>

      {/* ── Recent Activity ────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between px-4 sm:px-6 pt-5 pb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h2>
          <Link
            to="/activity"
            className="text-sm text-brand font-medium hover:underline flex items-center gap-1"
          >
            See All <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {activityLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 sm:px-6 py-4">
                <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
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
            recentActivity.slice(0, 6).map((item: ActivityItem) => (
              <div key={`${item.type}-${item.id}`} className={cn("flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors", item.type === 'deleted_expense' && "opacity-75 grayscale")}>
                <CategoryIcon category={item.category as ExpenseCategory} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold truncate", item.type === 'deleted_expense' ? "text-gray-500 line-through" : "text-gray-900 dark:text-white")}>{item.title}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
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

      {/* ── Your Groups (Quick Access) ─────────────────────────────── */}
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

      {/* ── Top Categories (hidden on mobile to keep it clean, shown on md+) ── */}
      {categoryTotals.length > 0 && (
        <div className="card p-5 hidden md:block">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Top Categories</h3>
          <TopCategoriesList data={categoryTotals} />
        </div>
      )}
    </div>
  )
}
