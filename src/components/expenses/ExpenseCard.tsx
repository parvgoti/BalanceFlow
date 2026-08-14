import { useState } from 'react'
import { formatDate, formatCurrency, CATEGORY_CONFIG, cn } from '@/lib/utils'
import { ReceiptLightbox } from '@/components/ui/ReceiptLightbox'
import type { ExpenseWithSplits } from '@/types/database'
import { useAuthStore } from '@/store/authStore'
import { Pencil, Trash2, Receipt, Eye } from 'lucide-react'

interface ExpenseCardProps {
  expense: ExpenseWithSplits
  onEdit?: (expense: ExpenseWithSplits) => void
  onDelete?: (id: string) => void
  compact?: boolean
}

export function ExpenseCard({ expense, onEdit, onDelete, compact = false }: ExpenseCardProps) {
  const { user } = useAuthStore()
  const [showReceipt, setShowReceipt] = useState(false)

  const userSplit = expense.expense_splits.find(s => s.user_id === user?.id)
  const isPayer = expense.paid_by === user?.id
  const isSettled = isPayer 
    ? expense.expense_splits.filter(s => s.user_id !== user?.id).every(s => s.is_settled)
    : (userSplit?.is_settled ?? false)

  // Balance label
  let balanceLabel: React.ReactNode
  if (isSettled) {
    balanceLabel = <span className="text-gray-400 text-xs font-medium">Settled</span>
  } else if (isPayer && !userSplit) {
    balanceLabel = (
      <span className="text-brand text-xs font-semibold">
        You are owed {formatCurrency(expense.amount)}
      </span>
    )
  } else if (isPayer && userSplit) {
    const owedByOthers = expense.amount - (userSplit.amount ?? 0)
    balanceLabel = (
      <span className="text-brand text-xs font-semibold">
        You are owed {formatCurrency(owedByOthers)}
      </span>
    )
  } else if (userSplit) {
    balanceLabel = (
      <span className="text-red-500 text-xs font-semibold">
        You owe {formatCurrency(userSplit.amount)}
      </span>
    )
  }

  const payerName = expense.paid_by === user?.id
    ? 'You'
    : (expense.payer?.full_name ?? 'Someone')

  const catConfig = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.other

  // Status badge
  const statusBadge = isSettled ? (
    <span className="badge-settled">Settled</span>
  ) : isPayer ? (
    <span className="badge-you-paid">You paid</span>
  ) : (
    <span className="badge-split">Split</span>
  )

  return (
    <div className="flex items-start gap-3 py-3 px-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
      {/* Category icon — circular */}
      <div className={cn(
        'h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-base',
        catConfig.bg
      )}>
        <span>{catConfig.icon}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-navy dark:text-white text-sm truncate">
              {expense.description}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {/* Category pill */}
              <span className={cn('category-pill', catConfig.bg, catConfig.color)}>
                {catConfig.label}
              </span>
              {/* Status badge */}
              {statusBadge}
            </div>
            {!compact && (
              <p className="text-[11px] text-gray-400 mt-1">
                {isPayer ? 'Paid by You' : `Paid by ${payerName}`} · Split equally · {formatDate(expense.date)}
              </p>
            )}
          </div>

          {/* Right: amount + balance */}
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-navy dark:text-white">
              {formatCurrency(expense.amount)}
            </p>
            <div className="mt-0.5">{balanceLabel}</div>
          </div>
        </div>
      </div>

      {/* Action buttons — visible on hover */}
      {(onEdit || onDelete || expense.receipt_url) && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center">
          {expense.receipt_url && (
            <>
              <button
                type="button"
                onClick={() => setShowReceipt(true)}
                className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                title="View receipt"
              >
                <Receipt className="h-3.5 w-3.5" />
              </button>
              <ReceiptLightbox
                url={expense.receipt_url}
                description={expense.description}
                isOpen={showReceipt}
                onClose={() => setShowReceipt(false)}
              />
            </>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(expense)}
              className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
              title={isPayer ? "Edit" : "View"}
            >
              {isPayer ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(expense.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
