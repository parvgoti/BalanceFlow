import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 minutes
      gcTime: 1000 * 60 * 10,          // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry auth errors
        if ((error as { status?: number })?.status === 401) return false
        if ((error as { status?: number })?.status === 403) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
