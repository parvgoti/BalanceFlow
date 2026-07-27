import { useState, useMemo, useEffect } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, eachMonthOfInterval, format, isWithinInterval, parseISO
} from 'date-fns'
import {
  ArrowLeft, Download, Users, DollarSign, BarChart2,
  Search, Filter, Settings, UserMinus, UserPlus, History, Trash2, X, Plus
} from 'lucide-react'
import { UserSearchInput } from '@/components/ui/UserSearchInput'
import { useGroup, useGroupBalances, useAddMembers, useRemoveMember, useDeleteGroup, useResetGroupData } from '@/hooks/useGroups'
import { useExpenses, useDeleteExpense } from '@/hooks/useExpenses'
import { useSettlements } from '@/hooks/useSettlements'
import { useRealtimeGroup } from '@/hooks/useRealtime'
import {
  useGroupResetRequests,
  useCreateResetRequest,
  useRespondResetRequest,
  useCancelResetRequest,
} from '@/hooks/useGroupResetRequests'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AvatarGroup, UserAvatar } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { ExpenseCard } from '@/components/expenses/ExpenseCard'
import { SettleUpModal } from '@/components/settlements/SettleUpModal'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { ExpenseListSkeleton } from '@/components/shared/Skeleton'
import { SpendingTrendChart, BalanceBarChart } from '@/components/charts/Charts'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { supabase } from '@/lib/supabase'
import {
  simplifyDebts, formatCurrency, formatDateGroup, groupBy, cn,
  type SimplifiedDebt,
} from '@/lib/utils'
import type { ExpenseWithSplits, GroupBalance } from '@/types/database'

export function GroupDetailPage() {
  const { id: groupId = '' } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const { openModal } = useUIStore()

  const deleteExpense = useDeleteExpense(groupId)

  // ── 1. Fetching ────────────────────────────────────────────────
  const navigate = useNavigate()

  const { data: group, isLoading: groupLoading } = useGroup(groupId)
  const { data: balances } = useGroupBalances(groupId)
  const { data: expensePages, isLoading: expensesLoading, fetchNextPage, hasNextPage } = useExpenses(groupId)
  const { data: settlements } = useSettlements(groupId)

  const [settleDebt, setSettleDebt] = useState<SimplifiedDebt | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [memberMeta, setMemberMeta] = useState<Record<string, string>>({})
  const [memberIdMeta, setMemberIdMeta] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [chartRange, setChartRange] = useState<'week' | 'month' | 'year'>('month')

  const addMembers = useAddMembers(groupId)
  const removeMember = useRemoveMember(groupId)

  const handleAddInvite = (email: string, displayName?: string, userId?: string) => {
    const normalised = email.trim().toLowerCase()
    if (!normalised || selectedEmails.includes(normalised)) return
    setSelectedEmails(prev => [...prev, normalised])
    if (displayName) {
      setMemberMeta(prev => ({ ...prev, [normalised]: displayName }))
    }
    if (userId) {
      setMemberIdMeta(prev => ({ ...prev, [normalised]: userId }))
    }
  }

  const handleRemoveInvite = (email: string) => {
    setSelectedEmails(prev => prev.filter(e => e !== email))
    setMemberMeta(prev => { const n = { ...prev }; delete n[email]; return n })
    setMemberIdMeta(prev => { const n = { ...prev }; delete n[email]; return n })
  }
  const deleteGroup = useDeleteGroup()
  const resetGroupData = useResetGroupData(groupId)
  const { data: resetRequests = [] } = useGroupResetRequests(groupId)
  const createResetRequest = useCreateResetRequest(groupId)
  const respondResetRequest = useRespondResetRequest(groupId)
  const cancelResetRequest = useCancelResetRequest(groupId)

  // Subscribe to realtime updates
  useRealtimeGroup(groupId)

  const allExpenses = expensePages?.pages.flatMap(p => p.data) ?? []
  const filteredExpenses = allExpenses.filter(e =>
    (e as any).description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group expenses by date
  const expensesByDate = groupBy(filteredExpenses as any[], (e: any) => formatDateGroup(e.date))

  // My balance in this group
  const typedBalances = (balances ?? []) as GroupBalance[]
  const myBalance = typedBalances.find(b => b.user_id === user?.id)?.net_balance ?? 0

  // Simplified debts
  const simplifiedDebts = typedBalances.length ? simplifyDebts(typedBalances) : []
  const myDebts = simplifiedDebts.filter(d => d.from_user_id === user?.id || d.to_user_id === user?.id)

  // Automatically open settle up modal if navigated from dashboard with autoSettle
  const location = useLocation()
  useEffect(() => {
    const state = location.state as { openSettleModal?: boolean } | null
    const queryParams = new URLSearchParams(location.search)
    const shouldOpenSettle = state?.openSettleModal || queryParams.get('settle') === 'true'

    if (shouldOpenSettle && myDebts.length > 0 && !settleDebt) {
      const timer = setTimeout(() => {
        setSettleDebt(myDebts[0])
      }, 0)
      // Clean up URL/state so refresh doesn't reopen modal
      if (queryParams.get('settle') === 'true') {
        queryParams.delete('settle')
        const newSearch = queryParams.toString()
        navigate(`/groups/${groupId}${newSearch ? '?' + newSearch : ''}`, { replace: true, state: {} })
      } else if (state?.openSettleModal) {
        navigate(`/groups/${groupId}`, { replace: true, state: {} })
      }
      return () => clearTimeout(timer)
    }
  }, [location.state, location.search, myDebts, settleDebt, groupId, navigate])

  // Settlement progress
  const totalUnsettled = typedBalances.reduce((s, b) => s + Math.abs(b.net_balance), 0)
  const isGroupSettled = totalUnsettled < 0.01
  const totalSettled = settlements?.reduce((s, st) => s + st.amount, 0) ?? 0
  const settledPct = totalUnsettled === 0 ? 100 : Math.min(100, (totalSettled / (totalSettled + totalUnsettled)) * 100)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members: any[] = (group as any)?.group_members ?? []
  const isAdmin = members.find(m => m.user_id === user?.id)?.role === 'admin'

  const hasPendingReset = resetRequests.length > 0
  const hasDeniedReset = resetRequests.some(r => r.status === 'denied')
  const allAcceptedReset = resetRequests.length > 0 && resetRequests.every(r => r.status === 'accepted') && resetRequests.length === members.length
  const myResetStatus = resetRequests.find(r => r.user_id === user?.id)?.status
  const resetRequester = resetRequests[0]?.profile?.full_name || 'An admin'

  // Chart data
  const trendData = useMemo(() => {
    const now = new Date()
    let interval: { start: Date; end: Date }
    let dataPoints: Date[] = []
    let dateFormat = ''
    let groupKey = ''

    if (chartRange === 'week') {
      interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
      dataPoints = eachDayOfInterval(interval)
      dateFormat = 'EEE'
      groupKey = 'yyyy-MM-dd'
    } else if (chartRange === 'month') {
      interval = { start: startOfMonth(now), end: endOfMonth(now) }
      dataPoints = eachDayOfInterval(interval)
      dateFormat = 'd'
      groupKey = 'yyyy-MM-dd'
    } else {
      interval = { start: startOfYear(now), end: endOfYear(now) }
      dataPoints = eachMonthOfInterval(interval)
      dateFormat = 'MMM'
      groupKey = 'yyyy-MM'
    }

    const expensesInInterval = allExpenses.filter((e: any) => {
      if (!e.date) return false
      return isWithinInterval(parseISO(e.date), interval)
    })

    const expensesGroupedForChart = groupBy(expensesInInterval as any[], (e: any) => format(parseISO(e.date), groupKey))

    return dataPoints.map(date => {
      const key = format(date, groupKey)
      const expenses = expensesGroupedForChart[key] || []
      return {
        month: format(date, dateFormat),
        amount: expenses.reduce((s, e) => s + ((e as any).amount ?? 0), 0)
      }
    })
  }, [allExpenses, chartRange])

  const balanceBarData = typedBalances.map(b => ({
    name: b.full_name?.split(' ')[0] ?? 'User',
    owed: Math.max(0, b.net_balance),
    owes: Math.abs(Math.min(0, b.net_balance)),
  }))

  if (groupLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-8" />
        <ExpenseListSkeleton />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="p-6 text-center text-gray-500">Group not found.</div>
    )
  }

  const groupName = (group as any).name as string

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Main content */}
      <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto pb-24 lg:pb-6">
        {/* Back + Group Name Header */}
        <div>
          <Link to="/groups" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand mb-3 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Groups</span>
          </Link>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">{groupName}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {(group as any)?.currency ?? 'INR'} {new Intl.NumberFormat('en-US', { style: 'currency', currency: (group as any)?.currency || 'INR' }).formatToParts(0).find(x => x.type === 'currency')?.value || '₹'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Member Avatars + Invite */}
        <div className="flex items-center gap-3">
          <AvatarGroup
            users={members.map(m => ({
              id: m.user_id,
              full_name: m.profiles?.full_name ?? '?',
              avatar_url: m.profiles?.avatar_url,
            }))}
            max={3}
          />
          {members.length > 3 && (
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">+{members.length - 3}</span>
          )}
          {isAdmin && (
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-brand hover:text-brand transition-colors"
              onClick={() => {
                const tabsTrigger = document.querySelector('[data-value="settings"]') as HTMLButtonElement
                tabsTrigger?.click()
              }}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite
            </button>
          )}
        </div>

        {/* Reset Request Banner */}
        {hasPendingReset && (
          <div className={cn(
            "p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4",
            hasDeniedReset
              ? "bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-900"
              : allAcceptedReset
                ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900"
                : "bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900"
          )}>
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">
                {hasDeniedReset ? '❌' : allAcceptedReset ? '✅' : '⚠️'}
              </span>
              <div>
                <h4 className={cn(
                  "text-sm font-bold",
                  hasDeniedReset ? "text-red-900 dark:text-red-300"
                  : allAcceptedReset ? "text-emerald-900 dark:text-emerald-300"
                  : "text-amber-900 dark:text-amber-300"
                )}>
                  {hasDeniedReset && "Group Data Reset Denied"}
                  {allAcceptedReset && "Group Data Reset Approved"}
                  {!hasDeniedReset && !allAcceptedReset && `Group Data Reset Requested (${resetRequests.filter(r => r.status === 'accepted').length}/${members.length} Accepted)`}
                </h4>
                <p className={cn(
                  "text-xs mt-0.5",
                  hasDeniedReset ? "text-red-700 dark:text-red-400"
                  : allAcceptedReset ? "text-emerald-700 dark:text-emerald-400"
                  : "text-amber-700 dark:text-amber-400"
                )}>
                  {hasDeniedReset && "A group member denied the request to reset group data. The admin cannot reset the data."}
                  {allAcceptedReset && "All members accepted! The admin can now reset the group data."}
                  {!hasDeniedReset && !allAcceptedReset && `${resetRequester} has requested to reset all expense and settlement data. Every member must accept.`}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {resetRequests.map(r => (
                    <span
                      key={r.id}
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                        r.status === 'accepted' && "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
                        r.status === 'pending' && "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
                        r.status === 'denied' && "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
                      )}
                    >
                      {r.profile?.full_name || 'Member'}: {r.status}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {myResetStatus === 'pending' && (
                <>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    loading={respondResetRequest.isPending}
                    onClick={() => respondResetRequest.mutate({ status: 'accepted' })}
                  >
                    Accept ✓
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-100 dark:hover:bg-red-950 text-xs font-semibold"
                    loading={respondResetRequest.isPending}
                    onClick={() => respondResetRequest.mutate({ status: 'denied' })}
                  >
                    Deny ✕
                  </Button>
                </>
              )}
              {isAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => cancelResetRequest.mutate()}
                >
                  Cancel Request
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Total Group Spend + You Owe Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Group Spend</p>
            <p className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
              {formatCurrency(allExpenses.reduce((s, e) => s + ((e as any).amount ?? 0), 0))}
            </p>
          </div>
          <div className={cn(
            "card p-4 border-l-2",
            myBalance < 0 ? "border-l-red-400" : "border-l-emerald-400"
          )}>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {myBalance > 0 ? 'You are owed' : myBalance < 0 ? 'You Owe' : 'All Settled'}
            </p>
            <p className={cn(
              "text-xl sm:text-2xl font-extrabold mt-1",
              myBalance < 0 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
            )}>
              {formatCurrency(Math.abs(myBalance))}
            </p>
          </div>
        </div>

        {/* Full-width Add Expense CTA */}
        <Button
          className="w-full bg-brand hover:bg-brand-light text-white font-semibold shadow-glow h-12 rounded-xl text-sm"
          id={`group-add-expense-cta-${groupId}`}
          onClick={() => openModal('add-expense', { groupId })}
        >
          <Plus className="h-5 w-5 mr-1.5" />
          Add Expense
        </Button>

        {/* Tabs */}
        <Tabs defaultValue="expenses">
          <TabsList>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="balances"><Users className="h-4 w-4" />Members</TabsTrigger>
            <TabsTrigger value="settlements"><History className="h-4 w-4" />Settlements</TabsTrigger>
            <TabsTrigger value="charts"><BarChart2 className="h-4 w-4" />Analytics</TabsTrigger>
            {isAdmin && <TabsTrigger value="settings"><Settings className="h-4 w-4" />Settings</TabsTrigger>}
          </TabsList>

          {/* Expenses tab */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="expense-search-input"
                  type="text"
                  placeholder="Search expenses…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <Button variant="secondary" size="sm" id="expense-filter-btn">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
              </Button>
            </div>

            {expensesLoading ? (
              <ExpenseListSkeleton />
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">🧾</p>
                <p className="font-medium">No expenses yet</p>
                <p className="text-sm mt-1">Add the first expense to get started</p>
              </div>
            ) : (
              <div className="card divide-y divide-gray-50 dark:divide-gray-800">
                {Object.entries(expensesByDate).map(([date, expenses]) => (
                  <div key={date}>
                    <p className="px-4 py-2 text-xs font-bold text-gray-400 tracking-widest">{date}</p>
                    {(expenses as any[]).map(expense => (
                      <ExpenseCard
                        key={expense.id}
                        expense={expense as ExpenseWithSplits}
                        onEdit={(e) => {
                          if (e.paid_by !== user?.id && !isAdmin) {
                            alert("You can only edit expenses you paid for.")
                            return
                          }
                          openModal('add-expense', { groupId, expenseToEdit: e })
                        }}
                        onDelete={async (id) => {
                          const e = expense as any;
                          if (e.paid_by !== user?.id && !isAdmin) {
                            alert("You can only delete expenses you paid for.")
                            return
                          }
                          if (confirm("Are you sure you want to delete this expense? This action cannot be undone.")) {
                            try {
                              await deleteExpense.mutateAsync(id)
                            } catch (err) {
                              console.error(err)
                              alert("Failed to delete expense.")
                            }
                          }
                        }}
                      />
                    ))}
                  </div>
                ))}

                {hasNextPage && (
                  <div className="p-4 text-center">
                    <button
                      onClick={() => fetchNextPage()}
                      className="text-sm text-brand font-medium hover:underline"
                    >
                      Load Previous Expenses
                    </button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Balances tab */}
          <TabsContent value="balances" className="space-y-3">
            {typedBalances.map(b => {
              const isMe = b.user_id === user?.id
              return (
                <div key={b.user_id} className="flex items-center gap-4 p-4 card">
                  <UserAvatar
                    name={b.full_name}
                    avatarUrl={b.avatar_url}
                    userId={b.user_id}
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {isMe ? 'You' : b.full_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Math.abs(b.net_balance) < 0.01 ? 'All settled up' : b.net_balance > 0 ? 'Is owed' : 'Owes'}
                    </p>
                  </div>
                  <CurrencyDisplay amount={b.net_balance} signed showColor size="lg" />
                </div>
              )
            })}

            {/* Simplified debts */}
            {simplifiedDebts.length > 0 && (
              <div className="card p-5 mt-4">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3">Simplified Payments</h3>
                <div className="space-y-3">
                  {simplifiedDebts.map((debt, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <UserAvatar name={debt.from_user_name} size="sm" />
                      <div className="flex-1 text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-gray-900 dark:text-white">{debt.from_user_name}</span>
                        {' pays '}
                        <span className="font-medium text-gray-900 dark:text-white">{debt.to_user_name}</span>
                      </div>
                      <span className="font-bold text-brand">{formatCurrency(debt.amount)}</span>
                      {(debt.from_user_id === user?.id || debt.to_user_id === user?.id || isAdmin) && (
                        <Button size="sm" onClick={() => setSettleDebt(debt)}>
                          {debt.from_user_id === user?.id ? 'Pay' : 'Mark Paid'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Charts tab */}
          <TabsContent value="charts" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white">Spending Trend</h3>
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    {(['week', 'month', 'year'] as const).map(range => (
                      <button
                        key={range}
                        onClick={() => setChartRange(range)}
                        className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                          chartRange === range
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>
                <SpendingTrendChart data={trendData} currency={group.currency} />
              </div>
              <div className="card p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Balance per Member</h3>
                <BalanceBarChart data={balanceBarData} currency={group.currency} />
              </div>
            </div>
          </TabsContent>

          {/* Settlements tab */}
          <TabsContent value="settlements" className="space-y-4">
            <div className="card p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Settlement History</h3>
              {(!settlements || settlements.length === 0) ? (
                <p className="text-sm text-gray-500">No settlements have been recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {settlements.map((s: any) => {
                    const isCreatorPayerOrPayee = s.created_by === s.payer_id || s.created_by === s.payee_id;
                    const creatorName = s.creator?.full_name?.split(' ')[0] ?? 'Admin';
                    const payerName = s.payer?.full_name?.split(' ')[0] ?? 'Unknown';
                    const payeeName = s.payee?.full_name?.split(' ')[0] ?? 'Unknown';

                    return (
                      <div key={s.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
                            💸
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-900 dark:text-white">
                              {isCreatorPayerOrPayee 
                                ? `${payerName} settled with ${payeeName}`
                                : `${creatorName} settled ${payerName} to ${payeeName}`}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {new Date(s.settled_at).toLocaleDateString()} • {s.payment_method.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-brand">{formatCurrency(s.amount)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Settings tab (Admin only) */}
          {isAdmin && (
            <TabsContent value="settings" className="space-y-6">
              <div className="card p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Group Settings</h3>
                  <p className="text-sm text-gray-500">Manage group members and permissions.</p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Invite Members</h4>
                  <div className="w-full max-w-sm space-y-3">
                    <UserSearchInput
                      onAdd={handleAddInvite}
                      selectedEmails={selectedEmails}
                      placeholder="Search name or email"
                    />
                    
                    {selectedEmails.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedEmails.map(email => (
                          <span
                            key={email}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-subtle dark:bg-brand-dark/20 text-brand text-sm font-medium"
                          >
                            {memberMeta[email] ?? email}
                            <button type="button" onClick={() => handleRemoveInvite(email)}>
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <Button 
                      className="w-full"
                      loading={addMembers.isPending}
                      disabled={selectedEmails.length === 0}
                      onClick={async () => {
                        if (selectedEmails.length > 0) {
                          try {
                            await addMembers.mutateAsync(selectedEmails)
                            
                            const existingUsers = selectedEmails.filter(email => !!memberIdMeta[email])
                            const nonExistingEmails = selectedEmails.filter(email => !memberIdMeta[email])
                            
                            // Send native push notifications for users who already exist
                            for (const email of existingUsers) {
                              const uid = memberIdMeta[email]
                              if (uid) {
                                await supabase.functions.invoke('send-notification', {
                                  body: {
                                    user_id: uid,
                                    type: 'group_invite',
                                    title: 'Group Invitation',
                                    body: `${user?.user_metadata?.full_name || 'Someone'} invited you to join "${group?.name}".`,
                                    group_id: groupId
                                  }
                                }).catch(console.error)
                              }
                            }
                            
                            // Send emails for users who don't exist
                            if (nonExistingEmails.length > 0) {
                              const inviteLink = `${window.location.origin}/signup?invite=true`
                              const subject = encodeURIComponent(`You are invited to ${group?.name} on BalanceFlow!`)
                              const emailBody = encodeURIComponent(`Hi!\n\nI've added you to our group "${group?.name}" on BalanceFlow to track our shared expenses.\n\nPlease click the link below to sign up and view our balances:\n${inviteLink}\n\nMake sure to use the email address we sent this to!`)
                              const bccList = nonExistingEmails.join(',')
                              window.location.href = `mailto:?bcc=${bccList}&subject=${subject}&body=${emailBody}`
                            }
                            
                            setSelectedEmails([])
                            setMemberMeta({})
                            setMemberIdMeta({})
                          } catch (err) {
                            console.error(err)
                            alert('Failed to invite members.')
                          }
                        }
                      }}
                    >
                      <UserPlus className="h-4 w-4" /> Invite Selected
                    </Button>
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800" />

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Members</h4>
                  <div className="space-y-2">
                    {members.map(m => (
                      <div key={m.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={m.profiles?.full_name ?? '?'} avatarUrl={m.profiles?.avatar_url} />
                          <div>
                            <p className="font-medium text-sm text-gray-900 dark:text-white">
                              {m.user_id === user?.id ? 'You' : m.profiles?.full_name}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">{m.role}</p>
                          </div>
                        </div>
                        {m.user_id !== user?.id && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/50 shrink-0 self-start sm:self-auto"
                            loading={removeMember.isPending}
                            onClick={() => {
                              if (confirm(`Remove ${m.profiles?.full_name} from the group?`)) {
                                removeMember.mutate(m.user_id)
                              }
                            }}
                          >
                            <UserMinus className="h-4 w-4" /> Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-red-100 dark:border-red-900/50" />

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-red-600 uppercase tracking-wider">Danger Zone</h4>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                    <div className="space-y-2">
                      <div>
                        <p className="font-medium text-red-900 dark:text-red-400">Delete this group</p>
                        <p className="text-xs text-red-700/70 dark:text-red-400/70 mt-1">
                          Once you delete a group, it cannot be undone. All expenses and settlements will be archived.
                        </p>
                      </div>
                      {!isGroupSettled && (
                        <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/80 p-2.5 rounded-lg flex items-center gap-2">
                          <span>⚠️</span>
                          <span>
                            Cannot delete group: All group splits must be settled up first ({formatCurrency(totalUnsettled / 2)} remaining to settle).
                          </span>
                        </div>
                      )}
                    </div>
                    {confirmDelete ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setConfirmDelete(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="default"
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          loading={deleteGroup.isPending}
                          onClick={async () => {
                            if (!isGroupSettled) {
                              alert('Cannot delete group: All group splits must be settled up first.')
                              return
                            }
                            try {
                              await deleteGroup.mutateAsync(groupId)
                              navigate('/groups')
                            } catch (err: any) {
                              console.error(err)
                              alert(err.message || 'Failed to delete group')
                              setConfirmDelete(false)
                            }
                          }}
                        >
                          Yes, Delete
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        disabled={!isGroupSettled}
                        className={cn(
                          "text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/40 border-red-200 dark:border-red-900/50 shrink-0",
                          !isGroupSettled && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => {
                          if (!isGroupSettled) {
                            alert('Cannot delete group: All group splits must be settled up first.')
                            return
                          }
                          setConfirmDelete(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Delete Group
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20">
                    <div className="space-y-1.5">
                      <p className="font-medium text-orange-900 dark:text-orange-400">Reset Group Data</p>
                      <p className="text-xs text-orange-700/70 dark:text-orange-400/70">
                        Permanently delete all expenses and settlements. Group members will remain.
                      </p>
                      {members.length > 1 && hasDeniedReset && (
                        <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                          ❌ Request denied by a group member.
                        </p>
                      )}
                      {members.length > 1 && hasPendingReset && !hasDeniedReset && !allAcceptedReset && (
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                          ⏳ Waiting for all group members to accept ({resetRequests.filter(r => r.status === 'accepted').length}/{members.length} accepted).
                        </p>
                      )}
                    </div>

                    {members.length <= 1 ? (
                      confirmReset ? (
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setConfirmReset(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            variant="default"
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                            loading={resetGroupData.isPending}
                            onClick={async () => {
                              try {
                                await resetGroupData.mutateAsync()
                                setConfirmReset(false)
                                alert('All data has been reset successfully.')
                              } catch (err: any) {
                                console.error(err)
                                alert(err.message || 'Failed to reset data. Are you an admin?')
                                setConfirmReset(false)
                              }
                            }}
                          >
                            Yes, Reset Data
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/40 border-orange-200 dark:border-orange-900/50 shrink-0"
                          onClick={() => setConfirmReset(true)}
                        >
                          <History className="h-4 w-4" /> Reset Data
                        </Button>
                      )
                    ) : hasDeniedReset ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="text-red-600 border-red-300 opacity-60 cursor-not-allowed"
                        >
                          Request Denied
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelResetRequest.mutate()}
                        >
                          Clear
                        </Button>
                      </div>
                    ) : allAcceptedReset ? (
                      <Button
                        variant="default"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                        loading={resetGroupData.isPending}
                        onClick={async () => {
                          try {
                            await resetGroupData.mutateAsync()
                            await cancelResetRequest.mutateAsync()
                            alert('All group data has been reset successfully.')
                          } catch (err: any) {
                            console.error(err)
                            alert(err.message || 'Failed to reset group data')
                          }
                        }}
                      >
                        Yes, Reset Data Now
                      </Button>
                    ) : hasPendingReset ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          disabled
                          className="text-amber-700 border-amber-300 opacity-70 cursor-not-allowed shrink-0"
                        >
                          Waiting for Approvals ({resetRequests.filter(r => r.status === 'accepted').length}/{members.length})
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelResetRequest.mutate()}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/40 border-orange-200 dark:border-orange-900/50 shrink-0"
                        loading={createResetRequest.isPending}
                        onClick={async () => {
                          try {
                            await createResetRequest.mutateAsync(members.map(m => m.user_id))
                            alert('Reset request sent to all group members. The data will be reset once all members accept.')
                          } catch (err: any) {
                            console.error(err)
                            alert(err.message || 'Failed to send reset request')
                          }
                        }}
                      >
                        <History className="h-4 w-4 mr-1.5" /> Request Reset Data
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Right sidebar — only on large screens */}
      <div className="hidden lg:flex flex-col w-72 shrink-0 border-l border-gray-100 dark:border-gray-800 p-6 gap-5 overflow-y-auto">
        {/* My balance */}
        <div className="card p-5 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Your Total Balance
          </p>
          <CurrencyDisplay
            amount={myBalance}
            signed
            showColor
            size="xl"
          />
          {myBalance < 0 && (
            <p className="text-xs text-gray-500">You owe in total</p>
          )}
          {myBalance > 0 && (
            <p className="text-xs text-gray-500">You are owed in total</p>
          )}
          <div className="space-y-2">
            {myDebts.map((debt, i) => {
              const iOwe = debt.from_user_id === user?.id
              const otherName = iOwe ? debt.to_user_name : debt.from_user_name
              
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <UserAvatar name={otherName} size="xs" />
                  <span className="flex-1 text-gray-600 dark:text-gray-400 truncate" title={iOwe ? `You owe ${otherName}` : `${otherName} owes you`}>
                    {iOwe ? `You owe ${otherName}` : `${otherName} owes you`}
                  </span>
                  <span className={cn("font-semibold whitespace-nowrap shrink-0", iOwe ? "text-red-500" : "text-emerald-500")}>
                    {iOwe ? '-' : '+'}{formatCurrency(debt.amount)}
                  </span>
                </div>
              )
            })}
          </div>
          {myDebts.length > 0 && (
            <Button
              className="w-full"
              size="sm"
              id="pay-all-now-btn"
              onClick={() => myDebts[0] && setSettleDebt(myDebts[0])}
            >
              Pay All Now
            </Button>
          )}
        </div>

        {/* Settlement progress */}
        <div className="card p-5 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Group Settlement
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {Math.round(settledPct)}%
            </span>
            <span className="text-gray-400 font-medium">Settled</span>
          </div>
          <Progress value={settledPct} />
          <p className="text-xs text-gray-500">
            {formatCurrency(totalSettled)} of {formatCurrency(totalSettled + totalUnsettled)} settled
          </p>
        </div>

        {/* Recent settlements */}
        <div className="card p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Settlements</p>
          {(settlements ?? []).slice(0, 3).map((s: any) => (
            <div key={s.id} className="flex items-start gap-2 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
              <UserAvatar name={s.payer?.full_name ?? '?'} size="xs" />
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">{s.payer?.full_name}</span>
                {' settled with '}
                <span className="font-medium">{s.payee?.full_name}</span>
              </div>
            </div>
          ))}
          {!settlements?.length && (
            <p className="text-xs text-gray-400 text-center py-4">No settlements yet</p>
          )}
        </div>
      </div>

      {/* Settle Up modal */}
      {settleDebt && (
        <SettleUpModal
          groupId={groupId}
          debt={settleDebt}
          onClose={() => setSettleDebt(null)}
        />
      )}
    </div>
  )
}
