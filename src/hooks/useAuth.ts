import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useNotificationStore } from '@/store/notificationStore'

let isAuthInitializing = false
let globalAuthSubscription: any = null

export function useAuth() {
  const { user, session, profile, isLoading, isInitialized, setUser, setSession, setInitialized, setLoading, fetchProfile, signOut } = useAuthStore()

  useEffect(() => {
    if (isAuthInitializing || globalAuthSubscription) return
    isAuthInitializing = true

    // Safety fallback: ensure app unlocks even if auth hangs or locks time out
    const fallbackTimer = setTimeout(() => {
      const state = useAuthStore.getState()
      if (!state.isInitialized) {
        console.warn('Auth initialization timed out; releasing app lock.')
        state.setInitialized(true)
        state.setLoading(false)
      }
    }, 2500)

    // Get initial session with robust error handling
    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        const session = data?.session ?? null
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        }
      } catch (err) {
        console.error('Failed to get auth session:', err)
      } finally {
        clearTimeout(fallbackTimer)
        setLoading(false)
        setInitialized(true)
      }
    }

    initSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        }
        setLoading(false)
        setInitialized(true)
      }
    )
    globalAuthSubscription = subscription

    return () => {
      clearTimeout(fallbackTimer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply persisted theme on mount
  useEffect(() => {
    const theme = useUIStore.getState().theme
    useUIStore.getState().setTheme(theme)
  }, [])

  return {
    user,
    session,
    profile,
    isLoading,
    isInitialized,
    isAuthenticated: !!user,
    signOut,
  }
}

export function useRequireAuth() {
  const navigate = useNavigate()
  const { isAuthenticated, isInitialized } = useAuth()

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, isInitialized, navigate])

  return { isAuthenticated, isInitialized }
}
