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
  onSelect: (groupId: string, autoSettle: boolean) => void
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
      onClick={() => onSelect(group.id, myBalance !== 0)}
      className="flex flex-col p-4 rounded-[16px] border border-gray-200 bg-white shadow-sm mb-3"
    >
      <div className="flex items-center gap-3.5 min-w-0 pr-2">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 bg-orange-100 border border-orange-200">
          {emoji}
        </div>
        <div className="min-w-0">
          <p className={cn(
            "text-[15px] font-bold tracking-tight",
            myBalance < 0 ? "text-red-500" : myBalance > 0 ? "text-emerald-500" : "text-gray-900 dark:text-white"
          )}>
            {myBalance < 0 && `You pay ${group.name} ${formatCurrency(Math.abs(myBalance))}`}
            {myBalance > 0 && `${group.name} pays you ${formatCurrency(myBalance)}`}
            {myBalance === 0 && 'All settled up'}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 mt-4">
        <Button
          size="sm"
          variant="outline"
          className="w-full rounded-full border-gray-200 text-gray-600 font-bold"
        >
          Cash
        </Button>
        <Button
          size="sm"
          className={cn(
            "w-full rounded-full text-white font-bold h-10",
            myBalance < 0 ? "bg-[#107C41] hover:bg-[#15803D]" : "bg-gray-200 text-gray-500"
          )}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(group.id, myBalance !== 0)
          }}
        >
          Record payment
        </Button>
      </div>
    </div>
  )
}

export function DashboardSettleUpModal() {
  const { closeModal } = useUIStore()
  const { data: groups, isLoading } = useGroups()
  const navigate = useNavigate()

  const handleSelectGroup = (groupId: string, autoSettle = true) => {
    closeModal()
    navigate(`/groups/${groupId}${autoSettle ? '?settle=true' : ''}`, {
      state: { openSettleModal: autoSettle }
    })
  }

  return (
    <Dialog open onOpenChange={(v) => !v && closeModal()}>
      <DialogContent 
        className="w-[92vw] max-w-lg p-0 overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl" 
        id="dashboard-settle-modal"
      >
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-slate-800/80 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-[22px] font-extrabold text-navy dark:text-white tracking-tight">
              Settle up
            </DialogTitle>
            <button onClick={() => closeModal()} className="text-[13px] font-bold text-gray-400 hover:text-gray-600">
              Cancel
            </button>
          </div>
          
          <div className="flex gap-2">
            <button className="px-4 py-1.5 rounded-full bg-[#107C41] text-white text-[13px] font-bold shadow-sm">
              My settlements
            </button>
            <button className="px-4 py-1.5 rounded-full bg-white border border-gray-200 text-gray-500 text-[13px] font-bold">
              Pending
            </button>
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

