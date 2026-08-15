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
    refetchInterval: 120_000,  // Poll every 2m as fallback (realtime updates handle instant sync)
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
      // 1. Verify that all member balances in the group are settled up
      const { data: balances, error: balError } = await supabaseView
        .from('group_balances')
        .select('net_balance')
        .eq('group_id', groupId)

      if (balError) throw balError

      const totalUnsettled = (balances ?? []).reduce((s, b) => s + Math.abs((b as any).net_balance || 0), 0)
      if (totalUnsettled > 0.01) {
        throw new Error('All group splits and balances must be settled up before deleting the group.')
      }

      // 2. Archive group
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
      // 1. If multiple members exist, check that ALL members accepted the reset request
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)

      if (members && members.length > 1) {
        const { data: requests } = await supabase
          .from('group_reset_requests')
          .select('status, user_id')
          .eq('group_id', groupId)

        if (!requests || requests.length === 0) {
          throw new Error('You must send a reset request to all group members first.')
        }
        const hasDenied = requests.some((r: any) => r.status === 'denied')
        if (hasDenied) {
          throw new Error('Cannot reset group data: A group member denied the request.')
        }
        const acceptedCount = requests.filter((r: any) => r.status === 'accepted').length
        if (acceptedCount < members.length) {
          throw new Error(`Cannot reset group data: Waiting for member approval (${acceptedCount}/${members.length} accepted).`)
        }
      }

      // 2. Execute reset RPC
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

// ── Update Group mutation ─────────────────────────────────────
export function useUpdateGroup() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const { error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: groupKeys.lists() })
      qc.invalidateQueries({ queryKey: groupKeys.detail(variables.id) })
    },
  })
}
