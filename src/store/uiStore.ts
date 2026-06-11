import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'
type ActiveModal =
  | 'add-expense'
  | 'create-group'
  | 'settle-up'
  | 'add-member'
  | 'edit-expense'
  | null

interface UIState {
  theme: Theme
  sidebarOpen: boolean
  activeModal: ActiveModal
  modalContext: Record<string, unknown>
  isGlobalLoading: boolean

  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  openModal: (modal: ActiveModal, context?: Record<string, unknown>) => void
  closeModal: () => void
  setGlobalLoading: (loading: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: true,
      activeModal: null,
      modalContext: {},
      isGlobalLoading: false,

      setTheme: (theme) => {
        set({ theme })
        const root = document.documentElement
        if (theme === 'dark') {
          root.classList.add('dark')
        } else if (theme === 'light') {
          root.classList.remove('dark')
        } else {
          // system
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.classList.toggle('dark', isDark)
        }
      },

      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

      openModal: (activeModal, context = {}) => set({ activeModal, modalContext: context }),
      closeModal: () => set({ activeModal: null, modalContext: {} }),

      setGlobalLoading: (isGlobalLoading) => set({ isGlobalLoading }),
    }),
    {
      name: 'balanceflow-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme, sidebarOpen: state.sidebarOpen }),
    }
  )
)
