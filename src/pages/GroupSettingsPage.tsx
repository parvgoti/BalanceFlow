import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Trash2, ShieldAlert, Users, Settings, Plus, X, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserSearchInput } from '@/components/ui/UserSearchInput'
import { UserAvatar } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/store/authStore'
import {
  useGroup,
  useUpdateGroup,
  useDeleteGroup,
  useRemoveMember,
  useAddMembers,
  useResetGroupData,
  useGroupBalances,
} from '@/hooks/useGroups'
import {
  useGroupResetRequests,
  useCreateResetRequest,
  useRespondResetRequest,
  useCancelResetRequest,
} from '@/hooks/useGroupResetRequests'
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '@/lib/pushNotifications'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'SGD']

const editGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(60),
  description: z.string().max(200).optional(),
  currency: z.string().min(1, 'Select a currency'),
})

type EditGroupFormData = z.infer<typeof editGroupSchema>

export function GroupSettingsPage() {
  const { id: groupId = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile, setProfile } = useAuthStore()

  // Queries
  const { data: group, isLoading } = useGroup(groupId)
  const { data: balances } = useGroupBalances(groupId)
  const { data: resetRequests = [] } = useGroupResetRequests(groupId)

  // Mutations
  const updateGroup = useUpdateGroup()
  const deleteGroup = useDeleteGroup()
  const removeMember = useRemoveMember(groupId)
  const addMembers = useAddMembers(groupId)
  const resetGroupData = useResetGroupData(groupId)
  const createResetRequest = useCreateResetRequest(groupId)
  const respondResetRequest = useRespondResetRequest(groupId)
  const cancelResetRequest = useCancelResetRequest(groupId)

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Form
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = useForm<EditGroupFormData>({
    resolver: zodResolver(editGroupSchema),
    values: {
      name: group?.name || '',
      currency: group?.currency || 'INR',
      description: group?.description || '',
    },
  })

  if (isLoading || !group) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] dark:bg-gray-950 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  const members = group.group_members || []
  const isAdmin = members.some((m: any) => m.user_id === user?.id && m.role === 'admin')
  const totalUnsettled = (balances ?? []).reduce((s: number, b: any) => s + Math.abs(b.net_balance || 0), 0)
  const isGroupSettled = totalUnsettled < 0.01

  // Reset Logic
  const hasPendingReset = resetRequests.some((r: any) => r.status === 'pending')
  const hasDeniedReset = resetRequests.some((r: any) => r.status === 'denied')
  const allAcceptedReset = members.length > 1 && resetRequests.length > 0 && resetRequests.filter((r: any) => r.status === 'accepted').length === members.length
  const myResetStatus = resetRequests.find((r: any) => r.user_id === user?.id)?.status
  const resetRequester = resetRequests[0]?.profile?.full_name || 'A member'

  const onUpdateGroup = async (data: EditGroupFormData) => {
    setSubmitError(null)
    setSuccessMsg(null)
    try {
      await updateGroup.mutateAsync({ id: groupId, updates: data })
      setSuccessMsg('Group info updated successfully')
      reset(data)
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to update group')
    }
  }

  const handleDeleteGroup = async () => {
    if (!isGroupSettled) {
      alert('You cannot delete this group until all balances are settled up.')
      return
    }
    if (confirm('Are you sure you want to delete this group? All expenses and settlements will be permanently removed. This cannot be undone.')) {
      try {
        await deleteGroup.mutateAsync(groupId)
        navigate('/groups')
      } catch (err: any) {
        alert(err?.message || 'Failed to delete group')
      }
    }
  }

  const handleRemoveMember = async (userId: string, isSelf: boolean) => {
    const msg = isSelf
      ? 'Are you sure you want to leave this group?'
      : 'Are you sure you want to remove this member from the group?'
    if (confirm(msg)) {
      try {
        await removeMember.mutateAsync(userId)
        if (isSelf) navigate('/groups')
      } catch (err: any) {
        alert(err?.message || 'Failed to remove member')
      }
    }
  }

  const handleAddInvite = async (email: string) => {
    try {
      await addMembers.mutateAsync([email])
      setSuccessMsg(`Invited ${email}`)
    } catch (err: any) {
      alert(err?.message || 'Failed to invite member')
    }
  }

  return (
    <div className="flex flex-col bg-[#F7F9FC] dark:bg-gray-950 px-4 pt-12 pb-24 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 px-1">
        <button
          onClick={() => navigate(`/groups/${groupId}`)}
          className="text-navy dark:text-white shrink-0 hover:bg-gray-200 dark:hover:bg-gray-800 p-1.5 rounded-full transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-[22px] font-extrabold text-navy dark:text-white leading-tight">Group Settings</h1>
          <p className="text-[13px] text-gray-500 font-medium">Manage {group.name}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* SECTION: Basic Info */}
        <div className="bg-white dark:bg-gray-900 rounded-[20px] shadow-sm border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Settings className="h-4 w-4" />
            </div>
            <h2 className="text-[15px] font-bold text-navy dark:text-white">Basic Info</h2>
          </div>
          <form onSubmit={handleSubmit(onUpdateGroup)} className="space-y-4">
            <Input
              id="edit-group-name"
              label="Group Name"
              placeholder="e.g. Goa Trip 🏖️"
              error={errors.name?.message}
              disabled={!isAdmin}
              {...register('name')}
            />
            <Input
              id="edit-group-description"
              label="Description (Optional)"
              placeholder="What is this group for?"
              error={errors.description?.message}
              disabled={!isAdmin}
              {...register('description')}
            />
            <div>
              <label className="block text-sm font-semibold text-navy dark:text-white mb-1.5" htmlFor="edit-group-currency">
                Base Currency
              </label>
              <select
                id="edit-group-currency"
                disabled={!isAdmin}
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

            {submitError && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{submitError}</div>}
            {successMsg && <div className="p-3 rounded-lg bg-green-50 text-green-600 text-sm">{successMsg}</div>}

            {isAdmin && (
              <Button type="submit" loading={isSubmitting} disabled={!isDirty} className="w-full">
                Save Changes
              </Button>
            )}
          </form>
        </div>

        {/* SECTION: Members & Invites */}
        <div className="bg-white dark:bg-gray-900 rounded-[20px] shadow-sm border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <h2 className="text-[15px] font-bold text-navy dark:text-white">Members</h2>
            </div>
            <span className="text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-1 rounded-md">
              {members.length}
            </span>
          </div>

          <div className="space-y-3 mb-5">
            {members.map((m: any) => {
              const isSelf = m.user_id === user?.id
              return (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={m.profiles?.full_name} avatarUrl={m.profiles?.avatar_url} userId={m.user_id} size="sm" />
                    <div>
                      <p className="text-sm font-bold text-navy dark:text-white leading-tight flex items-center gap-2">
                        {isSelf ? 'You' : m.profiles?.full_name || 'Unknown'}
                        {m.role === 'admin' && (
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Admin
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-500">{m.profiles?.email}</p>
                    </div>
                  </div>
                  {(isAdmin || isSelf) && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id, isSelf)}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      {isSelf ? 'Leave' : 'Remove'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
              Invite someone
            </label>
            <UserSearchInput
              selectedEmails={members.map((m: any) => m.profiles?.email)}
              onAdd={handleAddInvite}
              placeholder="Enter name or email..."
            />
          </div>
        </div>

        {/* SECTION: Notifications */}
        <div className="bg-white dark:bg-gray-900 rounded-[20px] shadow-sm border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-navy dark:text-white leading-tight">Push Notifications</h2>
                <p className="text-[12px] text-gray-500 mt-0.5">Enable browser notifications for this group</p>
              </div>
            </div>
            <Switch
              checked={profile?.push_notifications ?? false}
              onCheckedChange={async (enabled) => {
                if (!profile) return
                try {
                  if (enabled) {
                    const subscribed = await subscribeToPushNotifications(profile.id)
                    if (subscribed) {
                      await supabase.from('profiles').update({ push_notifications: true } as any).eq('id', profile.id)
                      setProfile({ ...profile, push_notifications: true } as any)
                    } else {
                      alert('Failed to enable push notifications. Please check browser permissions.')
                    }
                  } else {
                    await unsubscribeFromPushNotifications(profile.id)
                    await supabase.from('profiles').update({ push_notifications: false } as any).eq('id', profile.id)
                    setProfile({ ...profile, push_notifications: false } as any)
                  }
                } catch (err: any) {
                  alert(err.message || 'Error updating notification settings')
                }
              }}
            />
          </div>
        </div>

        {/* SECTION: Reset Group Data */}
        <div className="bg-white dark:bg-gray-900 rounded-[20px] shadow-sm border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <h2 className="text-[15px] font-bold text-navy dark:text-white">Reset Group Data</h2>
          </div>

          {resetRequests.length > 0 ? (
            <div className={cn(
              "p-4 rounded-xl border",
              hasDeniedReset
                ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30"
                : allAcceptedReset
                  ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30"
                  : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30"
            )}>
              <div className="mb-3">
                <h4 className={cn(
                  "text-sm font-bold",
                  hasDeniedReset ? "text-red-900 dark:text-red-400"
                    : allAcceptedReset ? "text-emerald-900 dark:text-emerald-400"
                      : "text-amber-900 dark:text-amber-400"
                )}>
                  {hasDeniedReset && "Reset Request Denied"}
                  {allAcceptedReset && "Reset Request Approved"}
                  {!hasDeniedReset && !allAcceptedReset && `Reset Requested (${resetRequests.filter((r: any) => r.status === 'accepted').length}/${members.length} Accepted)`}
                </h4>
                <p className={cn(
                  "text-[13px] mt-1 font-medium",
                  hasDeniedReset ? "text-red-700 dark:text-red-300"
                    : allAcceptedReset ? "text-emerald-700 dark:text-emerald-300"
                      : "text-amber-700 dark:text-amber-300"
                )}>
                  {hasDeniedReset && "A group member denied the request to reset group data. The admin cannot reset the data."}
                  {allAcceptedReset && "All members accepted! The admin can now reset the group data."}
                  {!hasDeniedReset && !allAcceptedReset && `${resetRequester} has requested to reset all expense and settlement data. Every member must accept.`}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {resetRequests.map((r: any) => (
                    <span
                      key={r.id}
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md border",
                        r.status === 'accepted' && "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
                        r.status === 'pending' && "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
                        r.status === 'denied' && "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                      )}
                    >
                      {r.profile?.full_name || 'Member'}: {r.status}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                {myResetStatus === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      loading={respondResetRequest.isPending}
                      onClick={() => respondResetRequest.mutate({ status: 'accepted' })}
                    >
                      Accept ✔️
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold"
                      loading={respondResetRequest.isPending}
                      onClick={() => respondResetRequest.mutate({ status: 'denied' })}
                    >
                      Deny ✖️
                    </Button>
                  </>
                )}
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-gray-600 border-gray-200 font-bold"
                    onClick={() => cancelResetRequest.mutate()}
                  >
                    Cancel Request
                  </Button>
                )}
                {isAdmin && allAcceptedReset && (
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold"
                    loading={resetGroupData.isPending}
                    onClick={async () => {
                      try {
                        await resetGroupData.mutateAsync()
                        navigate(`/groups/${groupId}`)
                      } catch (err: any) {
                        alert(err?.message || 'Failed to reset data')
                      }
                    }}
                  >
                    Execute Reset
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[13px] text-gray-500 font-medium mb-4 leading-relaxed">
                Resetting group data will permanently delete all expenses, splits, and settlements. This requires approval from all group members.
              </p>
              <Button
                variant="outline"
                className="w-full text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 font-bold"
                disabled={!isAdmin}
                loading={createResetRequest.isPending}
                onClick={async () => {
                  try {
                    if (members.length === 1) {
                      if (confirm('Are you sure? This will delete all data.')) {
                        await resetGroupData.mutateAsync()
                        navigate(`/groups/${groupId}`)
                      }
                    } else {
                      await createResetRequest.mutateAsync(members.map((m: any) => m.user_id))
                    }
                  } catch (err: any) {
                    alert(err?.message || 'Failed to initiate reset')
                  }
                }}
              >
                Initiate Data Reset
              </Button>
            </div>
          )}
        </div>

        {/* SECTION: Danger Zone */}
        <div className="bg-[#FCF8F8] dark:bg-red-950/10 rounded-[20px] shadow-sm border border-red-100 dark:border-red-900/30 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <Trash2 className="h-4 w-4" />
            </div>
            <h2 className="text-[15px] font-extrabold text-red-600">Danger Zone</h2>
          </div>
          <p className="text-[13px] text-red-500/80 font-medium mb-4 leading-relaxed ml-11">
            Permanently delete this group and all its data. This action cannot be undone.
          </p>
          
          {!isGroupSettled && (
            <div className="mb-4 ml-11 p-3 rounded-xl bg-red-50 border border-red-100 text-[13px] font-bold text-red-600 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              You must settle group balances before deleting.
            </div>
          )}

          <Button
            variant="outline"
            disabled={!isAdmin || !isGroupSettled}
            onClick={handleDeleteGroup}
            className="w-full ml-11 max-w-[calc(100%-44px)] bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 font-bold"
          >
            Delete Group
          </Button>
        </div>
      </div>
    </div>
  )
}
