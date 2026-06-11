import { cn } from '@/lib/utils'
import { CATEGORY_CONFIG } from '@/lib/utils'
import type { ExpenseCategory } from '@/types/database'

interface CategoryIconProps {
  category: ExpenseCategory
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'h-8 w-8 text-base',
  md: 'h-10 w-10 text-lg',
  lg: 'h-12 w-12 text-xl',
}

export function CategoryIcon({ category, size = 'md', className }: CategoryIconProps) {
  const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center shrink-0',
      config.bg,
      sizeMap[size],
      className
    )}>
      <span role="img" aria-label={config.label}>{config.icon}</span>
    </div>
  )
}

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

interface StatusBadgeProps {
  status: 'settled' | 'pending' | 'split'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const classMap = {
    settled: 'badge-settled',
    pending: 'badge-pending',
    split: 'badge-split',
  }
  const labelMap = {
    settled: 'SETTLED',
    pending: 'PENDING',
    split: 'SPLIT',
  }
  return <span className={classMap[status]}>{labelMap[status]}</span>
}
