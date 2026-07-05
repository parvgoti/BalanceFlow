import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { settlementKeys } from './useSettlements'
import { groupKeys } from './useGroups'

export interface SettlementRequest {
  id: string
  group_id: string
  requester_id: string
  creditor_id: string
  amount: number
  payment_method: string
  notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  // Joined relations
  requester?: { id: string; full_name: string; avatar_url: string | null }
  creditor?: { id: string; full_name: string; avatar_url: string | null }
  group?: { id: string; name: string }
}

export const settlementRequestKeys = {
  all: ['settlementRequests'] as const,
  pending: () => [...settlementRequestKeys.all, 'pending'] as const,
}

export function usePendingSettlementRequests() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: settlementRequestKeys.pending(),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settlement_requests')
        .select(`
          *,
          requester:profiles!requester_id(id, full_name, avatar_url),
          creditor:profiles!creditor_id(id, full_name, avatar_url),
          group:groups(id, name)
        `)
        .eq('creditor_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      // supabase returns arrays for joined tables when they could be one-to-many, but these are foreign keys so it might be singular objects.
      // We will handle array/object conditionally in UI if needed, but typed as singular here.
      return (data ?? []) as unknown as SettlementRequest[]
    },
  })
}

export function useCreateSettlementRequest(groupId: string) {
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (formData: { creditor_id: string; amount: number; payment_method: string; notes?: string }) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('settlement_requests')
        .insert({
          group_id: groupId,
          requester_id: user.id,
          creditor_id: formData.creditor_id,
          amount: formData.amount,
          payment_method: formData.payment_method,
          notes: formData.notes ?? null,
        })
        .select()
        .single()

      if (error) throw error

      // Create notification for the creditor
      // Use user's profile full_name if possible, fallback to 'Someone'
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      const fullName = profile?.full_name || 'Someone'

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: formData.creditor_id,
          type: 'settlement',
          title: 'Settlement Request',
          message: `${fullName} has paid ${formData.amount} and is requesting confirmation.`,
          reference_id: data.id,
        })
      if (notifError) console.error('Failed to create notification:', notifError)

      return data
    },
  })
}

export function useApproveSettlementRequest() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  
  return useMutation({
    mutationFn: async (req: SettlementRequest) => {
      if (!user) throw new Error('Not authenticated')

      // 1. Create the actual settlement
      const { error: settleError } = await supabase
        .from('settlements')
        .insert({
          group_id: req.group_id,
          payer_id: req.requester_id,
          payee_id: req.creditor_id,
          amount: req.amount,
          payment_method: req.payment_method,
          notes: req.notes,
          created_by: user.id
        })
      
      if (settleError) throw settleError

      // 2. Update request status
      const { error: updateError } = await supabase
        .from('settlement_requests')
        .update({ status: 'approved' })
        .eq('id', req.id)

      if (updateError) throw updateError
      
      return req
    },
    onSuccess: (req) => {
      qc.invalidateQueries({ queryKey: settlementRequestKeys.pending() })
      qc.invalidateQueries({ queryKey: settlementKeys.byGroup(req.group_id) })
      qc.invalidateQueries({ queryKey: groupKeys.balances(req.group_id) })
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
    }
  })
}

export function useDeclineSettlementRequest() {
  const qc = useQueryClient()
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('settlement_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settlementRequestKeys.pending() })
    }
  })
}
