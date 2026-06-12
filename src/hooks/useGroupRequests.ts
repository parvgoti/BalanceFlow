import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { groupKeys } from './useGroups'

export const requestKeys = {
  all: ['group_requests'] as const,
  mine: () => [...requestKeys.all, 'mine'] as const,
}

// ── Fetch my pending requests ─────────────────────────────────
export function useMyRequests() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: requestKeys.mine(),
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('group_requests')
        .select(`
          id,
          group_id,
          status,
          created_at,
          groups ( name ),
          invited_by_profile:invited_by ( full_name )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!user,
  })
}

// ── Accept Request ────────────────────────────────────────────
export function useAcceptRequest() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('accept_group_request', {
        p_request_id: requestId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: requestKeys.all })
      qc.invalidateQueries({ queryKey: groupKeys.lists() })
    },
  })
}

// ── Decline Request ───────────────────────────────────────────
export function useDeclineRequest() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('decline_group_request', {
        p_request_id: requestId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: requestKeys.all })
    },
  })
}
