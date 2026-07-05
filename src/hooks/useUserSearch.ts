import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export interface UserSearchResult {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
}

export function useUserSearch(query: string) {
  const { user } = useAuthStore()
  const trimmed = query.trim()

  return useQuery({
    queryKey: ['user-search', trimmed],
    enabled: trimmed.length >= 2, // start searching after 2 chars
    staleTime: 30_000,
    queryFn: async (): Promise<UserSearchResult[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .ilike('full_name', `%${trimmed}%`)
        .neq('id', user!.id)        // exclude yourself
        .limit(6)

      if (error) throw error
      // filter out rows with no email (shouldn't happen but defensive)
      return (data ?? []).filter((p: any) => p.email)
    },
  })
}
