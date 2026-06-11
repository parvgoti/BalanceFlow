import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import type { ExpenseCategory } from '@/types/database'

// ── Tailwind class merge ──────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Currency formatting ───────────────────────────────────────
export function formatCurrency(
  amount: number,
  currency = 'INR',
  compact = false
): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: 2,
  })
  return formatter.format(Math.abs(amount))
}

export function formatCurrencySigned(amount: number, currency = 'INR'): string {
  const formatted = formatCurrency(Math.abs(amount), currency)
  if (amount > 0) return `+${formatted}`
  if (amount < 0) return `-${formatted}`
  return formatted
}

// ── Date formatting ───────────────────────────────────────────
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMM d, yyyy')
}

export function formatDateShort(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d')
}

export function formatRelativeTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

export function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMMM d, yyyy').toUpperCase()
}

// ── Category helpers ──────────────────────────────────────────
export const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; icon: string; color: string; bg: string }
> = {
  food:          { label: 'Food & Drink',    icon: '🍽️', color: 'text-orange-600',  bg: 'bg-orange-100' },
  travel:        { label: 'Travel',          icon: '✈️', color: 'text-blue-600',    bg: 'bg-blue-100' },
  accommodation: { label: 'Accommodation',   icon: '🏨', color: 'text-purple-600',  bg: 'bg-purple-100' },
  entertainment: { label: 'Entertainment',   icon: '🎬', color: 'text-pink-600',    bg: 'bg-pink-100' },
  shopping:      { label: 'Shopping',        icon: '🛍️', color: 'text-yellow-600',  bg: 'bg-yellow-100' },
  transport:     { label: 'Transport',       icon: '🚗', color: 'text-indigo-600',  bg: 'bg-indigo-100' },
  utilities:     { label: 'Utilities',       icon: '💡', color: 'text-teal-600',    bg: 'bg-teal-100' },
  health:        { label: 'Health',          icon: '🏥', color: 'text-red-600',     bg: 'bg-red-100' },
  other:         { label: 'Other',           icon: '📦', color: 'text-gray-600',    bg: 'bg-gray-100' },
}

// ── Payment method helpers ────────────────────────────────────
export const PAYMENT_METHODS = [
  { value: 'cash',       label: 'Cash',        subtitle: 'No fee' },
  { value: 'upi',        label: 'UPI',         subtitle: 'GPay, PhonePe, Paytm' },
  { value: 'card',       label: 'Card',        subtitle: 'Credit / Debit' },
  { value: 'netbanking', label: 'Net Banking', subtitle: 'Bank Transfer' },
  { value: 'wallet',     label: 'Wallet',      subtitle: 'Amazon, MobiKwik' },
  { value: 'other',      label: 'Other',       subtitle: '' },
] as const

// ── Initials from name ────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

// ── Avatar color from user id ─────────────────────────────────
const AVATAR_COLORS = [
  'bg-emerald-400',
  'bg-blue-400',
  'bg-purple-400',
  'bg-pink-400',
  'bg-amber-400',
  'bg-teal-400',
  'bg-indigo-400',
  'bg-rose-400',
]

export function getAvatarColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ── Debt simplification (client-side) ────────────────────────
export interface BalanceEntry {
  user_id: string
  full_name: string
  avatar_url?: string | null
  net_balance: number
}

export interface SimplifiedDebt {
  from_user_id: string
  from_user_name: string
  to_user_id: string
  to_user_name: string
  amount: number
}

export function simplifyDebts(balances: BalanceEntry[]): SimplifiedDebt[] {
  const transactions: SimplifiedDebt[] = []

  const creditors = balances
    .filter(b => b.net_balance > 0.01)
    .map(b => ({ ...b, remaining: b.net_balance }))
    .sort((a, b) => b.remaining - a.remaining)

  const debtors = balances
    .filter(b => b.net_balance < -0.01)
    .map(b => ({ ...b, remaining: Math.abs(b.net_balance) }))
    .sort((a, b) => b.remaining - a.remaining)

  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]
    const amount = Math.min(creditor.remaining, debtor.remaining)

    if (amount > 0.01) {
      transactions.push({
        from_user_id: debtor.user_id,
        from_user_name: debtor.full_name,
        to_user_id: creditor.user_id,
        to_user_name: creditor.full_name,
        amount: Math.round(amount * 100) / 100,
      })
    }

    creditor.remaining -= amount
    debtor.remaining -= amount
    if (creditor.remaining < 0.01) ci++
    if (debtor.remaining < 0.01) di++
  }

  return transactions
}

// ── Misc ──────────────────────────────────────────────────────
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}

export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item)
    ;(acc[k] = acc[k] || []).push(item)
    return acc
  }, {} as Record<string, T[]>)
}
