import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogBody,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserSearchInput } from '@/components/ui/UserSearchInput'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useCreateGroup } from '@/hooks/useGroups'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'SGD']

const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(60),
  description: z.string().max(200).optional(),
  currency: z.string().min(1, 'Select a currency'),
  member_emails: z.array(z.string().email()).max(20),
})

/** Maps email → display name for the chip labels */
type MemberMeta = Record<string, string>
type CreateGroupFormData = z.infer<typeof createGroupSchema>

export function CreateGroupModal() {
  const { closeModal } = useUIStore()
  const { user } = useAuthStore()
  const createGroup = useCreateGroup()
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Stores display name for each added email so chips look nicer
  const [memberMeta, setMemberMeta] = useState<MemberMeta>({})

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: '', currency: 'INR', member_emails: [] },
  })

  const memberEmails = watch('member_emails')

  const addMember = (email: string, displayName?: string) => {
    const normalised = email.trim().toLowerCase()
    if (!normalised || memberEmails.includes(normalised)) return
    setValue('member_emails', [...memberEmails, normalised])
    if (displayName) {
      setMemberMeta(prev => ({ ...prev, [normalised]: displayName }))
    }
  }

  const removeMember = (email: string) => {
    setValue('member_emails', memberEmails.filter(e => e !== email))
    setMemberMeta(prev => { const n = { ...prev }; delete n[email]; return n })
  }

  const onSubmit = async (data: CreateGroupFormData) => {
    setSubmitError(null)

    if (!user) {
      setSubmitError('You must be logged in to create a group.')
      return
    }

    try {
      await createGroup.mutateAsync({
        name: data.name,
        description: data.description,
        currency: data.currency,
        member_emails: data.member_emails,
      })
      closeModal()
    } catch (err: any) {
      console.error('[CreateGroup] failed:', err)
      // Show a human-readable error from Supabase or generic fallback
      const msg =
        err?.message ??
        err?.error_description ??
        err?.details ??
        'Failed to create group. Please try again.'
      setSubmitError(msg)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && closeModal()}>
      <DialogContent id="create-group-modal">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>Invite friends and start splitting expenses</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className="space-y-4">
            <Input
              id="group-name-input"
              label="Group Name"
              placeholder="e.g. Miami Trip, Roommates"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              id="group-description-input"
              label="Description (optional)"
              placeholder="What's this group for?"
              {...register('description')}
            />

            {/* Currency */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Currency
              </label>
              <select
                id="group-currency-select"
                className="flex h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                {...register('currency')}
              >
                {CURRENCIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Member search */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Invite Members (optional)
              </label>
              <UserSearchInput
                onAdd={addMember}
                selectedEmails={memberEmails}
              />
              {memberEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {memberEmails.map(email => (
                    <span
                      key={email}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-subtle dark:bg-brand-dark/20 text-brand text-sm font-medium"
                    >
                      {/* Show name if we have it, otherwise show email */}
                      {memberMeta[email] ?? email}
                      <button type="button" onClick={() => removeMember(email)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Error display */}
            {submitError && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button
              id="create-group-btn"
              type="submit"
              loading={isSubmitting || createGroup.isPending}
            >
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
