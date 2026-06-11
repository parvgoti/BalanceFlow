import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useNotificationStore } from '@/store/notificationStore'

export function useAuth() {
  const { user, session, profile, isLoading, isInitialized, setUser, setSession, setInitialized, setLoading, fetchProfile, signOut } = useAuthStore()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
      setLoading(false)
      setInitialized(true)
    })

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

    return () => subscription.unsubscribe()
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
