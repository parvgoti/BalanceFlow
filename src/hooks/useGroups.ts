import { useQuery } from '@tanstack/react-query'
import { supabase, supabaseView } from '@/lib/supabase'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import type { CreateGroupFormData } from '@/schemas'
import type { GroupBalance } from '@/types/database'

// ── Query keys ────────────────────────────────────────────────
export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  detail: (id: string) => [...groupKeys.all, 'detail', id] as const,
  members: (id: string) => [...groupKeys.all, 'members', id] as const,
  balances: (id: string) => [...groupKeys.all, 'balances', id] as const,
}

// ── Fetch all groups for current user ─────────────────────────
export function useGroups() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: groupKeys.lists(),
    enabled: !!user,
    refetchInterval: 20_000,   // Poll every 20s as fallback
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          role,
          groups (
            id, name, description, image_url, currency,
            created_by, is_archived, created_at, updated_at,
            group_members (
              user_id, role,
              profiles (id, full_name, avatar_url, email)
            )
          )
        `)
        .eq('user_id', user!.id)

      if (error) throw error

      return data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((d: any) => d.groups)
        .filter(Boolean)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((g: any) => !g.is_archived)
    },
  })
}

// ── Fetch single group detail ─────────────────────────────────
export function useGroup(groupId: string) {
  return useQuery({
    queryKey: groupKeys.detail(groupId),
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          group_members (
            id, user_id, role, joined_at,
            profiles (id, full_name, avatar_url, email, currency)
          )
        `)
        .eq('id', groupId)
        .single()

      if (error) throw error
      return data
    },
  })
}

// ── Fetch group balances ──────────────────────────────────────
export function useGroupBalances(groupId: string) {
  return useQuery({
    queryKey: groupKeys.balances(groupId),
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabaseView
        .from('group_balances')
        .select('*')
        .eq('group_id', groupId)

      if (error) throw error
      return (data ?? []) as GroupBalance[]
    },
  })
}

// ── Create group mutation ─────────────────────────────────────
export function useCreateGroup() {
  const qc = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (formData: CreateGroupFormData) => {
      if (!user) throw new Error('Not authenticated')

      // 1. Create group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: formData.name,
          description: formData.description ?? null,
          currency: formData.currency,
          created_by: user.id,
        })
        .select()
        .single()

      if (groupError) throw groupError

      // 2. Add creator as admin
      const { error: memberError } = await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
      })

      if (memberError) throw memberError

      // 3. Invite additional members
      if (formData.member_emails && formData.member_emails.length > 0) {
        const { error: inviteErr } = await supabase.rpc('invite_users_to_group', {
          p_group_id: group.id,
          p_emails: formData.member_emails,
        })
        if (inviteErr) {
          console.error('Failed to invite members:', inviteErr)
        }
      }

      return group
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupKeys.lists() })
    },
  })
}

// ── Delete group mutation ─────────────────────────────────────
export function useDeleteGroup() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('groups')
        .update({ is_archived: true })
        .eq('id', groupId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupKeys.lists() })
    },
  })
}

// ── Add Group Members mutation ────────────────────────────────
export function useAddMembers(groupId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (emails: string[]) => {
      if (!emails || emails.length === 0) return

      const { error } = await supabase.rpc('invite_users_to_group', {
        p_group_id: groupId,
        p_emails: emails,
      })

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupKeys.detail(groupId) })
      qc.invalidateQueries({ queryKey: groupKeys.members(groupId) })
    },
  })
}

// ── Remove Group Member mutation ──────────────────────────────
export function useRemoveMember(groupId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupKeys.detail(groupId) })
      qc.invalidateQueries({ queryKey: groupKeys.members(groupId) })
      qc.invalidateQueries({ queryKey: groupKeys.balances(groupId) })
    },
  })
}

// ── Reset Group Data mutation ─────────────────────────────────
export function useResetGroupData(groupId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('reset_group_data', {
        group_id_input: groupId,
      })

      if (error) throw error
    },
    onSuccess: () => {
      // Invalidate everything related to the group so it clears instantly
      qc.invalidateQueries({ queryKey: groupKeys.detail(groupId) })
      qc.invalidateQueries({ queryKey: groupKeys.balances(groupId) })
      qc.invalidateQueries({ queryKey: ['expenses', 'group', groupId] })
      qc.invalidateQueries({ queryKey: ['settlements', 'group', groupId] })
      qc.invalidateQueries({ queryKey: ['expenses', 'activity'] })
    },
  })
}

