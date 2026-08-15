import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { AddExpenseModal } from '@/components/expenses/AddExpenseModal'
import { CreateGroupModal } from '@/components/groups/CreateGroupModal'
import { DashboardSettleUpModal } from '@/components/settlements/DashboardSettleUpModal'
import { useUIStore } from '@/store/uiStore'
import { useRealtimeNotifications, useRealtimeApp } from '@/hooks/useRealtime'

export function AppLayout() {
  const { activeModal } = useUIStore()

  // Subscribe to realtime notifications + global app updates
  useRealtimeNotifications()
  useRealtimeApp()

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 overflow-hidden">
      {/* Sidebar — desktop only */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="sticky top-0 z-20">
          <TopBar />
        </div>
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 bg-white dark:bg-gray-950">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Global Modals */}
      {activeModal === 'add-expense' && <AddExpenseModal />}
      {activeModal === 'create-group' && <CreateGroupModal />}
      {activeModal === 'settle-up' && <DashboardSettleUpModal />}
    </div>
  )
}

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-subtle via-white to-mint-50 dark:from-gray-950 dark:via-gray-900 dark:to-brand-dark">
      <Outlet />
    </div>
  )
}
