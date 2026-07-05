import { useState, useRef, useEffect } from 'react'
import { Bell, Check, X, Clock } from 'lucide-react'
import { useMyRequests, useAcceptRequest, useDeclineRequest } from '@/hooks/useGroupRequests'
import { usePendingSettlementRequests, useApproveSettlementRequest, useDeclineSettlementRequest } from '@/hooks/useSettlementRequests'
import { cn, formatCurrency } from '@/lib/utils'

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const { data: requests = [] } = useMyRequests()
  const acceptRequest = useAcceptRequest()
  const declineRequest = useDeclineRequest()

  const { data: settlementRequests = [] } = usePendingSettlementRequests()
  const approveSettlement = useApproveSettlementRequest()
  const declineSettlement = useDeclineSettlementRequest()

  const totalCount = requests.length + settlementRequests.length

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {totalCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-brand ring-2 ring-white dark:ring-gray-950" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</h3>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
            {totalCount === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No new notifications
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white leading-snug">
                        <span className="font-medium">
                          {Array.isArray(req.invited_by_profile) 
                            ? req.invited_by_profile[0]?.full_name 
                            : (req.invited_by_profile as any)?.full_name || 'Someone'}
                        </span> invited you to join <span className="font-medium">
                          {Array.isArray(req.groups)
                            ? req.groups[0]?.name
                            : (req.groups as any)?.name}
                        </span>
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => acceptRequest.mutate(req.id)}
                          disabled={acceptRequest.isPending}
                          className="flex-1 inline-flex justify-center items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand text-white hover:bg-brand-light transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          Accept
                        </button>
                        <button
                          onClick={() => declineRequest.mutate(req.id)}
                          disabled={declineRequest.isPending}
                          className="flex-1 inline-flex justify-center items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <X className="h-3 w-3" />
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            {settlementRequests.map((req) => (
                <div key={req.id} className="p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white leading-snug">
                        <span className="font-medium">
                          {req.requester?.full_name || 'Someone'}
                        </span> has requested confirmation for a settlement of <span className="font-medium">
                          {formatCurrency(req.amount)}
                        </span> via {req.payment_method}.
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => approveSettlement.mutate(req)}
                          disabled={approveSettlement.isPending}
                          className="flex-1 inline-flex justify-center items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand text-white hover:bg-brand-light transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          Approve
                        </button>
                        <button
                          onClick={() => declineSettlement.mutate(req.id)}
                          disabled={declineSettlement.isPending}
                          className="flex-1 inline-flex justify-center items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <X className="h-3 w-3" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
