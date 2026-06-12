import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, eachMonthOfInterval, format, isWithinInterval, parseISO
} from 'date-fns'
import {
  ArrowLeft, Download, Users, DollarSign, BarChart2,
  Search, Filter, Settings, UserMinus, UserPlus, History, Trash2,
} from 'lucide-react'
import { useGroup, useGroupBalances, useAddMembers, useRemoveMember, useDeleteGroup, useResetGroupData } from '@/hooks/useGroups'
import { useExpenses, useDeleteExpense } from '@/hooks/useExpenses'
import { useSettlements } from '@/hooks/useSettlements'
import { useRealtimeGroup } from '@/hooks/useRealtime'
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
  simplifyDebts, formatCurrency, formatDateGroup, groupBy,
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
  const [inviteEmail, setInviteEmail] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [chartRange, setChartRange] = useState<'week' | 'month' | 'year'>('month')

  const addMembers = useAddMembers(groupId)
  const removeMember = useRemoveMember(groupId)
  const deleteGroup = useDeleteGroup()
  const resetGroupData = useResetGroupData(groupId)

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

  // Settlement progress
  const totalUnsettled = typedBalances.reduce((s, b) => s + Math.abs(b.net_balance), 0)
  const totalSettled = settlements?.reduce((s, st) => s + st.amount, 0) ?? 0
  const settledPct = totalUnsettled === 0 ? 100 : Math.min(100, (totalSettled / (totalSettled + totalUnsettled)) * 100)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members: any[] = (group as any)?.group_members ?? []
  const isAdmin = members.find(m => m.user_id === user?.id)?.role === 'admin'

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
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Breadcrumb + header */}
        <div>
          <Link to="/groups" className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Groups
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">{groupName}</h1>
              <div className="flex items-center gap-4 mt-2">
                <AvatarGroup
                  users={members.map(m => ({
                    id: m.user_id,
                    full_name: m.profiles?.full_name ?? '?',
                    avatar_url: m.profiles?.avatar_url,
                  }))}
                  max={4}
                />
                <div className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-900 dark:text-white uppercase text-xs tracking-wide">Total Group Spend</span>
                  <p className="font-bold text-gray-900 dark:text-white text-lg">
                    {formatCurrency(allExpenses.reduce((s, e) => s + ((e as any).amount ?? 0), 0))}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" id={`group-export-btn-${groupId}`}>
                <Download className="h-4 w-4" />
                Export Report
              </Button>
              <Button
                size="sm"
                id={`group-settle-btn-${groupId}`}
                onClick={() => myDebts.length > 0 && setSettleDebt(myDebts[0])}
                disabled={myDebts.length === 0}
              >
                💸 Settle Up
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="expenses">
          <TabsList>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="balances"><Users className="h-4 w-4" />Balances</TabsTrigger>
            <TabsTrigger value="charts"><BarChart2 className="h-4 w-4" />Charts</TabsTrigger>
            <TabsTrigger value="settlements"><History className="h-4 w-4" />Settlements</TabsTrigger>
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
                Filter
              </Button>
              <Button
                variant="outline"
                size="sm"
                id="add-expense-from-group-btn"
                onClick={() => openModal('add-expense', { groupId })}
              >
                + Add
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
                      {(debt.from_user_id === user?.id || isAdmin) && (
                        <Button size="sm" onClick={() => setSettleDebt(debt)}>
                          Pay
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
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Invite Member</h4>
                  <div className="flex gap-2 max-w-sm">
                    <input
                      type="email"
                      placeholder="Email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <Button 
                      loading={addMembers.isPending}
                      onClick={async () => {
                        if (inviteEmail) {
                          try {
                            await addMembers.mutateAsync([inviteEmail])
                            const inviteLink = `${window.location.origin}/signup?invite=true`
                            const subject = encodeURIComponent('You are invited to BalanceFlow!')
                            const body = encodeURIComponent(`Hi!\n\nI've added you to our group "${group?.name}" on BalanceFlow to track our shared expenses.\n\nPlease click the link below to sign up and view our balances:\n${inviteLink}\n\nMake sure to use this email address: ${inviteEmail}`)
                            window.location.href = `mailto:${inviteEmail}?subject=${subject}&body=${body}`
                            setInviteEmail('')
                          } catch (err) {
                            console.error(err)
                            alert('Failed to invite member.')
                          }
                        }
                      }}
                    >
                      <UserPlus className="h-4 w-4" /> Invite
                    </Button>
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800" />

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Members</h4>
                  <div className="space-y-2">
                    {members.map(m => (
                      <div key={m.user_id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
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
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/50"
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
                  <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                    <div>
                      <p className="font-medium text-red-900 dark:text-red-400">Delete this group</p>
                      <p className="text-xs text-red-700/70 dark:text-red-400/70 mt-1">
                        Once you delete a group, it cannot be undone. All expenses and settlements will be archived.
                      </p>
                    </div>
                    {confirmDelete ? (
                      <div className="flex items-center gap-2">
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
                            try {
                              await deleteGroup.mutateAsync(groupId)
                              navigate('/groups')
                            } catch (err: any) {
                              console.error(err)
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
                        className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/40 border-red-200 dark:border-red-900/50 shrink-0"
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 className="h-4 w-4" /> Delete Group
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20">
                    <div>
                      <p className="font-medium text-orange-900 dark:text-orange-400">Reset Group Data</p>
                      <p className="text-xs text-orange-700/70 dark:text-orange-400/70 mt-1">
                        Permanently delete all expenses and settlements. Group members will remain.
                      </p>
                    </div>
                    {confirmReset ? (
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
                              alert('Failed to reset data. Are you an admin?')
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
                  <span className="flex-1 text-gray-600 dark:text-gray-400">
                    {iOwe ? `You owe ${otherName}` : `${otherName} owes you`}
                  </span>
                  <span className={cn("font-semibold", iOwe ? "text-red-500" : "text-emerald-500")}>
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
