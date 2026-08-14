import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, ArrowUpRight, Plus, HandCoins, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useGroups } from '@/hooks/useGroups'
import { useActivityFeed } from '@/hooks/useExpenses'
import { useDashboardSummary } from '@/hooks/useSettlements'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { StatusBadge } from '@/components/shared/CategoryIcon'
import { CardSkeleton } from '@/components/shared/Skeleton'
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

  const activeGroupIds = useMemo(
    () => new Set((groupsData ?? []).map((g: any) => g.id)),
    [groupsData]
  )

  const recentActivity = useMemo(() => {
    const allActivity = (activityData?.pages.flatMap(p => p.data) ?? []) as ActivityItem[]
    return allActivity.filter(a => activeGroupIds.has(a.group_id))
  }, [activityData, activeGroupIds])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,'

  const netBalance = summary?.netBalance ?? 0
  const totalOweMe = summary?.totalOweMe ?? 0
  const totalIOwe = summary?.totalIOwe ?? 0

  return (
    <div className="px-4 py-5 space-y-5 max-w-lg mx-auto">
      {/* ── Greeting ──────────────────────────────────── */}
      <div>
        <p className="text-sm text-gray-500">{greeting}</p>
        <h1 className="text-2xl font-bold text-navy dark:text-white mt-0.5">
          {firstName} 👋
        </h1>
      </div>

      {/* ── Hero Balance Card ─────────────────────────── */}
      {summaryLoading ? (
        <CardSkeleton />
      ) : (
        <div className="card-hero">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">
            Total Net Balance
          </p>
          <p className="text-3xl font-extrabold text-white tracking-tight">
            ₹{Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            {netBalance > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                <TrendingUp className="h-3 w-3" /> 12.5% vs last month
              </span>
            ) : netBalance < 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                <TrendingDown className="h-3 w-3" /> Net Negative
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                All settled up ✓
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Owed / Owe Cards ──────────────────────────── */}
      {!summaryLoading && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card-flat p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
              You are owed
            </p>
            <p className="text-xl font-extrabold text-brand">
              ₹{totalOweMe.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              by {summary?.oweMeCount ?? 0} people
            </p>
          </div>
          <div className="card-flat p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
              You owe
            </p>
            <p className="text-xl font-extrabold text-red-500">
              ₹{totalIOwe.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              to {summary?.iOweCount ?? 0} people
            </p>
          </div>
        </div>
      )}

      {/* ── Action Buttons ────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          id="dashboard-add-expense-btn"
          onClick={() => openModal('add-expense')}
          className="h-11 rounded-xl text-sm gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
        <Button
          variant="outline"
          className="h-11 rounded-xl text-sm gap-1.5 font-semibold"
          onClick={() => openModal('settle-up')}
        >
          <HandCoins className="h-4 w-4" />
          Settle Up
        </Button>
      </div>

      {/* ── Recent Activity ───────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-navy dark:text-white">Recent Activity</h2>
          <Link to="/activity" className="text-xs text-brand font-semibold flex items-center gap-0.5">
            See all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="card divide-y divide-gray-50 dark:divide-gray-800">
          {activityLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="h-10 w-10 rounded-full skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 skeleton rounded" />
                  <div className="h-2.5 w-24 skeleton rounded" />
                </div>
                <div className="h-4 w-16 skeleton rounded" />
              </div>
            ))
          ) : recentActivity.length === 0 ? (
            <div className="flex flex-col items-center py-12 px-4 text-center">
              <div className="h-12 w-12 rounded-2xl bg-brand/10 flex items-center justify-center text-xl mb-3">
                📭
              </div>
              <p className="text-sm font-semibold text-navy dark:text-white mb-1">No recent activity</p>
              <p className="text-xs text-gray-400 max-w-xs mb-4">
                Add an expense or settle up to see updates here.
              </p>
              <Button size="sm" onClick={() => openModal('add-expense')} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Expense
              </Button>
            </div>
          ) : (
            recentActivity.slice(0, 5).map((item: ActivityItem) => (
              <div key={`${item.type}-${item.id}`} className={cn(
                "flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors",
                item.type === 'deleted_expense' && "opacity-60 grayscale"
              )}>
                <CategoryIcon category={item.category as ExpenseCategory} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-semibold truncate",
                    item.type === 'deleted_expense' ? "text-gray-400 line-through" : "text-navy dark:text-white"
                  )}>
                    {item.title}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {item.group_name} · {formatRelativeTime(item.created_at)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn(
                    "text-sm font-bold",
                    item.type === 'deleted_expense' ? "text-gray-400 line-through" : "text-navy dark:text-white"
                  )}>
                    {formatCurrency(item.amount)}
                  </p>
                  <div className="mt-0.5">
                    {item.type === 'deleted_expense' ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 uppercase">
                        Deleted
                      </span>
                    ) : (
                      <StatusBadge status={item.type === 'settlement' ? 'settled' : 'split'} />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Your Groups (Quick Access) ────────────────── */}
      {(groupsData?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-navy dark:text-white">Your Groups</h2>
            <Link to="/groups" className="text-xs text-brand font-semibold flex items-center gap-0.5">
              View All <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {groupsData?.slice(0, 4).map((group: any) => group && (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="card-hover p-3.5 space-y-1.5"
              >
                <p className="text-xl">
                  {['🏖️', '🏠', '🎉', '✈️'][group.name.charCodeAt(0) % 4]}
                </p>
                <p className="font-semibold text-sm text-navy dark:text-white truncate">{group.name}</p>
                <p className="text-[11px] text-gray-400">{group.group_members?.length ?? 0} members</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
