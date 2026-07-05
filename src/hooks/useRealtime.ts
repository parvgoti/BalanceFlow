import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { groupKeys } from './useGroups'
import { expenseKeys } from './useExpenses'
import { settlementKeys } from './useSettlements'
import type { Notification } from '@/types/database'

/**
 * Subscribe to realtime changes for a specific group.
 * Covers: expenses, settlements, group_members, groups table.
 * Automatically invalidates React Query cache on DB changes so the
 * UI refreshes without a page reload.
 */
export function useRealtimeGroup(groupId: string) {
  const qc = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!groupId) return

    const channel = supabase
      .channel(`group:${groupId}`)
      // Expenses added / edited / soft-deleted inside the group
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `group_id=eq.${groupId}` },
        () => {
          qc.invalidateQueries({ queryKey: expenseKeys.byGroup(groupId) })
          qc.invalidateQueries({ queryKey: groupKeys.balances(groupId) })
          qc.invalidateQueries({ queryKey: expenseKeys.activity() })
          qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
        }
      )
      // Settlements recorded inside the group
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements', filter: `group_id=eq.${groupId}` },
        () => {
          qc.invalidateQueries({ queryKey: settlementKeys.byGroup(groupId) })
          qc.invalidateQueries({ queryKey: groupKeys.balances(groupId) })
          qc.invalidateQueries({ queryKey: expenseKeys.activity() })
          qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
        }
      )
      // Members added or removed from the group
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
        () => {
          qc.invalidateQueries({ queryKey: groupKeys.detail(groupId) })
          qc.invalidateQueries({ queryKey: groupKeys.members(groupId) })
          qc.invalidateQueries({ queryKey: groupKeys.lists() })
        }
      )
      // Group name / description / currency edited
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` },
        () => {
          qc.invalidateQueries({ queryKey: groupKeys.detail(groupId) })
          qc.invalidateQueries({ queryKey: groupKeys.lists() })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, qc])
}

/**
 * App-wide realtime subscription — mounted once at the layout level.
 * Keeps the Groups list and Dashboard in sync whenever the current
 * user is added to / removed from any group, or when any group they
 * belong to is updated.
 */
export function useRealtimeApp() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`app:${user.id}`)
      // When this user is added to a new group (accepted invite)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_members', filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: groupKeys.lists() })
        }
      )
      // When this user is removed from a group
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'group_members', filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: groupKeys.lists() })
        }
      )
      // Any group the user belongs to gets updated (name change, archived, etc.)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'groups' },
        () => {
          qc.invalidateQueries({ queryKey: groupKeys.lists() })
        }
      )
      // Activity feed refresh (expense added / deleted anywhere)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          qc.invalidateQueries({ queryKey: expenseKeys.activity() })
          qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
        }
      )
      // Dashboard refresh when any settlement happens
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements' },
        () => {
          qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
          qc.invalidateQueries({ queryKey: expenseKeys.activity() })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, qc])
}

/**
 * Subscribe to realtime notifications for the current user.
 * Instantly shows the notification bell update when a new
 * notification arrives from the server.
 */
export function useRealtimeNotifications() {
  const { user } = useAuthStore()
  const { addNotification } = useNotificationStore()
  const qc = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          addNotification(payload.new as Notification)
          // Also refresh groups list (e.g. after accepting a group invite via notification)
          qc.invalidateQueries({ queryKey: groupKeys.lists() })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, addNotification, qc])
}
