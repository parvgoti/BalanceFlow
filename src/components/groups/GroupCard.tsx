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
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-brand-subtle flex items-center justify-center text-xl shrink-0">
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-navy dark:text-white text-sm truncate">{group.name}</h3>
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
            <Users className="h-3 w-3" />
            <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <AvatarGroup
          users={members.slice(0, 4).map((m: any) => ({
            id: m.user_id,
            full_name: m.profiles?.full_name ?? '?',
            avatar_url: m.profiles?.avatar_url,
          }))}
          max={3}
          size="xs"
        />
      </div>

      {/* Balance */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-gray-400 font-medium mb-0.5">Your balance</p>
          <p className={cn(
            'text-lg font-bold',
            myBalance > 0.01 ? 'text-brand' : myBalance < -0.01 ? 'text-red-500' : 'text-gray-400'
          )}>
            {myBalance > 0 ? '+' : ''}{formatCurrency(myBalance)}
          </p>
        </div>
        {totalBalance > 0 && (
          <div className="text-right">
            <p className="text-[11px] text-gray-400 font-medium mb-0.5">Settlement progress</p>
            <p className="text-sm font-bold text-navy dark:text-white">{Math.round(settledPct)}%</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {totalBalance > 0 && (
        <Progress value={settledPct} className="h-1" />
      )}
    </Link>
  )
}
