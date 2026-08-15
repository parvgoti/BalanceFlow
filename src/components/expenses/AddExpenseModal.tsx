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
      <DialogContent id="add-expense-modal" className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl h-[100dvh] sm:h-auto sm:max-h-[85vh] flex flex-col">

        {/* Header - White background */}
        <DialogHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-2 border-b-0">
          <button type="button" onClick={() => closeModal()} className="p-2 -ml-2 text-navy dark:text-white rounded-full hover:bg-gray-50 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <DialogTitle className="text-[19px] font-extrabold tracking-tight text-navy dark:text-white mb-0">
            {isEditing ? (isReadOnly ? 'Expense Details' : 'Edit Expense') : 'Add Expense'}
          </DialogTitle>
          <button type="button" className="p-2 -mr-2 text-navy dark:text-white rounded-full hover:bg-gray-50 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-y-auto px-4 pb-6 space-y-5">
          {/* Group Card */}
          <div className="flex items-center justify-between p-3 rounded-[16px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm mt-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-50/50 flex items-center justify-center text-xl shrink-0">
                {group?.name ? ['🏖️', '🏠', '🎉', '✈️', '🍕', '🏔️', '🚗', '🎮'][group.name.charCodeAt(0) % 8] : '🏠'}
              </div>
              <div>
                <p className="font-extrabold text-[15px] text-navy dark:text-white">{group?.name || 'Group'}</p>
                <p className="text-xs text-gray-500 font-medium">{members.length} members</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-400 -rotate-90" />
          </div>

          {/* Split Type Pills */}
          <div className="flex rounded-xl bg-gray-50 dark:bg-gray-800/50 p-1">
            {(['equal', 'exact', 'percentage'] as SplitType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  if (!isReadOnly) {
                    setSplitType(type)
                    setValue('split_type', type)
                  }
                }}
                disabled={isReadOnly}
                className={cn(
                  'flex-1 px-3 py-2 text-[13px] font-bold transition-all rounded-[10px] capitalize',
                  splitType === type
                    ? 'bg-[#107C41] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                  isReadOnly && 'cursor-not-allowed opacity-75'
                )}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Total Amount */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500">Total Amount</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[17px] font-bold text-navy dark:text-white">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  disabled={isReadOnly}
                  className="w-full h-12 pl-[28px] pr-4 rounded-[12px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-[17px] font-bold focus:outline-none focus:border-[#107C41] focus:ring-1 focus:ring-[#107C41] transition-colors shadow-sm"
                  {...register('amount', { valueAsNumber: true })}
                />
              </div>
              <div className="relative">
                <select 
                  className="appearance-none h-12 pl-4 pr-10 rounded-[12px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-[13px] font-bold focus:outline-none focus:border-[#107C41] focus:ring-1 focus:ring-[#107C41] transition-colors shadow-sm"
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
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
            {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
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
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500">Category</label>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              <select
                disabled={isReadOnly}
                className="appearance-none w-full h-12 pl-12 pr-10 rounded-[12px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-[14px] font-bold text-navy dark:text-white focus:outline-none focus:border-[#107C41] focus:ring-1 focus:ring-[#107C41] transition-colors shadow-sm"
                {...register('category')}
              >
                {CATEGORIES.map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Paid By */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500">Paid By</label>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <select
                disabled={isReadOnly}
                className="appearance-none w-full h-12 pl-12 pr-10 rounded-[12px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-[14px] font-bold text-navy dark:text-white focus:outline-none focus:border-[#107C41] focus:ring-1 focus:ring-[#107C41] transition-colors shadow-sm"
                {...register('paid_by')}
              >
                {members.map((m: any) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user_id === user?.id ? 'You' : m.profiles?.full_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500">Date</label>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              <input
                type="date"
                disabled={isReadOnly}
                className="w-full h-12 pl-[42px] pr-4 rounded-[12px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-[14px] font-bold text-navy dark:text-white focus:outline-none focus:border-[#107C41] focus:ring-1 focus:ring-[#107C41] transition-colors shadow-sm"
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
                <ChevronDown className="h-4 w-4 text-navy dark:text-white -rotate-90" />
              </div>
            </div>
          </div>

          {/* Split rows inline */}
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
                    </div>
                  ))}
                </>
              )}
            />
          </div>

          <button type="button" className="text-[#107C41] text-[13px] font-bold flex items-center gap-1.5 self-start pt-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Add note (optional)
          </button>

          {formError && (
            <div className="text-sm font-medium text-red-500 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-200 dark:border-red-500/20 w-full text-center">
              {formError}
            </div>
          )}

          <Button
            id="submit-expense-btn"
            type="submit"
            className="w-full h-[48px] rounded-[14px] bg-[#107C41] hover:bg-[#15803D] text-white text-[15px] font-semibold shadow-sm mt-4 shrink-0"
            loading={isSubmitting || addExpense.isPending || updateExpense.isPending}
            disabled={isReadOnly || !selectedGroupId}
          >
            {isEditing ? 'Save Changes' : 'Add Expense'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
