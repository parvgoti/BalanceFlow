import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Activity, Settings,
  Plus, HelpCircle, LogOut, Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { NotificationBell } from '@/components/shared/NotificationBell'

const NAV_ITEMS = [
  { to: '/',        label: 'Dashboard', icon: LayoutDashboard },
  { to: '/groups',  label: 'Groups',    icon: Users },
  { to: '/activity',label: 'Activity',  icon: Activity },
  { to: '/settings',label: 'Settings',  icon: Settings },
]

export function Sidebar() {
  const { profile, signOut } = useAuthStore()
  const { sidebarOpen, setSidebarOpen, openModal } = useUIStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 dark:bg-black/40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-30 flex flex-col',
          'bg-white/10 dark:bg-white/[0.02] backdrop-blur-[30px] saturate-[1.5]',
          'shadow-[inset_1px_1px_2px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.1)]',
          'dark:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.1),_0_8px_32px_rgba(0,0,0,0.4)]',
          'border-r border-white/20 dark:border-white/[0.05]',
          'transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-[220px]' : 'w-[72px]',
          'lg:relative lg:translate-x-0',
          !sidebarOpen && '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Menu Toggle */}
        <div className={cn(
          "flex items-center h-16 shrink-0 border-b border-gray-200/50 dark:border-white/[0.05]",
          sidebarOpen ? "px-4 justify-between" : "justify-center"
        )}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors p-2 rounded-xl flex items-center justify-center shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Add Expense CTA */}
        <div className={cn("pt-4 pb-2 shrink-0", sidebarOpen ? "px-3" : "flex justify-center")}>
          <Button
            id="sidebar-add-expense-btn"
            onClick={() => openModal('add-expense')}
            className={cn(
              'bg-brand hover:bg-brand-light text-white font-semibold',
              'shadow-glow transition-all duration-200',
              sidebarOpen ? "w-full" : "w-10 h-10 rounded-xl p-0"
            )}
            size={sidebarOpen ? 'default' : 'icon'}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Add Expense</span>}
          </Button>
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 py-2 space-y-1 overflow-y-auto scrollbar-hide flex flex-col",
          sidebarOpen ? "px-3 items-stretch" : "items-center"
        )}>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'nav-item',
                  isActive && 'active',
                  !sidebarOpen && 'w-10 h-10 p-0 justify-center rounded-xl'
                )
              }
              title={!sidebarOpen ? label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className={cn(
          "pb-4 space-y-1 shrink-0 border-t border-gray-200/50 dark:border-white/[0.05] pt-3 flex flex-col",
          sidebarOpen ? "px-3" : "items-center"
        )}>
          <button
            className={cn('nav-item', sidebarOpen ? 'w-full' : 'w-10 h-10 p-0 justify-center rounded-xl')}
            title={!sidebarOpen ? 'Help Center' : undefined}
          >
            <HelpCircle className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>Help Center</span>}
          </button>

          {/* User profile */}
          {profile && (
            <div className={cn(
              'flex items-center gap-3 py-2 rounded-xl',
              'hover:bg-gray-100/50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors',
              sidebarOpen ? 'px-2' : 'justify-center w-10 h-10 p-0 mt-1'
            )}>
              <UserAvatar
                name={profile.full_name}
                avatarUrl={profile.avatar_url}
                userId={profile.id}
                size="sm"
              />
              {sidebarOpen && (
                <>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{profile.full_name}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{profile.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
