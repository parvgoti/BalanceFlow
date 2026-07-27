import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, ArrowRight, CheckCircle2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useGroups, useGroupBalances } from '@/hooks/useGroups'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { formatCurrency, cn } from '@/lib/utils'
import type { GroupBalance } from '@/types/database'

function GroupSettleRow({
  group,
  onSelect,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  group: any
  onSelect: (groupId: string) => void
}) {
  const { user } = useAuthStore()
  const { data: balancesRaw, isLoading } = useGroupBalances(group.id)
  const balances = (balancesRaw ?? []) as GroupBalance[]
  const myBalance = balances.find(b => b.user_id === user?.id)?.net_balance ?? 0

  const emojis = ['🏖️', '🏠', '🎉', '✈️', '🍕', '🏔️', '🚗', '🎮']
  const emoji = emojis[(group.name?.charCodeAt(0) ?? 0) % emojis.length]

  if (isLoading) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-slate-800/80 bg-gray-50/40 dark:bg-slate-800/40 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gray-200 dark:bg-slate-700 rounded-xl" />
          <div className="space-y-1.5">
            <div className="h-4 w-28 bg-gray-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-20 bg-gray-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
        <div className="h-9 w-20 bg-gray-200 dark:bg-slate-700 rounded-lg" />
      </div>
    )
  }

  return (
    <div
      onClick={() => onSelect(group.id)}
      className={cn(
        "group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md",
        myBalance < 0
          ? "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/30 hover:border-red-300 dark:hover:border-red-800/80"
          : myBalance > 0
            ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-800/80"
            : "border-gray-200 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-800/40 hover:border-gray-300 dark:hover:border-slate-700"
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0 pr-2">
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm border",
          myBalance < 0
            ? "bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800/60"
            : myBalance > 0
              ? "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/60"
              : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
        )}>
          {emoji}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {group.name}
          </h4>
          <p className={cn(
            "text-xs font-semibold mt-0.5 flex items-center gap-1 truncate",
            myBalance < 0
              ? "text-red-600 dark:text-red-400"
              : myBalance > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-400 dark:text-gray-500"
          )}>
            {myBalance < 0 && `You owe ${formatCurrency(Math.abs(myBalance))}`}
            {myBalance > 0 && `You are owed ${formatCurrency(myBalance)}`}
            {myBalance === 0 && 'All settled up ✓'}
          </p>
        </div>
      </div>

      <div className="shrink-0 ml-2">
        <Button
          size="sm"
          variant={myBalance !== 0 ? "default" : "outline"}
          className={cn(
            "h-9 px-3.5 rounded-lg text-xs font-bold transition-all shadow-sm",
            myBalance < 0 && "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20",
            myBalance > 0 && "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20",
            myBalance === 0 && "text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800"
          )}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(group.id)
          }}
        >
          <span>{myBalance === 0 ? 'View' : 'Settle'}</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </div>
  )
}

export function DashboardSettleUpModal() {
  const { closeModal, openModal } = useUIStore()
  const { data: groups, isLoading } = useGroups()
  const navigate = useNavigate()

  const handleSelectGroup = (groupId: string) => {
    closeModal()
    navigate(`/groups/${groupId}`)
    setTimeout(() => {
      openModal('settle-up', { groupId })
    }, 150)
  }

  return (
    <Dialog open onOpenChange={(v) => !v && closeModal()}>
      <DialogContent 
        className="w-[92vw] max-w-lg p-0 overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl" 
        id="dashboard-settle-modal"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800/80 bg-gray-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand/10 dark:bg-brand/20 text-brand dark:text-brand-light flex items-center justify-center shrink-0 shadow-sm border border-brand/20 dark:border-brand-light/20">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                Settle Up Debts
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Select a group below to view balances and record payments.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 sm:p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-16 bg-gray-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
              <div className="h-16 bg-gray-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            </div>
          ) : !groups || groups.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">No active groups</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  You don't have any groups with balances to settle yet.
                </p>
              </div>
            </div>
          ) : (
            groups.map((g: any) => (
              <GroupSettleRow
                key={g.id}
                group={g}
                onSelect={handleSelectGroup}
              />
            ))
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50/80 dark:bg-slate-900/80 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            Click any group to settle expenses instantly
          </p>
          <div className="flex justify-end w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold px-4 rounded-xl border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
              onClick={closeModal}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

