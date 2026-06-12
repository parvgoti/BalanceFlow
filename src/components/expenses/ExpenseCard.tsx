import { formatDate, formatCurrency, CATEGORY_CONFIG, cn } from '@/lib/utils'
import { UserAvatar } from '@/components/ui/avatar'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { StatusBadge } from '@/components/shared/CategoryIcon'
import type { ExpenseWithSplits } from '@/types/database'
import { useAuthStore } from '@/store/authStore'
import { Pencil, Trash2 } from 'lucide-react'

interface ExpenseCardProps {
  expense: ExpenseWithSplits
  onEdit?: (expense: ExpenseWithSplits) => void
  onDelete?: (id: string) => void
}

export function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  const { user } = useAuthStore()

  const userSplit = expense.expense_splits.find(s => s.user_id === user?.id)
  const isPayer = expense.paid_by === user?.id
  const isSettled = userSplit?.is_settled ?? false

  // Determine what to show in the balance column
  let balanceLabel: React.ReactNode
  let balanceClass = ''

  if (isPayer && !userSplit) {
    // Payer, not splitting with themselves
    balanceLabel = (
      <span className="text-emerald-600 font-semibold">
        +{formatCurrency(expense.amount)}
      </span>
    )
  } else if (isPayer && userSplit) {
    const owedByOthers = expense.amount - (userSplit.amount ?? 0)
    balanceLabel = (
      <span className="text-emerald-600 font-semibold">
        You are owed {formatCurrency(owedByOthers)}
      </span>
    )
    balanceClass = 'text-emerald-600'
  } else if (userSplit && !isSettled) {
    balanceLabel = (
      <span className="text-red-500 font-semibold">
        You owe {formatCurrency(userSplit.amount)}
      </span>
    )
  } else if (isSettled) {
    balanceLabel = <span className="text-gray-400">Settled</span>
  }

  const payerName = expense.paid_by === user?.id
    ? 'You'
    : (expense.payer?.full_name ?? 'Someone')

  return (
    <div className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors group">
      {/* Category icon */}
      <CategoryIcon category={expense.category} />

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                {expense.description}
              </p>
              {onEdit && (
                <button
                  onClick={() => onEdit(expense)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-brand hover:bg-brand/10 rounded"
                  title="Edit expense"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(expense.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded"
                  title="Delete expense"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Paid by {payerName} • {formatDate(expense.date)}
            </p>
          </div>

          {/* Right column: balance + status */}
          <div className="text-right shrink-0 space-y-1">
            <div className="text-sm">{balanceLabel}</div>
            <div>
              {isSettled ? (
                <StatusBadge status="settled" />
              ) : isPayer ? (
                <StatusBadge status="split" />
              ) : (
                <StatusBadge status="pending" />
              )}
            </div>
          </div>
        </div>

        {/* Participants */}
        {expense.expense_splits.length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            {expense.expense_splits.slice(0, 5).map(split => (
              <div key={split.user_id} title={split.profiles?.full_name}>
                <UserAvatar
                  name={split.profiles?.full_name ?? '?'}
                  avatarUrl={split.profiles?.avatar_url}
                  userId={split.user_id}
                  size="xs"
                  className={cn(!split.is_settled && 'ring-1 ring-amber-400')}
                />
              </div>
            ))}
            {expense.expense_splits.length > 5 && (
              <span className="text-2xs text-gray-400">+{expense.expense_splits.length - 5}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
