import { IconFolder, IconAdd, IconDelete } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRepositories, useDeleteRepository } from '@/services/repositories'
import { CreateRepositoryPanel } from '@/components/create-repository-panel'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ErrorAlert } from '@/components/ui/error-alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/page-header'
import { ConnectionStatusBadge } from '@/components/ui/connection-status-badge'
import { useDeleteHandler } from '@/hooks/useDeleteHandler'
import { useState } from 'react'
import type { Repository } from '@/types/api'

export function RepositoriesPage() {
  const { data, isLoading, error, refetch } = useRepositories()
  const deleteMutation = useDeleteRepository()
  const [showCreatePanel, setShowCreatePanel] = useState(false)

  const deleteHandler = useDeleteHandler<Repository>({
    deleteFn: deleteMutation.mutateAsync,
    resourceType: 'Repository',
    getId: (repo) => repo.repo,
    getDisplayName: (repo) => repo.name || repo.repo,
    onSuccess: () => refetch(),
    isDeleting: deleteMutation.isPending,
  })

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Repositories"
        description="Connect and manage Git, Helm, and OCI repositories"
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        action={{
          label: 'Connect Repository',
          onClick: () => setShowCreatePanel(true),
          icon: IconAdd,
        }}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-4">
          {/* Loading State */}
          {isLoading && (
            <LoadingSpinner message="Loading repositories..." />
          )}

          {/* Error State */}
          {error && (
            <ErrorAlert
              error={error}
              onRetry={() => refetch()}
              title="Failed to load repositories"
              icon="close"
              size="sm"
            />
          )}

          {/* Repositories List */}
          {!isLoading && !error && data?.items && data.items.length > 0 && (
            <div className="space-y-2">
              {data.items.map((repo) => (
                <div
                  key={repo.repo}
                  className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded bg-white dark:bg-black flex items-center justify-center">
                          <IconFolder size={16} className="text-black dark:text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-medium text-sm text-black dark:text-white">{repo.name || repo.repo}</h3>
                            <Badge variant={repo.type === 'git' ? 'secondary' : repo.type === 'helm' ? 'default' : 'destructive'}>
                              {repo.type || 'git'}
                            </Badge>
                            <ConnectionStatusBadge status={repo.connectionState?.status} />
                          </div>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono truncate max-w-2xl">
                            {repo.repo}
                          </p>
                        </div>
                      </div>

                      {/* Connection Details */}
                      {repo.connectionState?.message && (
                        <div className="pl-10 text-xs text-neutral-600 dark:text-neutral-400">
                          {repo.connectionState.message}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteHandler.handleDeleteClick(repo)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <IconDelete size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && (!data?.items || data.items.length === 0) && (
            <EmptyState
              icon={IconFolder}
              title="No repositories yet"
              description="Connect your first Git, Helm, or OCI repository to get started"
              action={{
                label: 'Connect Repository',
                onClick: () => setShowCreatePanel(true),
                icon: IconAdd,
              }}
            />
          )}
        </div>
      </div>

      {/* Create Repository Panel */}
      <CreateRepositoryPanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        onSuccess={() => refetch()}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteHandler.dialogOpen}
        onOpenChange={deleteHandler.setDialogOpen}
        title="Delete Repository"
        description={`Are you sure you want to delete the repository "${deleteHandler.resourceToDelete?.name || deleteHandler.resourceToDelete?.repo}"? This action cannot be undone and may affect deployed applications.`}
        confirmText="Delete"
        resourceName={deleteHandler.resourceToDelete?.name || deleteHandler.resourceToDelete?.repo || ''}
        resourceType="repository"
        onConfirm={deleteHandler.handleDeleteConfirm}
        isLoading={deleteHandler.isDeleting}
      />
    </div>
  )
}
