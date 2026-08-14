import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { AvatarGroup } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useGroupBalances } from '@/hooks/useGroups'
import type { GroupBalance } from '@/types/database'

interface GroupCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  group: any
}

export function GroupCard({ group }: GroupCardProps) {
  const { user } = useAuthStore()
  const { data: balancesRaw } = useGroupBalances(group.id)
  const balances = (balancesRaw ?? []) as GroupBalance[]

  const myBalance = balances.find(b => b.user_id === user?.id)?.net_balance ?? 0
  const members: any[] = group.group_members ?? []

  // Settlement progress
  const totalBalance = balances.reduce((sum, b) => sum + Math.abs(b.net_balance), 0)
  const settledPct = totalBalance === 0 ? 100 : 0

  // Emoji for group
  const emojis = ['🏖️', '🏠', '🎉', '✈️', '🍕', '🏔️', '🚗', '🎮']
  const emoji = emojis[(group.name?.charCodeAt(0) ?? 0) % emojis.length]

  return (
    <Link
      to={`/groups/${group.id}`}
      id={`group-card-${group.id}`}
      className="card-hover block p-4 space-y-3"
    >
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-orange-50/50 flex items-center justify-center text-2xl shrink-0">
            {emoji}
          </div>
          <div>
            <h3 className="font-bold text-navy dark:text-white text-[15px]">{group.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5 mb-2">{members.length} member{members.length !== 1 ? 's' : ''}</p>
            <AvatarGroup
              users={members.slice(0, 4).map((m: any) => ({
                id: m.user_id,
                full_name: m.profiles?.full_name ?? '?',
                avatar_url: m.profiles?.avatar_url,
              }))}
              max={4}
              size="sm"
            />
          </div>
        </div>
        <div className="text-gray-300">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>

      <div className="h-px bg-gray-100 dark:bg-gray-800 my-3" />

      {/* Balance */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium mb-0.5">Your balance</p>
          <p className={cn(
            'text-[17px] font-bold tracking-tight',
            myBalance > 0.01 ? 'text-[#107C41]' : myBalance < -0.01 ? 'text-red-500' : 'text-navy dark:text-white'
          )}>
            {myBalance > 0 ? '+' : ''}{formatCurrency(myBalance)}
          </p>
        </div>
        {totalBalance > 0 ? (
          <div className="text-right">
            <p className="text-xs text-gray-400 font-medium mb-0.5">Settlement progress</p>
            <p className="text-[15px] font-bold text-navy dark:text-white">{Math.round(settledPct)}%</p>
          </div>
        ) : (
          <div className="text-right">
            <p className="text-xs text-gray-400 font-medium mb-0.5">Settlement progress</p>
            <p className="text-[15px] font-bold text-navy dark:text-white">100%</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <Progress value={settledPct === 0 && totalBalance === 0 ? 100 : settledPct} className="h-1.5 bg-gray-100 dark:bg-gray-800" indicatorClassName="bg-[#107C41]" />
    </Link>
  )
}
