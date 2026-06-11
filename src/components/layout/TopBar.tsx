import { Bell, Sun, Moon } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useNotificationStore } from '@/store/notificationStore'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title?: string
}

export function TopBar({ title }: TopBarProps) {
  const { toggleSidebar, theme, setTheme } = useUIStore()
  const { unreadCount } = useNotificationStore()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="h-16 flex items-center gap-4 px-6 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 shrink-0">
      {/* App Logo & Name */}
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="BalanceFlow" className="h-8 w-8 rounded-lg object-cover" />
        <div className="hidden sm:block">
          <p className="font-bold text-gray-900 dark:text-white text-sm leading-none">BalanceFlow</p>
          <p className="text-gray-500 text-xs mt-0.5">Financial Zen</p>
        </div>
      </div>

      {title && (
        <h1 className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block">
          {title}
        </h1>
      )}

      <div className="flex-1" />

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      {/* Notifications */}
      <button
        id="topbar-notifications-btn"
        className="relative text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className={cn(
            'absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-2xs',
            'flex items-center justify-center font-bold animate-pulse-subtle'
          )}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </header>
  )
}
