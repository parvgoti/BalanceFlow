import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Analytics } from '@vercel/analytics/react'
import { queryClient } from '@/lib/queryClient'
import { AppRouter } from '@/router'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { SpeedInsights } from '@vercel/speed-insights/react'

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </QueryClientProvider>
      <Analytics />
    </ErrorBoundary>
    <>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
      <SpeedInsights />
    </>
  )
}
