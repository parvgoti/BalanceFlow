import { cn, formatCurrency } from '@/lib/utils'

interface CurrencyDisplayProps {
  amount: number
  currency?: string
  signed?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  showColor?: boolean
}

const sizeMap = {
  sm:  'text-sm',
  md:  'text-base',
  lg:  'text-xl font-bold',
  xl:  'text-2xl font-bold',
  '2xl': 'text-4xl font-extrabold',
}

export function CurrencyDisplay({
  amount,
  currency = 'INR',
  signed = false,
  size = 'md',
  className,
  showColor = false,
}: CurrencyDisplayProps) {
  const absFormatted = formatCurrency(Math.abs(amount), currency)
  const isPositive = amount > 0
  const isNegative = amount < 0

  let prefix = ''
  if (signed) prefix = isPositive ? '+' : isNegative ? '-' : ''

  const colorClass = showColor
    ? isPositive
      ? 'balance-positive'
      : isNegative
        ? 'balance-negative'
        : 'balance-zero'
    : ''

  return (
    <span className={cn('tabular-nums', sizeMap[size], colorClass, className)}>
      {prefix}{absFormatted}
    </span>
  )
}
