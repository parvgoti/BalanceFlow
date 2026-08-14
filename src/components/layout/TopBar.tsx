import { Bell, Settings } from 'lucide-react'
import { NotificationsDropdown } from './NotificationsDropdown'
import { useNavigate } from 'react-router-dom'

export function TopBar() {
  const navigate = useNavigate()

  return (
    <header className="h-14 flex items-center gap-3 px-4 sm:px-6 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 shrink-0">
      {/* App Logo & Name */}
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="BalanceFlow" className="h-8 w-8 object-contain" />
        <div>
          <p className="font-serif font-bold text-gray-900 dark:text-white text-[15px] leading-none tracking-wide">BalanceFlow</p>
          <p className="text-gray-400 dark:text-gray-500 text-[9px] font-semibold tracking-widest uppercase mt-0.5 hidden sm:block">Financial Zen</p>
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
