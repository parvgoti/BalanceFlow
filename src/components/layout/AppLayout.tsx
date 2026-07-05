import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { AddExpenseModal } from '@/components/expenses/AddExpenseModal'
import { CreateGroupModal } from '@/components/groups/CreateGroupModal'
import { useUIStore } from '@/store/uiStore'
import { useRealtimeNotifications, useRealtimeApp } from '@/hooks/useRealtime'

export function AppLayout() {
  const { activeModal } = useUIStore()

  // Subscribe to realtime notifications + global app updates
  useRealtimeNotifications()
  useRealtimeApp()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 z-20">
          <TopBar />
        </div>
        <main className="flex-1 overflow-y-auto pt-16">
          <Outlet />
        </main>
      </div>

      {/* Global Modals */}
      {activeModal === 'add-expense' && <AddExpenseModal />}
      {activeModal === 'create-group' && <CreateGroupModal />}
    </div>
  )
}

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-subtle via-white to-primary-50 dark:from-gray-950 dark:via-gray-900 dark:to-brand-dark">
      <Outlet />
    </div>
  )
}
