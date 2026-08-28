import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, ArrowUpRight, Plus, HandCoins, ArrowRight, Eye } from 'lucide-react'
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
    <div className="px-4 py-6 space-y-6 max-w-5xl xl:max-w-6xl mx-auto w-full">
      {/* ── Greeting ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy dark:text-white mt-0.5 tracking-tight flex items-center gap-1.5">
            {greeting} <br className="lg:hidden" /> {firstName} 👋
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">Better money habits. A brighter tomorrow.</p>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:space-y-0 space-y-6 items-start">
        {/* ── Left Column ───────────────────────────────── */}
        <div className="lg:col-span-7 space-y-6">
          {/* ── Hero Balance Card ─────────────────────────── */}
          {summaryLoading ? (
            <CardSkeleton />
          ) : (
            <div className="relative overflow-hidden rounded-[20px] bg-[#107C41] p-5 shadow-lg shadow-[#107C41]/30 text-white min-h-[140px] flex flex-col justify-between">
              <div className="flex justify-between items-start z-10 relative">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/80 mb-1">
                    Total Net Balance
                  </p>
                  <p className="text-[32px] font-extrabold tracking-tight leading-none mt-1">
                    ₹{Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <button className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm">
                  <Eye className="h-4 w-4 text-white" />
                </button>
              </div>
              
              <div className="z-10 relative mt-4">
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

              {/* Wavy Graph SVG Background */}
              <div className="absolute bottom-0 left-0 right-0 top-1/2 pointer-events-none opacity-50">
                <svg viewBox="0 0 400 100" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                  <path d="M0,50 C50,20 100,80 150,50 C200,20 250,90 300,50 C350,10 380,40 400,60 L400,100 L0,100 Z" fill="rgba(255,255,255,0.1)" />
                  <path d="M0,50 C50,20 100,80 150,50 C200,20 250,90 300,50 C350,10 380,40 400,60" fill="none" stroke="white" strokeWidth="2" />
                  <circle cx="350" cy="27" r="4" fill="white" />
                  <circle cx="350" cy="27" r="8" fill="white" opacity="0.3" />
                </svg>
              </div>
            </div>
          )}

          {/* ── Owed / Owe Cards ──────────────────────────── */}
          {!summaryLoading && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F0FDF4] border border-[#DCFCE7] dark:bg-[#052E16] dark:border-[#14532D] rounded-[16px] p-4 flex flex-col justify-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#15803D] mb-1">
                  You are owed
                </p>
                <p className="text-[22px] font-extrabold text-[#15803D] leading-none mb-1">
                  ₹{totalOweMe.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-[#16A34A] font-medium">
                  by {summary?.oweMeCount ?? 0} people
                </p>
              </div>
              <div className="bg-[#FEF2F2] border border-[#FEE2E2] dark:bg-[#450A0A] dark:border-[#7F1D1D] rounded-[16px] p-4 flex flex-col justify-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#B91C1C] mb-1">
                  You owe
                </p>
                <p className="text-[22px] font-extrabold text-[#B91C1C] leading-none mb-1">
                  ₹{totalIOwe.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-[#EF4444] font-medium">
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
              className="h-[46px] rounded-[14px] bg-[#107C41] hover:bg-[#15803D] text-sm font-semibold gap-2 shadow-sm"
            >
              <Plus className="h-[18px] w-[18px]" />
              Add Expense
            </Button>
            <Button
              variant="outline"
              className="h-[46px] rounded-[14px] text-sm gap-2 font-semibold border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-navy dark:text-white shadow-sm"
              onClick={() => openModal('settle-up')}
            >
              <HandCoins className="h-[18px] w-[18px]" />
              Settle Up
            </Button>
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

        {/* ── Right Column ──────────────────────────────── */}
        <div className="lg:col-span-5 bg-gray-50/50 dark:bg-gray-900/20 rounded-[24px] lg:p-5 lg:border lg:border-gray-100 lg:dark:border-gray-800">
          <div className="flex items-center justify-between mb-4 px-1 lg:px-0">
          <h2 className="text-base font-bold text-navy dark:text-white">Recent Activity</h2>
          <Link to="/activity" className="text-xs text-brand font-semibold flex items-center gap-0.5">
            See all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="space-y-1">
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

      </div>
    </div>
    </div>
  )
}
