import { useState } from 'react'
import { X, Plus, Users, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserSearchInput } from '@/components/ui/UserSearchInput'
import { useUIStore } from '@/store/uiStore'
import { useAddMembers } from '@/hooks/useGroups'

export function AddMemberModal() {
  const { activeModal, closeModal, modalContext } = useUIStore()
  const groupId = modalContext.groupId as string | undefined

  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [memberMeta, setMemberMeta] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  const addMembers = useAddMembers(groupId ?? '')

  if (activeModal !== 'add-member' || !groupId) return null

  const handleAddInvite = (email: string, displayName?: string) => {
    const normalised = email.trim().toLowerCase()
    if (!normalised || selectedEmails.includes(normalised)) return
    setSelectedEmails(prev => [...prev, normalised])
    if (displayName) {
      setMemberMeta(prev => ({ ...prev, [normalised]: displayName }))
    }
  }

  const handleRemoveInvite = (email: string) => {
    setSelectedEmails(prev => prev.filter(e => e !== email))
    setMemberMeta(prev => {
      const newMeta = { ...prev }
      delete newMeta[email]
      return newMeta
    })
  }

  const handleAddSubmit = async () => {
    if (selectedEmails.length === 0) return
    setSubmitError(null)
    try {
      await addMembers.mutateAsync(selectedEmails)
      closeModal()
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to add members.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm sm:p-4">
      <div 
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom flex flex-col max-h-[90dvh]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-extrabold text-navy dark:text-white leading-tight">Add Members</h2>
              <p className="text-[13px] text-gray-500 font-medium">Invite friends to your group</p>
            </div>
          </div>
          <button 
            onClick={closeModal}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="space-y-4">
            <UserSearchInput
              selectedEmails={selectedEmails}
              onAdd={(email: string, name?: string) => handleAddInvite(email, name)}
            />

            {selectedEmails.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Selected to invite</p>
                <div className="flex flex-wrap gap-2">
                  {selectedEmails.map(email => (
                    <span key={email} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold border border-emerald-100 dark:border-emerald-800/50 transition-all">
                      {memberMeta[email] || email}
                      <button
                        onClick={() => handleRemoveInvite(email)}
                        className="p-0.5 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-full transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {submitError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-sm border border-red-100 dark:border-red-900/30">
                {submitError}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <Button 
            className="w-full h-12 text-[15px] font-bold rounded-2xl shadow-sm"
            onClick={handleAddSubmit}
            disabled={selectedEmails.length === 0 || addMembers.isPending}
            loading={addMembers.isPending}
          >
            Send Invites
          </Button>
        </div>
      </div>
    </div>
  )
}
