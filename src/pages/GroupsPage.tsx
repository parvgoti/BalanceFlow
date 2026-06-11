import { Plus } from 'lucide-react'
import { useGroups } from '@/hooks/useGroups'
import { GroupCard } from '@/components/groups/GroupCard'
import { Button } from '@/components/ui/button'
import { GroupGridSkeleton } from '@/components/shared/Skeleton'
import { EmptyState } from '@/components/shared/CategoryIcon'
import { useUIStore } from '@/store/uiStore'

export function GroupsPage() {
  const { data: groups, isLoading } = useGroups()
  const { openModal } = useUIStore()

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Groups</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your expense-sharing groups
          </p>
        </div>
        <Button
          id="create-group-btn-top"
          onClick={() => openModal('create-group')}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Group
        </Button>
      </div>

      {isLoading ? (
        <GroupGridSkeleton />
      ) : !groups?.length ? (
        <EmptyState
          icon="👥"
          title="No groups yet"
          description="Create a group to start splitting expenses with friends, family, or teammates."
          action={
            <Button onClick={() => openModal('create-group')}>
              <Plus className="h-4 w-4" />
              Create First Group
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map(group => group && (
            <GroupCard
              key={group.id}
              group={group as any}
            />
          ))}
        </div>
      )}
    </div>
  )
}
