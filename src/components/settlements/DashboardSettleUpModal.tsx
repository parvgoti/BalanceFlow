import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, ArrowRight, CheckCircle2, Users } from 'lucide-react'
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
      <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 animate-pulse">
        <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3.5 rounded-xl border transition-all",
        myBalance < 0
          ? "border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20"
          : myBalance > 0
            ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20"
            : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-lg shrink-0 border border-gray-100 dark:border-gray-700">
          {emoji}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{group.name}</h4>
          <p className={cn(
            "text-xs font-semibold mt-0.5",
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

      <Button
        size="sm"
        variant={myBalance !== 0 ? "default" : "outline"}
        className={cn(
          "shrink-0 text-xs font-semibold",
          myBalance < 0 && "bg-red-600 hover:bg-red-700 text-white",
          myBalance > 0 && "bg-emerald-600 hover:bg-emerald-700 text-white"
        )}
        onClick={() => onSelect(group.id)}
      >
        <span>Settle</span>
        <ArrowRight className="h-3.5 w-3.5 ml-1" />
      </Button>
    </div>
  )
}

export function DashboardSettleUpModal() {
  const { closeModal } = useUIStore()
  const { data: groups, isLoading } = useGroups()
  const navigate = useNavigate()

  const handleSelectGroup = (groupId: string) => {
    closeModal()
    navigate(`/groups/${groupId}`)
  }

  return (
    <Dialog open onOpenChange={(v) => !v && closeModal()}>
      <DialogContent className="max-w-md" id="dashboard-settle-modal">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Settle Up Debts</DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Select a group below to record payments and settle balances.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              <div className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            </div>
          ) : !groups || groups.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">No active groups</h4>
                <p className="text-xs text-gray-500 mt-1">
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

        <div className="pt-2 flex justify-end">
          <Button
            variant="outline"
            className="text-sm font-semibold rounded-xl"
            onClick={closeModal}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
