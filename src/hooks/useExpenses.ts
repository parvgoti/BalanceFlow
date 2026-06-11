import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { supabase, supabaseView } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { groupKeys } from './useGroups'
import type { AddExpenseFormData } from '@/schemas'
import type { ActivityItem } from '@/types/database'

const PAGE_SIZE = 20

// ── Query keys ────────────────────────────────────────────────
export const expenseKeys = {
  all: ['expenses'] as const,
  byGroup: (groupId: string) => [...expenseKeys.all, 'group', groupId] as const,
  detail: (id: string) => [...expenseKeys.all, 'detail', id] as const,
  activity: () => [...expenseKeys.all, 'activity'] as const,
}

// ── Paginated expense list ────────────────────────────────────
export function useExpenses(groupId: string) {
  return useInfiniteQuery({
    queryKey: expenseKeys.byGroup(groupId),
    enabled: !!groupId,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const from = (pageParam as number) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error, count } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_splits (
            id, user_id, amount, percentage, is_settled,
            profiles (id, full_name, avatar_url)
          ),
          profiles!paid_by (id, full_name, avatar_url)
        `, { count: 'exact' })
        .eq('group_id', groupId)
        .eq('is_deleted', false)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      return { data: data ?? [], count: count ?? 0, page: pageParam as number }
    },
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.page + 1
      if (nextPage * PAGE_SIZE >= lastPage.count) return undefined
      return nextPage
    },
  })
}

// ── Activity feed (all groups) ────────────────────────────────
export function useActivityFeed() {
  const { user } = useAuthStore()

  return useInfiniteQuery({
    queryKey: expenseKeys.activity(),
    enabled: !!user,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const from = (pageParam as number) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error } = await supabaseView
        .from('activity_feed')
        .select('*')
        .range(from, to)

      if (error) throw error
      return { data: (data ?? []) as ActivityItem[], page: pageParam as number }
    },
    getNextPageParam: (lastPage) => {
      if ((lastPage.data?.length ?? 0) < PAGE_SIZE) return undefined
      return lastPage.page + 1
    },
  })
}

// ── Add expense mutation ──────────────────────────────────────
export function useAddExpense(groupId: string) {
  const qc = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({
      formData,
      receiptFile,
    }: {
      formData: AddExpenseFormData
      receiptFile?: File
    }) => {
      if (!user) throw new Error('Not authenticated')

      let receiptUrl: string | null = null

      // 1. Upload receipt if provided
      if (receiptFile) {
        const ext = receiptFile.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(path, receiptFile, { upsert: false })
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('receipts')
            .getPublicUrl(path)
          receiptUrl = urlData.publicUrl
        }
      }

      // 2. Insert expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          group_id: groupId,
          paid_by: formData.paid_by,
          amount: formData.amount,
          description: formData.description,
          category: formData.category,
          date: formData.date,
          notes: formData.notes ?? null,
          split_type: formData.split_type,
          receipt_url: receiptUrl,
        })
        .select()
        .single()

      if (expenseError) throw expenseError

      // 3. Insert splits
      const includedSplits = formData.splits.filter(s => s.included)
      const { error: splitsError } = await supabase.from('expense_splits').insert(
        includedSplits.map(s => ({
          expense_id: expense.id,
          user_id: s.user_id,
          amount: s.amount,
          percentage: s.percentage ?? null,
        }))
      )

      if (splitsError) throw splitsError

      return expense
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseKeys.byGroup(groupId) })
      qc.invalidateQueries({ queryKey: groupKeys.balances(groupId) })
      qc.invalidateQueries({ queryKey: expenseKeys.activity() })
    },
  })
}

// ── Delete expense mutation ───────────────────────────────────
export function useDeleteExpense(groupId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase
        .from('expenses')
        .update({ is_deleted: true })
        .eq('id', expenseId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseKeys.byGroup(groupId) })
      qc.invalidateQueries({ queryKey: groupKeys.balances(groupId) })
    },
  })
}
