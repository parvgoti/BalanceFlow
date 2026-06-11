import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogBody,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/avatar'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { useCreateSettlement } from '@/hooks/useSettlements'
import { settleUpSchema, type SettleUpFormData } from '@/schemas'
import { PAYMENT_METHODS, cn } from '@/lib/utils'
import type { SimplifiedDebt } from '@/lib/utils'

interface SettleUpModalProps {
  groupId: string
  debt: SimplifiedDebt
  onClose: () => void
}

const PAYMENT_ICONS: Record<string, string> = {
  cash: '💵',
  upi: '📱',
  card: '💳',
  netbanking: '🏦',
  wallet: '👛',
  other: '🏷️',
}

export function SettleUpModal({ groupId, debt, onClose }: SettleUpModalProps) {
  const createSettlement = useCreateSettlement(groupId)
  const [selectedMethod, setSelectedMethod] = useState<string>('cash')

  const { handleSubmit, setValue, formState: { isSubmitting } } = useForm<SettleUpFormData>({
    resolver: zodResolver(settleUpSchema),
    defaultValues: {
      payer_id: debt.from_user_id,
      payee_id: debt.to_user_id,
      amount: debt.amount,
      payment_method: 'cash',
      notes: '',
    },
  })

  const onSubmit = async (data: SettleUpFormData) => {
    try {
      await createSettlement.mutateAsync(data)
      onClose()
    } catch (err) {
      console.error('Settlement failed:', err)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent id="settle-up-modal" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Settle Up</DialogTitle>
          <DialogDescription>Review your balance and confirm payment</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className="space-y-5">
            {/* Debt summary card */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <UserAvatar name={debt.to_user_name} size="md" />
                <div>
                  <p className="text-sm text-gray-500">
                    {debt.from_user_id === debt.to_user_id 
                      ? 'Self settlement' 
                      : `${debt.from_user_name} pays ${debt.to_user_name}`}
                  </p>
                  <CurrencyDisplay amount={debt.amount} size="xl" showColor />
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Select Payment Method
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(method => (
                  <button
                    key={method.value}
                    type="button"
                    id={`payment-method-${method.value}`}
                    onClick={() => {
                      setSelectedMethod(method.value)
                      setValue('payment_method', method.value as SettleUpFormData['payment_method'])
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all',
                      selectedMethod === method.value
                        ? 'border-brand bg-brand-subtle dark:bg-brand-dark/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    )}
                  >
                    <div className="relative">
                      <span className="text-2xl">{PAYMENT_ICONS[method.value]}</span>
                      {selectedMethod === method.value && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-brand flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">
                      {method.label}
                    </p>
                    {method.subtitle && (
                      <p className="text-2xs text-gray-400">{method.subtitle}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              id="confirm-payment-btn"
              type="submit"
              loading={isSubmitting || createSettlement.isPending}
            >
              <Check className="h-4 w-4" />
              Confirm Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
