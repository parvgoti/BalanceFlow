import React, { Component, ErrorInfo, ReactNode } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo)

    // Automatically reload once if it's a Vite chunk loading error after deployment
    const isChunkLoadError = error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Importing a module script failed') ||
      error.name === 'ChunkLoadError'

    const alreadyReloaded = sessionStorage.getItem('bf_chunk_reload_attempted')

    if (isChunkLoadError && !alreadyReloaded) {
      sessionStorage.setItem('bf_chunk_reload_attempted', 'true')
      window.location.reload()
    }
  }

  private handleReset = () => {
    sessionStorage.removeItem('bf_chunk_reload_attempted')
    window.location.reload()
  }

  private handleClearAndReset = () => {
    localStorage.clear()
    sessionStorage.clear()
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 shadow-xl border border-gray-200 dark:border-gray-800 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Something went wrong</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                We encountered an unexpected error while loading this page.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-left text-xs font-mono text-red-600 dark:text-red-400 overflow-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-light text-white text-sm font-semibold transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </button>
              <button
                onClick={this.handleClearAndReset}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-semibold transition-colors"
              >
                Clear Cache & Reload
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
