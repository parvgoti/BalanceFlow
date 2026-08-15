import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogBody,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useUpdateGroup } from '@/hooks/useGroups'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'SGD']

const editGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(60),
  description: z.string().max(200).optional(),
  currency: z.string().min(1, 'Select a currency'),
})

type EditGroupFormData = z.infer<typeof editGroupSchema>

export function EditGroupModal() {
  const { closeModal, modalContext } = useUIStore()
  const { user } = useAuthStore()
  const updateGroup = useUpdateGroup()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const group = modalContext?.group as any
  const groupId = group?.id

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditGroupFormData>({
    resolver: zodResolver(editGroupSchema),
    defaultValues: { 
      name: group?.name || '', 
      currency: group?.currency || 'INR',
      description: group?.description || ''
    },
  })

  const onSubmit = async (data: EditGroupFormData) => {
    setSubmitError(null)

    if (!user || !groupId) return

    try {
      await updateGroup.mutateAsync({
        id: groupId,
        updates: {
          name: data.name,
          description: data.description,
          currency: data.currency,
        }
      })
      closeModal()
    } catch (err: any) {
      console.error('[EditGroup] failed:', err)
      const msg =
        err?.message ??
        err?.error_description ??
        err?.details ??
        'Failed to update group. Please try again.'
      setSubmitError(msg)
    }
  }

  const handleDelete = async () => {
    if (!groupId) return
    if (confirm("Are you sure you want to delete this group? All expenses and settlements will be removed. This cannot be undone.")) {
      try {
        const { error } = await supabase.from('groups').delete().eq('id', groupId)
        if (error) throw error
        closeModal()
        navigate('/groups')
      } catch (err: any) {
        setSubmitError(err?.message || 'Failed to delete group')
      }
    }
  }

  if (!group) {
    return null
  }

  return (
    <Dialog open onOpenChange={(v) => !v && closeModal()}>
      <DialogContent id="edit-group-modal">
        <DialogHeader>
          <DialogTitle>Group Settings</DialogTitle>
          <DialogDescription>Manage your group details</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <DialogBody className="space-y-4">
            <Input
              id="edit-group-name"
              label="Group Name"
              placeholder="e.g. Goa Trip 🏖️"
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              id="edit-group-description"
              label="Description (Optional)"
              placeholder="What is this group for?"
              error={errors.description?.message}
              {...register('description')}
            />

            <div>
              <label className="block text-sm font-semibold text-navy dark:text-white mb-1.5" htmlFor="edit-group-currency">
                Base Currency
              </label>
              <select
                id="edit-group-currency"
                className="w-full h-11 px-3 rounded-[12px] border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#107C41]/30 focus:border-[#107C41] transition-colors"
                {...register('currency')}
              >
                {CURRENCIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.currency && (
                <p className="mt-1.5 text-xs text-red-500">{errors.currency.message}</p>
              )}
            </div>

            {submitError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {submitError}
              </div>
            )}
          </DialogBody>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-auto">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={handleDelete}
            >
              Delete Group
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={closeModal}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                id="save-group-btn"
                className="w-full sm:w-auto bg-[#107C41] hover:bg-[#15803D] text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
