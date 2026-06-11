import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, supabaseView } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { groupKeys } from './useGroups'
import { expenseKeys } from './useExpenses'
import type { SettleUpFormData } from '@/schemas'
import type { GroupBalance } from '@/types/database'

export const settlementKeys = {
  all: ['settlements'] as const,
  byGroup: (groupId: string) => [...settlementKeys.all, 'group', groupId] as const,
}

// ── Fetch settlements for a group ─────────────────────────────
export function useSettlements(groupId: string) {
  return useQuery({
    queryKey: settlementKeys.byGroup(groupId),
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settlements')
        .select(`
          *,
          payer:profiles!payer_id (id, full_name, avatar_url),
          payee:profiles!payee_id (id, full_name, avatar_url),
          creator:profiles!created_by (id, full_name, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('settled_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

// ── Create settlement mutation ────────────────────────────────
export function useCreateSettlement(groupId: string) {
  const qc = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (formData: SettleUpFormData) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('settlements')
        .insert({
          group_id: groupId,
          payer_id: formData.payer_id,
          payee_id: formData.payee_id,
          amount: formData.amount,
          payment_method: formData.payment_method,
          notes: formData.notes ?? null,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settlementKeys.byGroup(groupId) })
      qc.invalidateQueries({ queryKey: groupKeys.balances(groupId) })
      qc.invalidateQueries({ queryKey: expenseKeys.activity() })
    },
  })
}

// ── Dashboard summary ─────────────────────────────────────────
export function useDashboardSummary() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['dashboard', 'summary', user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Use supabaseView for the group_balances view (not in generated types)
      const { data: balances, error } = await supabaseView
        .from('group_balances')
        .select('net_balance, group_id')
        .eq('user_id', user!.id)

      if (error) throw error

      const typedBalances = (balances ?? []) as Pick<GroupBalance, 'net_balance' | 'group_id'>[]

      const totalOweMe = typedBalances
        .filter(b => b.net_balance > 0)
        .reduce((sum, b) => sum + b.net_balance, 0)

      const totalIOwe = typedBalances
        .filter(b => b.net_balance < 0)
        .reduce((sum, b) => sum + Math.abs(b.net_balance), 0)

      return {
        totalOweMe,
        totalIOwe,
        netBalance: totalOweMe - totalIOwe,
      }
    },
  })
}
