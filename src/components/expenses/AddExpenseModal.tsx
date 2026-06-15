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

  const addExpense = useAddExpense(selectedGroupId)
  const updateExpense = useUpdateExpense(selectedGroupId)

  const [splitType, setSplitType] = useState<SplitType>(expenseToEdit?.split_type ?? 'equal')
  const [receiptFile, setReceiptFile] = useState<File | undefined>()
  const [amountStr, setAmountStr] = useState(expenseToEdit?.amount?.toFixed(2) ?? '0.00')

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

  // Recalculate splits when amount or split type changes
  useEffect(() => {
    if (!watchedSplits?.length) return
    const included = watchedSplits.filter((s: any) => s.included)
    if (included.length === 0) return

    if (splitType === 'equal') {
      const perPerson = watchedAmount / included.length
      setValue('splits', watchedSplits.map((s: any) => ({
        ...s,
        amount: s.included ? Math.round(perPerson * 100) / 100 : 0,
        percentage: s.included ? Math.round((100 / included.length) * 100) / 100 : 0,
      })))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAmount, splitType])

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

  return (
    <Dialog open onOpenChange={(v) => !v && closeModal()}>
      <DialogContent className="max-w-md" id="add-expense-modal">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details for this expense.' : 'Track a new expense and split it with the group.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className="space-y-5">
            {/* Amount input */}
            <div className="flex flex-col items-center py-4">
              <div className="flex items-center gap-2">
                <span className="text-4xl font-bold text-brand">
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
                    if (amountStr === '0.00' || amountStr === '0') setAmountStr('')
                  }}
                  onBlur={() => {
                    if (!amountStr) setAmountStr('0.00')
                  }}
                  className="text-4xl font-bold w-36 text-center bg-transparent border-none outline-none text-gray-400 focus:text-gray-900 dark:focus:text-white transition-colors"
                  placeholder="0.00"
                />
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => adjustAmount(1)} className="text-gray-400 hover:text-brand">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => adjustAmount(-1)} className="text-gray-400 hover:text-brand">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>

            {/* Description */}
            <Input
              id="expense-description-input"
              label="Description"
              placeholder="What was this for?"
              error={errors.description?.message}
              {...register('description')}
            />

            {/* Category */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Category
              </label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.slice(0, 6).map(([key, cfg]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => field.onChange(key)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all',
                          field.value === key
                            ? 'bg-brand text-white border-brand shadow-glow'
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand'
                        )}
                      >
                        <span>{cfg.icon}</span>
                        <span>{cfg.label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Group Selection */}
            {!isOpenedFromGroupPage && (
              <div className="space-y-1.5 mb-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Group
                </label>
                <select
                  className="flex h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand transition-colors"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  {!selectedGroupId && <option value="" disabled>Select a group...</option>}
                  {groups?.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Paid by + Date row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Paid by
                </label>
                <select
                  id="expense-paid-by-select"
                  className="flex h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  {...register('paid_by')}
                >
                  {members.map((m: any) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user_id === user?.id ? 'You' : m.profiles?.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                id="expense-date-input"
                label="Date"
                type="date"
                {...register('date')}
                error={errors.date?.message}
              />
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 dark:border-gray-800" />

            {/* Split options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Split options</span>
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-medium">
                  {(['equal', 'percentage', 'exact'] as SplitType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setSplitType(type)
                        setValue('split_type', type)
                      }}
                      className={cn(
                        'px-3 py-1.5 transition-colors',
                        splitType === type
                          ? 'bg-brand text-white'
                          : 'bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                      )}
                    >
                      {type === 'equal' ? '= Equal' : type === 'percentage' ? '% Pct' : '$ Exact'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Split rows */}
              <Controller
                name="splits"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    {field.value.map((split: any, i: number) => (
                      <div key={split.user_id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <UserAvatar
                          name={split.full_name}
                          avatarUrl={split.avatar_url}
                          userId={split.user_id}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {split.user_id === user?.id ? 'You' : split.full_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Paying {formatCurrency(split.amount)}
                          </p>
                        </div>

                        {splitType === 'equal' && (
                          <span className="text-sm font-semibold text-brand">
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
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                // If input is empty, default to 0, otherwise parse it.
                                const valStr = e.target.value;
                                const val = valStr === '' ? 0 : parseFloat(valStr) || 0;
                                const updated = field.value.map((s: any, j: number) =>
                                  j === i
                                    ? { ...s, [splitType === 'percentage' ? 'percentage' : 'amount']: val }
                                    : s
                                )
                                field.onChange(updated)
                              }}
                              className="w-20 text-right text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          )}

                        <button
                          type="button"
                          onClick={() => {
                            const updated = field.value.map((s: any, j: number) =>
                              j === i ? { ...s, included: !s.included } : s
                            )
                            field.onChange(updated)
                          }}
                          className={cn(
                            'h-6 w-6 rounded-md flex items-center justify-center transition-colors shrink-0',
                            split.included
                              ? 'bg-brand text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                          )}
                        >
                          {split.included && <Check className="h-3 w-3" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Receipt upload */}
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
          </DialogBody>

          <DialogFooter className="flex-col items-stretch sm:flex-col sm:space-y-0 gap-3">
            {formError && (
              <div className="text-sm font-medium text-red-500 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-200 dark:border-red-500/20">
                {formError}
              </div>
            )}
            <div className="flex justify-end gap-2 w-full">
              <Button type="button" variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                id="expense-save-btn"
                type="submit"
                loading={isSubmitting || addExpense.isPending || updateExpense.isPending}
                disabled={!selectedGroupId}
              >
                <Check className="h-4 w-4" />
                {isEditing ? 'Save Changes' : 'Save Expense'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
