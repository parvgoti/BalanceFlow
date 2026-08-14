import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useGroups } from '@/hooks/useGroups'
import { GroupCard } from '@/components/groups/GroupCard'
import { Button } from '@/components/ui/button'
import { GroupGridSkeleton } from '@/components/shared/Skeleton'
import { EmptyState } from '@/components/shared/CategoryIcon'
import { useUIStore } from '@/store/uiStore'

export function GroupsPage() {
  const { data: groups, isLoading } = useGroups()
  const { openModal } = useUIStore()
  const [search, setSearch] = useState('')

  const filtered = (groups ?? []).filter((g: any) =>
    g?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-white">Groups</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage your expense-sharing groups
          </p>
        </div>
        <Button
          id="create-group-btn-top"
          onClick={() => openModal('create-group')}
          size="sm"
          className="gap-1.5 rounded-full px-4"
        >
          <Plus className="h-3.5 w-3.5" />
          New Group
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search groups..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand placeholder:text-gray-400"
        />
      </div>

      {/* Group list */}
      {isLoading ? (
        <GroupGridSkeleton />
      ) : filtered.length === 0 ? (
        search ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No groups matching "{search}"</p>
          </div>
        ) : (
          <EmptyState
            icon="👥"
            title="No groups yet"
            description="Create a group to start splitting expenses with friends, family, or teammates."
            action={
              <Button onClick={() => openModal('create-group')} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Create First Group
              </Button>
            }
          />
        )
      ) : (
        <div className="space-y-3">
          {filtered.map((group: any) => group && (
            <GroupCard
              key={group.id}
              group={group}
            />
          ))}
        </div>
      )}
    </div>
  )
}
