import { Sun, Moon, Menu } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { NotificationsDropdown } from './NotificationsDropdown'
import { UserAvatar } from '@/components/ui/avatar'
import { useAuthStore } from '@/store/authStore'

interface TopBarProps {
  title?: string
}

export function TopBar({ title }: TopBarProps) {
  const { setSidebarOpen, theme, setTheme } = useUIStore()
  const { profile } = useAuthStore()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="h-16 flex items-center gap-4 px-4 sm:px-6 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/[0.05] shrink-0">
      {/* Mobile Menu Button — hidden on mobile since we have BottomNav, shown only for sidebar toggle on md */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="hidden lg:hidden md:inline-flex text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* App Logo & Name */}
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="BalanceFlow" className="h-8 w-8 object-contain" />
        <div>
          <p className="font-serif font-bold text-gray-900 dark:text-white text-[15px] leading-none tracking-wide">BalanceFlow</p>
          <p className="text-gray-400 dark:text-gray-500 text-[9px] font-semibold tracking-widest uppercase mt-0.5 hidden sm:block">Financial Zen</p>
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

      {/* Mobile avatar — shown only on small screens */}
      {profile && (
        <div className="lg:hidden">
          <UserAvatar
            name={profile.full_name}
            avatarUrl={profile.avatar_url}
            userId={profile.id}
            size="sm"
          />
        </div>
      )}
    </header>
  )
}
