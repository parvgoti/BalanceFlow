import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Loader2, UserPlus } from 'lucide-react'
import { useUserSearch } from '@/hooks/useUserSearch'
import type { UserSearchResult } from '@/hooks/useUserSearch'

interface UserSearchInputProps {
  /** Called when a user is selected or a raw email is confirmed */
  onAdd: (email: string, displayName?: string) => void
  /** Emails already added — used to grey-out already-selected users */
  selectedEmails: string[]
  placeholder?: string
}

export function UserSearchInput({
  onAdd,
  selectedEmails,
  placeholder = 'Search by name or email…',
}: UserSearchInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounced query — we send the live value; React Query + staleTime handles caching
  const { data: results = [], isFetching } = useUserSearch(inputValue)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleSelect = useCallback(
    (user: UserSearchResult) => {
      if (selectedEmails.includes(user.email)) return
      onAdd(user.email, user.full_name)
      setInputValue('')
      setOpen(false)
    },
    [onAdd, selectedEmails]
  )

  // Allow typing a raw email and pressing Enter as a fallback
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const raw = inputValue.trim().toLowerCase()
      if (raw.includes('@') && !selectedEmails.includes(raw)) {
        onAdd(raw)
        setInputValue('')
        setOpen(false)
      }
    }
    if (e.key === 'Escape') setOpen(false)
  }

  const showDropdown = open && inputValue.trim().length >= 2

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          id="group-member-search-input"
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value)
            setOpen(true)
          }}
          onFocus={() => inputValue.trim().length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full h-11 pl-9 pr-10 rounded-xl border border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-900 text-sm
            focus:outline-none focus:ring-2 focus:ring-primary-500
            transition-shadow placeholder:text-gray-400"
        />
        {isFetching && (
          <Loader2 className="absolute right-3 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-900 shadow-lg overflow-hidden animate-fade-in">
          {results.length === 0 && !isFetching && (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span>
                No user found.{' '}
                {inputValue.includes('@') && (
                  <button
                    type="button"
                    className="text-brand font-medium underline"
                    onClick={() => {
                      const raw = inputValue.trim().toLowerCase()
                      if (raw && !selectedEmails.includes(raw)) {
                        onAdd(raw)
                        setInputValue('')
                        setOpen(false)
                      }
                    }}
                  >
                    Add "{inputValue}" anyway
                  </button>
                )}
              </span>
            </div>
          )}

          {results.map(user => {
            const alreadyAdded = selectedEmails.includes(user.email)
            return (
              <button
                key={user.id}
                type="button"
                disabled={alreadyAdded}
                onClick={() => handleSelect(user)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                  ${alreadyAdded
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'}`}
              >
                {/* Avatar circle with initials */}
                <div className="h-8 w-8 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-brand">
                    {user.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                {alreadyAdded && (
                  <span className="text-xs text-brand font-medium shrink-0">Added</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
