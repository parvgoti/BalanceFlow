import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams } from 'react-router-dom'
import { Check, ChevronUp, ChevronDown, Receipt } from 'lucide-react'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogBody,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/ui/avatar'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useGroup, useGroups } from '@/hooks/useGroups'
import { useAddExpense, useUpdateExpense } from '@/hooks/useExpenses'
import { CATEGORY_CONFIG, cn, formatCurrency } from '@/lib/utils'
import type { ExpenseCategory, SplitType } from '@/types/database'
import { format } from 'date-fns'
import { useCurrencyExchange, SUPPORTED_CURRENCIES, convertCurrency } from '@/hooks/useCurrencyExchange'

// Inline schema to avoid resolver generic issues
const expenseSplitSchema = z.object({
  user_id: z.string(),
  full_name: z.string(),
  avatar_url: z.string().nullable().optional(),
  amount: z.number().min(0),
  percentage: z.number().min(0).max(100),
  included: z.boolean(),
})

const addExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required').max(120),
  amount: z.number().positive('Amount must be greater than 0'),
  category: z.string(),
  date: z.string().min(1, 'Date is required'),
  paid_by: z.string(),
  split_type: z.string(),
  splits: z.array(expenseSplitSchema),
  notes: z.string().optional(),
})

type AddExpenseFormData = z.infer<typeof addExpenseSchema>

const CATEGORIES = Object.entries(CATEGORY_CONFIG) as [ExpenseCategory, (typeof CATEGORY_CONFIG)[ExpenseCategory]][]

export function AddExpenseModal() {
  const { closeModal, modalContext } = useUIStore()
  const { user } = useAuthStore()
  const params = useParams<{ id?: string }>()
  const initialGroupId = (modalContext?.groupId as string) ?? params.id ?? ''
  const expenseToEdit = modalContext?.expenseToEdit as any
  const isEditing = !!expenseToEdit
  const isOpenedFromGroupPage = !!modalContext?.groupId

  const { data: groups } = useGroups()
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId)

  const [prevGroupId, setPrevGroupId] = useState(initialGroupId)

  const { data: groupRaw } = useGroup(selectedGroupId)
  const group = groupRaw as any

  const members: any[] = group?.group_members ?? []
  const isAdmin = members.find(m => m.user_id === user?.id)?.role === 'admin'
  const isReadOnly = isEditing && expenseToEdit.paid_by !== user?.id && !isAdmin

  const addExpense = useAddExpense(selectedGroupId)
  const updateExpense = useUpdateExpense(selectedGroupId)

  const [splitType, setSplitType] = useState<SplitType>(expenseToEdit?.split_type ?? 'equal')
  const [receiptFile, setReceiptFile] = useState<File | undefined>()
  const [amountStr, setAmountStr] = useState(expenseToEdit?.amount?.toFixed(2) ?? '0.00')

  const [isForeignCurrency, setIsForeignCurrency] = useState(false)
  const [foreignCurrencyCode, setForeignCurrencyCode] = useState('USD')
  const [foreignAmountStr, setForeignAmountStr] = useState('')

  const baseCurrency = group?.currency || 'INR'
  const { data: exchangeRates, isFetching: isFetchingRates } = useCurrencyExchange(baseCurrency)

  const handleForeignAmountChange = (e: React.ChangeEvent<HTMLInputElement>, code: string = foreignCurrencyCode) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    setForeignAmountStr(raw)
    const val = parseFloat(raw)
    if (!isNaN(val) && exchangeRates?.rates) {
      const { convertedAmount } = convertCurrency(val, code, baseCurrency, exchangeRates.rates)
      setAmountStr(convertedAmount.toFixed(2))
      setValue('amount', convertedAmount, { shouldValidate: true })
    }
  }

  const handleForeignCurrencySelect = (code: string) => {
    setForeignCurrencyCode(code)
    const val = parseFloat(foreignAmountStr)
    if (!isNaN(val) && exchangeRates?.rates) {
      const { convertedAmount } = convertCurrency(val, code, baseCurrency, exchangeRates.rates)
      setAmountStr(convertedAmount.toFixed(2))
      setValue('amount', convertedAmount, { shouldValidate: true })
    }
  }

  const {
    register, handleSubmit, control, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<AddExpenseFormData>({
    resolver: zodResolver(addExpenseSchema),
    defaultValues: isEditing ? {
      description: expenseToEdit.description,
      amount: expenseToEdit.amount,
      category: expenseToEdit.category,
      date: expenseToEdit.date,
      paid_by: expenseToEdit.paid_by,
      split_type: expenseToEdit.split_type,
      notes: expenseToEdit.notes ?? '',
      splits: [],
    } : {
      description: '',
      amount: 0,
      category: 'food',
      date: format(new Date(), 'yyyy-MM-dd'),
      paid_by: user?.id ?? '',
      split_type: 'equal',
      splits: [],
    },
  })

  useEffect(() => {
    if (selectedGroupId !== prevGroupId) {
      setValue('splits', [])
      setPrevGroupId(selectedGroupId)
    }
  }, [selectedGroupId, prevGroupId, setValue])

  // Populate splits when members load
  useEffect(() => {
    if (members.length > 0 && !watch('splits')?.length) {
      if (isEditing && expenseToEdit.expense_splits) {
        setValue('splits', members.map((m: any) => {
          const existing = expenseToEdit.expense_splits.find((s: any) => s.user_id === m.user_id)
          return {
            user_id: m.user_id,
            full_name: m.profiles?.full_name ?? '',
            avatar_url: m.profiles?.avatar_url ?? null,
            amount: existing ? existing.amount : 0,
            percentage: existing ? (existing.percentage ?? 0) : 0,
            included: !!existing,
          }
        }))
      } else {
        setValue('splits', members.map((m: any) => ({
          user_id: m.user_id,
          full_name: m.profiles?.full_name ?? '',
          avatar_url: m.profiles?.avatar_url ?? null,
          amount: 0,
          percentage: 0,
          included: true,
        })))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group])

  const watchedAmount = watch('amount')
  const watchedSplits = watch('splits')
  const includedPattern = watchedSplits?.map((s: any) => s.included).join(',')

  // Recalculate splits when amount, split type, or inclusion changes
  useEffect(() => {
    if (!watchedSplits?.length) return
    const included = watchedSplits.filter((s: any) => s.included)
    if (included.length === 0) return

    if (splitType === 'equal') {
      const perPerson = watchedAmount / included.length
      
      let needsUpdate = false
      const newSplits = watchedSplits.map((s: any) => {
        const expectedAmount = s.included ? Math.round(perPerson * 100) / 100 : 0
        const expectedPct = s.included ? Math.round((100 / included.length) * 100) / 100 : 0
        if (s.amount !== expectedAmount || s.percentage !== expectedPct) {
          needsUpdate = true
        }
        return {
          ...s,
          amount: expectedAmount,
          percentage: expectedPct,
        }
      })

      if (needsUpdate) {
        setValue('splits', newSplits)
      }
    } else if (splitType === 'percentage') {
      let needsUpdate = false
      const newSplits = watchedSplits.map((s: any) => {
        if (!s.included && (s.percentage !== 0 || s.amount !== 0)) {
          needsUpdate = true
          return { ...s, amount: 0, percentage: 0 }
        } else if (s.included) {
          const expectedAmount = Math.round((s.percentage / 100) * watchedAmount * 100) / 100
          if (s.amount !== expectedAmount) {
            needsUpdate = true
            return { ...s, amount: expectedAmount }
          }
        }
        return s
      })
      if (needsUpdate) {
        setValue('splits', newSplits)
      }
    } else if (splitType === 'exact') {
      let needsUpdate = false
      const newSplits = watchedSplits.map((s: any) => {
        if (!s.included && (s.amount !== 0 || s.percentage !== 0)) {
          needsUpdate = true
          return { ...s, amount: 0, percentage: 0 }
        }
        return s
      })
      if (needsUpdate) {
        setValue('splits', newSplits)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAmount, splitType, includedPattern])

  const [formError, setFormError] = useState<string | null>(null)

  const onSubmit = async (data: AddExpenseFormData) => {
    setFormError(null)
    if (!selectedGroupId) return

    // Split validation
    const includedSplits = data.splits.filter((s: any) => s.included)
    if (includedSplits.length === 0) {
      setFormError('Please select at least one person to split with.')
      return
    }

    if (data.split_type === 'exact') {
      const sum = includedSplits.reduce((acc, curr: any) => acc + (curr.amount || 0), 0)
      if (Math.abs(sum - data.amount) > 0.01) {
        setFormError(`The exact amounts entered (${formatCurrency(sum)}) do not match the total expense amount (${formatCurrency(data.amount)}).`)
        return
      }
    } else if (data.split_type === 'percentage') {
      const sum = includedSplits.reduce((acc, curr: any) => acc + (curr.percentage || 0), 0)
      if (Math.abs(sum - 100) > 0.01) {
        setFormError(`The total percentage must equal exactly 100%. Currently it is ${sum.toFixed(2)}%.`)
        return
      }
    }

    try {
      if (isEditing) {
        await updateExpense.mutateAsync({ expenseId: expenseToEdit.id, formData: data as any, receiptFile })
      } else {
        await addExpense.mutateAsync({ formData: data as any, receiptFile })
      }
      closeModal()
    } catch (err) {
      console.error('Failed to save expense:', err)
      setFormError('Failed to save expense. Please try again.')
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    setAmountStr(raw)
    const val = parseFloat(raw)
    if (!isNaN(val)) setValue('amount', val, { shouldValidate: true })
  }

  const adjustAmount = (delta: number) => {
    const current = parseFloat(amountStr) || 0
    const next = Math.max(0, current + delta)
    setAmountStr(next.toFixed(2))
    setValue('amount', next, { shouldValidate: true })
  }

  const exactSplitSum = (watchedSplits || [])
    .filter((s: any) => s.included)
    .reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0)
  const totalExpenseAmount = Number(watchedAmount) || 0
  const isExactMatching = Math.abs(exactSplitSum - totalExpenseAmount) <= 0.01 && totalExpenseAmount > 0

  // Percentage split live validation
  const percentageSplitSum = (watchedSplits || [])
    .filter((s: any) => s.included)
    .reduce((acc: number, curr: any) => acc + (Number(curr.percentage) || 0), 0)
  const isPercentageMatching = Math.abs(percentageSplitSum - 100) <= 0.01 && (watchedSplits || []).some((s: any) => s.included)

  return (
    <Dialog open onOpenChange={(v) => !v && closeModal()}>
      <DialogContent className="max-w-lg w-full h-[100dvh] sm:h-auto sm:rounded-3xl p-0 flex flex-col overflow-hidden bg-white dark:bg-gray-950 border-0" id="add-expense-modal">
        <DialogHeader className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <DialogTitle className="text-xl font-bold text-navy dark:text-white text-center">
            {isReadOnly ? 'Expense Details' : isEditing ? 'Edit Expense' : 'Add Expense'}
          </DialogTitle>
          {/* <DialogDescription> is hidden to keep it clean like the reference */}
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <DialogBody className="space-y-6 px-4 py-5 sm:px-6 flex-1 overflow-y-auto">
            {/* Amount Section */}
            <div className="text-center pb-4 border-b border-gray-100 dark:border-gray-800">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Amount</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-semibold text-navy dark:text-white">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: group?.currency || 'INR' })
                    .formatToParts(0).find(x => x.type === 'currency')?.value || '₹'}
                </span>
                <input
                  id="expense-amount-input"
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={handleAmountChange}
                  onFocus={() => {
                    if (!isReadOnly && (amountStr === '0.00' || amountStr === '0')) setAmountStr('')
                  }}
                  onBlur={() => {
                    if (!isReadOnly && !amountStr) setAmountStr('0.00')
                  }}
                  disabled={isReadOnly}
                  className={cn(
                    "text-4xl sm:text-5xl font-bold w-36 sm:w-48 text-center bg-transparent border-none outline-none text-navy dark:text-white placeholder-gray-300 dark:placeholder-gray-700 focus:outline-none",
                    isReadOnly && "opacity-90 cursor-not-allowed"
                  )}
                  placeholder="0.00"
                />
              </div>
              {errors.amount && <p className="text-xs text-red-500 mt-2 font-medium">{errors.amount.message}</p>}

              {/* Foreign Currency Toggle & Converter */}
              {!isReadOnly && (
                <div className="mt-3 pt-3 border-t border-white/20 text-center">
                  {!isForeignCurrency ? (
                    <button
                      type="button"
                      onClick={() => setIsForeignCurrency(true)}
                      className="text-xs font-semibold text-white/80 hover:text-white underline transition-colors"
                    >
                      🌍 Paid in foreign currency?
                    </button>
                  ) : (
                    <div className="space-y-2 text-left bg-black/10 p-3 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white/90">Foreign Currency Converter</span>
                        <button
                          type="button"
                          onClick={() => setIsForeignCurrency(false)}
                          className="text-xs text-white/60 hover:text-white underline"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={foreignCurrencyCode}
                          onChange={(e) => handleForeignCurrencySelect(e.target.value)}
                          className="h-8 rounded-lg px-2 text-xs bg-white text-gray-900 font-semibold focus:outline-none"
                        >
                          {SUPPORTED_CURRENCIES.map(c => (
                            <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={foreignAmountStr}
                          onChange={handleForeignAmountChange}
                          placeholder="Amount in foreign curr…"
                          className="h-8 flex-1 rounded-lg px-2.5 text-xs bg-white/20 text-white placeholder-white/50 focus:outline-none font-medium"
                        />
                      </div>
                      {foreignAmountStr && exchangeRates?.rates && (
                        <p className="text-[11px] text-white/80 font-medium">
                          ≈ Converted to <strong>{formatCurrency(parseFloat(amountStr) || 0, baseCurrency)}</strong> (Rate: 1 {foreignCurrencyCode} = {formatCurrency((1 / (exchangeRates.rates[foreignCurrencyCode] || 1)), baseCurrency)})
                        </p>
                      )}
                  disabled={isReadOnly}
                  className="w-full h-12 pl-[28px] pr-4 rounded-[12px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-[17px] font-bold focus:outline-none focus:border-[#107C41] focus:ring-1 focus:ring-[#107C41] transition-colors shadow-sm"
                  {...register('amount', { valueAsNumber: true })}
                />
              </div>
              <div className="relative">
                <select 
                  className="appearance-none h-12 pl-4 pr-10 rounded-[12px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-[13px] font-bold focus:outline-none focus:border-[#107C41] transition-colors shadow-sm"
                  value={isForeignCurrency ? foreignCurrencyCode : baseCurrency}
                  onChange={(e) => {
                    const code = e.target.value
                    if (code !== baseCurrency) {
                      setIsForeignCurrency(true)
                      handleForeignCurrencySelect(code)
                    } else {
                      setIsForeignCurrency(false)
                    }
                  }}
                  disabled={isReadOnly}
                >
                  {SUPPORTED_CURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Expense Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500">Expense Title</label>
            <input
              type="text"
              placeholder="What was this expense for?"
              disabled={isReadOnly}
              className="w-full h-12 px-4 rounded-[12px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-[14px] font-semibold focus:outline-none focus:border-[#107C41] focus:ring-1 focus:ring-[#107C41] transition-colors shadow-sm placeholder:text-gray-400 placeholder:font-medium"
              {...register('description')}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500">Category</label>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              <select
                disabled={isReadOnly}
                className="appearance-none w-full h-12 pl-12 pr-10 rounded-[12px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-[14px] font-bold focus:outline-none focus:border-[#107C41] focus:ring-1 focus:ring-[#107C41] transition-colors shadow-sm"
                {...register('category')}
              >
                {CATEGORIES.map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Paid By */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500">Paid By</label>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <select
                disabled={isReadOnly}
                className="appearance-none w-full h-12 pl-12 pr-10 rounded-[12px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-[14px] font-bold focus:outline-none focus:border-[#107C41] focus:ring-1 focus:ring-[#107C41] transition-colors shadow-sm"
                {...register('paid_by')}
              >
                {members.map((m: any) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user_id === user?.id ? 'You' : m.profiles?.full_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500">Date</label>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              <input
                type="date"
                disabled={isReadOnly}
                className="w-full h-12 pl-12 pr-4 rounded-[12px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-[14px] font-bold focus:outline-none focus:border-[#107C41] focus:ring-1 focus:ring-[#107C41] transition-colors shadow-sm"
                {...register('date')}
              />
            </div>
          </div>

          {/* Split with */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500">Split with</label>
            <div className="relative flex items-center justify-between h-12 px-4 rounded-[12px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm cursor-pointer hover:border-gray-200 transition-colors">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span className="text-[14px] font-medium text-gray-400">Select members</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[13px] font-bold text-navy dark:text-white">{watch('splits')?.filter(s => s.included).length || 0} selected</span>
                <ChevronRight className="h-4 w-4 text-navy dark:text-white" />
              </div>
            </div>
          </div>

          {/* Split rows inside a collapsible or inline if needed, for now inline to be functional */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[12px] p-3 space-y-2">
            <Controller
              name="splits"
              control={control}
              render={({ field }) => (
                <>
                  {field.value.map((split: any, i: number) => (
                    <div key={split.user_id} className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-[10px] p-2 border border-gray-100 dark:border-gray-800 shadow-sm">
                      <UserAvatar
                        name={split.full_name}
                        avatarUrl={split.avatar_url}
                        userId={split.user_id}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-navy dark:text-white">
                          {split.user_id === user?.id ? 'You' : split.full_name}
                        </p>
                      </div>

                      {splitType === 'equal' && (
                        <span className="text-xs font-semibold text-[#107C41]">
                          1/{field.value.filter((s: any) => s.included).length}
                        </span>
                      )}

                      {splitType !== 'equal' && (
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          step={splitType === 'percentage' ? '1' : '0.01'}
                          value={splitType === 'percentage' ? (split.percentage || '') : (split.amount || '')}
                          disabled={isReadOnly}
                          onChange={(e) => {
                            if (isReadOnly) return
                            const valStr = e.target.value;
                            const val = valStr === '' ? 0 : parseFloat(valStr) || 0;
                            const updated = field.value.map((s: any, j: number) => {
                              if (j === i) {
                                if (splitType === 'percentage') {
                                  return {
                                    ...s,
                                    percentage: val,
                                    amount: Math.round((val / 100) * (watch('amount') || 0) * 100) / 100
                                  }
                                } else {
                                  return { ...s, amount: val }
                                }
                              }
                              return s
                            })
                            field.onChange(updated)
                          }}
                          className="w-16 text-right text-[13px] font-bold rounded-md bg-gray-50 dark:bg-gray-800 border-none px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#107C41]"
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (isReadOnly) return
                          const updated = field.value.map((s: any, j: number) =>
                            j === i ? { ...s, included: !s.included } : s
                          )
                          field.onChange(updated)
                        }}
                        disabled={isReadOnly}
                        className={cn(
                          'h-6 w-6 rounded-md flex items-center justify-center transition-colors shrink-0',
                          split.included
                            ? 'bg-[#107C41] text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400',
                          isReadOnly && 'opacity-60 cursor-not-allowed'
                        )}
                      >
                        {split.included && <Check className="h-3 w-3" />}
                      </button>
                    : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400'
                )}
              >
                <span className={cn(
                  'flex items-center justify-center h-7 w-7 rounded-full shrink-0',
                  isExactMatching
                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600'
                    : 'bg-red-100 dark:bg-red-900/50 text-red-500'
                )}>
                  {isExactMatching ? '✓' : '⚠'}
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                    {isExactMatching ? 'Matched' : 'Unmatched'}
                  </p>
                  <p className="text-sm">
                    SPLIT TOTAL <strong>{exactSplitSum.toFixed(2)}</strong> OUT OF {totalExpenseAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* Percentage Split Total Validation Banner */}
            {splitType === 'percentage' && (
              <div
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all',
                  isPercentageMatching
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                )}
              >
                <span className={cn(
                  'flex items-center justify-center h-7 w-7 rounded-full shrink-0',
                  isPercentageMatching
                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600'
                    : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600'
                )}>
                  {isPercentageMatching ? '✓' : '⚠'}
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                    {isPercentageMatching ? 'Matched' : 'Unmatched'}
                  </p>
                  <p className="text-sm">
                    CURRENT <strong>{percentageSplitSum.toFixed(2)}%</strong> OUT OF 100%
                  </p>
                </div>
              </div>
            )}

            {/* Receipt upload */}
            {!isReadOnly ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Receipt (optional)
                </label>
                <input
                  id="expense-receipt-input"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0])}
                  className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand file:text-white hover:file:bg-brand-light"
                />
                {isEditing && !receiptFile && expenseToEdit?.receipt_url && (
                  <div className="text-xs mt-1.5 flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                    <Receipt className="h-3.5 w-3.5 text-gray-400" />
                    <a 
                      href={expenseToEdit.receipt_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-brand hover:underline font-medium"
                    >
                      Current receipt attached
                    </a>
                    <span className="text-gray-400 text-2xs ml-1">(Upload to replace)</span>
                  </div>
                )}
              </div>
            ) : expenseToEdit?.receipt_url ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Receipt
                </label>
                <div className="text-xs flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                  <Receipt className="h-3.5 w-3.5 text-gray-400" />
                  <a 
                    href={expenseToEdit.receipt_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-brand hover:underline font-medium"
                  >
                    View attached receipt
                  </a>
                </div>
              </div>
            ) : null}
          </DialogBody>

          <DialogFooter className="px-4 py-4 sm:px-6 sm:py-5 border-t border-gray-100 dark:border-gray-800 shrink-0 flex-col gap-3">
            {formError && (
              <div className="text-sm font-medium text-red-500 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-200 dark:border-red-500/20 w-full text-center">
                {formError}
              </div>
            )}
            <div className="flex flex-col gap-3 w-full">
              {isReadOnly ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  className="w-full h-[46px] rounded-[14px] text-sm font-semibold border-gray-200 dark:border-gray-800"
                >
                  Close
                </Button>
              ) : (
                <Button
                  id="expense-save-btn"
                  type="submit"
                  loading={isSubmitting || addExpense.isPending || updateExpense.isPending}
                  disabled={!selectedGroupId}
                  className="w-full h-[46px] rounded-[14px] bg-[#107C41] hover:bg-[#15803D] text-white text-[15px] font-semibold shadow-sm"
                >
                  {isEditing ? 'Save Changes' : 'Add Expense'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
