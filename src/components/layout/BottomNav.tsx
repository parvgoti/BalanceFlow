import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Activity, BarChart3, Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { to: '/groups',   label: 'Groups',    icon: Users },
  { to: '/activity', label: 'Activity',  icon: Activity },
  { to: '/settings', label: 'Settings',  icon: BarChart3 },
]

export function BottomNav() {
  const location = useLocation()

  // Hide bottom nav on group detail pages (they have their own navigation)
  if (location.pathname.match(/^\/groups\/.+/)) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      {/* Glass background */}
      <div className="bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-t border-gray-200/60 dark:border-white/[0.06] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const isActive = to === '/' 
              ? location.pathname === '/' 
              : location.pathname.startsWith(to)

            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center gap-0.5 min-w-[56px] group"
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-8 rounded-2xl transition-all duration-200',
                    isActive
                      ? 'bg-brand/10 dark:bg-brand/20'
                      : 'group-hover:bg-gray-100 dark:group-hover:bg-gray-800'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-colors duration-200',
                      isActive
                        ? 'text-brand dark:text-brand-light'
                        : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                    )}
                  />
                </div>
                <span
                  className={cn(
                    'text-[10px] font-semibold transition-colors duration-200',
                    isActive
                      ? 'text-brand dark:text-brand-light'
                      : 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  {label}
                </span>
              </NavLink>
            )
          })}
        </div>
      </div>
      {/* Safe area spacer for notched devices */}
      <div className="bg-white/90 dark:bg-gray-950/90 h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
