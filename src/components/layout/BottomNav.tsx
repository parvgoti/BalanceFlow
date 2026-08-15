import { NavLink, useLocation } from 'react-router-dom'
import { Home, Users, Activity, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/',         label: 'Home',     icon: Home },
  { to: '/groups',   label: 'Groups',   icon: Users },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/settings', label: 'More',     icon: MoreHorizontal },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      <div className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-around h-14 px-2 max-w-lg mx-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const isActive = to === '/' 
              ? location.pathname === '/' 
              : location.pathname.startsWith(to)

            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center gap-0.5 min-w-[56px]"
              >
                <Icon
                  className={cn(
                    'h-5 w-5 transition-colors duration-150',
                    isActive
                      ? 'text-brand'
                      : 'text-gray-400 dark:text-gray-500'
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={cn(
                    'text-[10px] font-semibold transition-colors duration-150',
                    isActive
                      ? 'text-brand'
                      : 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  {label}
                </span>
              </NavLink>
            )
          })}
        </div>
        {/* Safe area spacer for notched devices */}
        <div className="bg-white dark:bg-gray-950 h-[env(safe-area-inset-bottom)]" />
      </div>
    </nav>
  )
}
