import { Bell, Settings } from 'lucide-react'
import { NotificationsDropdown } from './NotificationsDropdown'
import { useNavigate } from 'react-router-dom'

export function TopBar() {
  const navigate = useNavigate()

  return (
    <header className="h-14 flex items-center gap-3 px-4 sm:px-6 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 shrink-0">
      {/* App Logo & Name */}
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="white" opacity="0.3"/>
            <path d="M12 6l-5 3v6l5 3 5-3V9l-5-3z" fill="white"/>
          </svg>
        </div>
        <div>
          <p className="font-bold text-navy dark:text-white text-[15px] leading-none tracking-tight flex items-center gap-1">
            BalanceFlow
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-brand">
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </p>
        </div>
      </div>

      <div className="flex-1" />

      {/* Right side icons */}
      <NotificationsDropdown />

      <button
        onClick={() => navigate('/settings')}
        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-label="Settings"
      >
        <Settings className="h-5 w-5" />
      </button>
    </header>
  )
}
