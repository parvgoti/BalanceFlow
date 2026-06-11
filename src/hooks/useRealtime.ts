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
 * Automatically invalidates React Query cache on DB changes.
 */
export function useRealtimeGroup(groupId: string) {
  const qc = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!groupId) return

    const channel = supabase
      .channel(`group:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: expenseKeys.byGroup(groupId) })
          qc.invalidateQueries({ queryKey: groupKeys.balances(groupId) })
          qc.invalidateQueries({ queryKey: expenseKeys.activity() })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settlements',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: settlementKeys.byGroup(groupId) })
          qc.invalidateQueries({ queryKey: groupKeys.balances(groupId) })
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
 * Subscribe to realtime notifications for the current user.
 */
export function useRealtimeNotifications() {
  const { user } = useAuthStore()
  const { addNotification } = useNotificationStore()
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
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, addNotification])
}
