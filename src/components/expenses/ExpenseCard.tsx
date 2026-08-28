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
    <div 
      className="relative flex items-start gap-3 py-3 px-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group cursor-pointer"
      onClick={() => onEdit?.(expense)}
    >
      {/* Category icon — circular */}
      <div className={cn(
        'h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-base',
        catConfig.bg
      )}>
        <span>{catConfig.icon}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-navy dark:text-white text-[15px] truncate leading-tight">
              {expense.description}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {/* Category pill */}
              <span className={cn('category-pill', catConfig.bg, catConfig.color)}>
                {catConfig.label}
              </span>
              {/* Status badge */}
              {statusBadge}
            </div>
            {!compact && (
              <p className="text-[11px] text-gray-400 mt-1.5">
                {isPayer ? 'Paid by You' : `Paid by ${payerName}`} · Split equally
              </p>
            )}
          </div>

          {/* Right: amount + balance */}
          <div className="text-right shrink-0">
            <p className="text-[15px] font-bold text-navy dark:text-white leading-tight">
              {formatCurrency(expense.amount)}
            </p>
            <div className="mt-1">{balanceLabel}</div>
          </div>
        </div>
      </div>

      {/* Action buttons — visible on hover (Absolute) */}
      {(onEdit || onDelete || expense.receipt_url) && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-gray-900/95 shadow-md border border-gray-100 dark:border-gray-800 rounded-lg p-1 backdrop-blur-md z-10 hidden sm:flex">
          {expense.receipt_url && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowReceipt(true); }}
                className="p-1.5 text-gray-500 hover:text-brand hover:bg-brand/10 rounded-md transition-colors"
                title="View receipt"
              >
                <Receipt className="h-4 w-4" />
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
              onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
              className="p-1.5 text-gray-500 hover:text-brand hover:bg-brand/10 rounded-md transition-colors"
              title={isPayer ? "Edit" : "View"}
            >
              {isPayer ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
          {onDelete && isPayer && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }}
              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
