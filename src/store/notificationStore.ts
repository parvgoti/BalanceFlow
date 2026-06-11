import { create } from 'zustand'
import type { Notification } from '@/types/database'
import { supabase } from '@/lib/supabase'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  fetchNotifications: (userId: string) => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: (userId: string) => Promise<void>
  addNotification: (notification: Notification) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (userId: string) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data) {
        const typed = data as Notification[]
        set({
          notifications: typed,
          unreadCount: typed.filter(n => !n.is_read).length,
        })
      }
    } finally {
      set({ isLoading: false })
    }
  },

  markRead: async (id: string) => {
    // Use raw object to avoid deep type inference issues
    await supabase
      .from('notifications')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ is_read: true } as any)
      .eq('id', id)

    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
  },

  markAllRead: async (userId: string) => {
    await supabase
      .from('notifications')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ is_read: true } as any)
      .eq('user_id', userId)
      .eq('is_read', false)

    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, is_read: true })),
      unreadCount: 0,
    }))
  },

  addNotification: (notification: Notification) => {
    set(state => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.is_read ? 0 : 1),
    }))
  },
}))
