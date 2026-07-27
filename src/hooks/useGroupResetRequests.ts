import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { groupKeys } from './useGroups'

export interface GroupResetRequest {
  id: string
  group_id: string
  requested_by: string
  user_id: string
  status: 'pending' | 'accepted' | 'denied'
  created_at: string
  profile?: {
    id: string
    full_name: string
    avatar_url: string | null
  }
}

export const resetRequestKeys = {
  all: ['groupResetRequests'] as const,
  byGroup: (groupId: string) => [...resetRequestKeys.all, groupId] as const,
}

export function useGroupResetRequests(groupId: string) {
  return useQuery({
    queryKey: resetRequestKeys.byGroup(groupId),
    enabled: !!groupId,
    refetchInterval: 10_000, // Poll every 10s for live member approvals
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_reset_requests')
        .select(`
          *,
          profile:profiles!user_id(id, full_name, avatar_url)
        `)
        .eq('group_id', groupId)

      if (error) {
        // If table doesn't exist yet or query fails, return empty array gracefully
        console.warn('Could not fetch group_reset_requests:', error.message)
        return []
      }
      return (data ?? []) as unknown as GroupResetRequest[]
    },
  })
}

export function useCreateResetRequest(groupId: string) {
  const qc = useQueryClient()
  const { user, profile } = useAuthStore()

  return useMutation({
    mutationFn: async (memberIds: string[]) => {
      if (!user) throw new Error('Not authenticated')

      // 1. Delete any existing reset requests for this group
      await supabase
        .from('group_reset_requests')
        .delete()
        .eq('group_id', groupId)

      // 2. Create new requests for every member
      const rows = memberIds.map(uid => ({
        group_id: groupId,
        requested_by: user.id,
        user_id: uid,
        status: uid === user.id ? 'accepted' : 'pending',
      }))

      const { error } = await supabase
        .from('group_reset_requests')
        .insert(rows)

      if (error) throw error

      // 3. Notify all other members
      const requesterName = profile?.full_name || user.user_metadata?.full_name || user.email || 'An admin'
      const notifications = memberIds
        .filter(uid => uid !== user.id)
        .map(uid => ({
          user_id: uid,
          type: 'reminder' as const,
          title: 'Group Data Reset Requested',
          body: `${requesterName} requested to reset all expense and settlement data in this group. Please accept or deny.`,
          group_id: groupId,
        }))

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resetRequestKeys.byGroup(groupId) })
    },
  })
}

export function useRespondResetRequest(groupId: string) {
  const qc = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ status }: { status: 'accepted' | 'denied' }) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('group_reset_requests')
        .update({ status })
        .eq('group_id', groupId)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resetRequestKeys.byGroup(groupId) })
    },
  })
}

export function useCancelResetRequest(groupId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('group_reset_requests')
        .delete()
        .eq('group_id', groupId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resetRequestKeys.byGroup(groupId) })
    },
  })
}
