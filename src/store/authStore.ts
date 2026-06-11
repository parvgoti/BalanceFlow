import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  fetchProfile: (userId: string) => Promise<void>
  signOut: () => Promise<void>
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      profile: null,
      isLoading: true,
      isInitialized: false,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      setInitialized: (isInitialized) => set({ isInitialized }),

      fetchProfile: async (userId: string) => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()
          if (!error && data) set({ profile: data as Profile })
        } catch (err) {
          console.error('Failed to fetch profile:', err)
        }
      },

      signOut: async () => {
        await supabase.auth.signOut()
        get().reset()
      },

      reset: () => set({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isInitialized: true,
      }),
    }),
    {
      name: 'balanceflow-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        profile: state.profile,
      }),
    }
  )
)
