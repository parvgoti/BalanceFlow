import { Sun, Moon, Menu } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { NotificationsDropdown } from './NotificationsDropdown'

interface TopBarProps {
  title?: string
}

export function TopBar({ title }: TopBarProps) {
  const { setSidebarOpen, theme, setTheme } = useUIStore()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="h-16 flex items-center gap-4 px-4 sm:px-6 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 shrink-0">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

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

      <NotificationsDropdown />
    </header>
  )
}
