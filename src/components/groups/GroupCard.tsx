import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { AvatarGroup } from '@/components/ui/avatar'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/utils'
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

  // Settlement progress approximation
  const totalBalance = balances.reduce((sum, b) => sum + Math.abs(b.net_balance), 0)
  const settledPct = totalBalance === 0 ? 100 : 0

  // Color-coded emoji for group type
  const emojis = ['🏖️', '🏠', '🎉', '✈️', '🍕', '🏔️', '🚗', '🎮']
  const emoji = emojis[(group.name?.charCodeAt(0) ?? 0) % emojis.length]

  return (
    <Link
      to={`/groups/${group.id}`}
      id={`group-card-${group.id}`}
      className="card-hover block p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-subtle to-primary-100 flex items-center justify-center text-2xl shrink-0">
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white truncate">{group.name}</h3>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
            <Users className="h-3 w-3" />
            <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
            {group.currency !== 'INR' && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono">
                {group.currency}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Your balance</p>
          <CurrencyDisplay
            amount={myBalance}
            signed
            showColor
            size="lg"
          />
        </div>
        <AvatarGroup
          users={members.slice(0, 4).map(m => ({
            id: m.user_id,
            full_name: m.profiles?.full_name ?? '?',
            avatar_url: m.profiles?.avatar_url,
          }))}
          max={3}
          size="sm"
        />
      </div>

      {/* Settlement progress */}
      {totalBalance > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Settlement progress</span>
            <span className="font-medium">{Math.round(settledPct)}%</span>
          </div>
          <Progress value={settledPct} className="h-1.5" />
        </div>
      )}
    </Link>
  )
}
