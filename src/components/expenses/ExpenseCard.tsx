import { formatDate, formatCurrency, CATEGORY_CONFIG, cn } from '@/lib/utils'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import type { ExpenseWithSplits } from '@/types/database'
import { useAuthStore } from '@/store/authStore'
import { Pencil, Trash2, Receipt, Eye } from 'lucide-react'

interface ExpenseCardProps {
  expense: ExpenseWithSplits
  onEdit?: (expense: ExpenseWithSplits) => void
  onDelete?: (id: string) => void
}

export function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  const { user } = useAuthStore()

  const userSplit = expense.expense_splits.find(s => s.user_id === user?.id)
  const isPayer = expense.paid_by === user?.id
  // An expense is "Settled" for the payer if all other members have settled their splits.
  // For a debtor, it's settled if their own split is marked as settled.
  const isSettled = isPayer 
    ? expense.expense_splits.filter(s => s.user_id !== user?.id).every(s => s.is_settled)
    : (userSplit?.is_settled ?? false)

  // Determine what to show in the balance column
  let balanceLabel: React.ReactNode
  let balanceClass = ''

  if (isSettled) {
    balanceLabel = <span className="text-gray-400 font-medium">Settled</span>
  } else if (isPayer && !userSplit) {
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
  } else if (userSplit) {
    balanceLabel = (
      <span className="text-red-500 font-semibold">
        You owe {formatCurrency(userSplit.amount)}
      </span>
    )
  }

  const payerName = expense.paid_by === user?.id
    ? 'You'
    : (expense.payer?.full_name ?? 'Someone')

  return (
    <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors group">
      {/* Category icon */}
      <CategoryIcon category={expense.category} />

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                {expense.description}
              </p>
              {expense.receipt_url && (
                <a
                  href={expense.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-gray-400 hover:text-brand hover:bg-brand/10 rounded transition-colors shrink-0"
                  title="View receipt"
                >
                  <Receipt className="h-3.5 w-3.5" />
                </a>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(expense)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-brand hover:bg-brand/10 rounded shrink-0"
                  title={isPayer ? "Edit expense" : "View details"}
                >
                  {isPayer ? (
                    <Pencil className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(expense.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded shrink-0"
                  title="Delete expense"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-semibold",
                isPayer
                  ? "bg-brand-subtle dark:bg-brand-dark/30 text-brand dark:text-brand-light"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              )}>
                {isPayer ? 'You paid' : `Paid by ${payerName}`}
              </span>
              <span className="text-2xs text-gray-400">•</span>
              <span className="text-2xs text-gray-400">{formatDate(expense.date)}</span>
            </div>
          </div>

          {/* Right column: amount + balance */}
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {formatCurrency(expense.amount)}
            </p>
            <div className="text-xs mt-0.5">{balanceLabel}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
