import { IconServer, IconAdd, IconDelete } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { useClusters, useDeleteCluster } from '@/services/clusters'
import { CreateClusterPanel } from '@/components/create-cluster-panel'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ErrorAlert } from '@/components/ui/error-alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/page-header'
import { ConnectionStatusBadge } from '@/components/ui/connection-status-badge'
import { useDeleteHandler } from '@/hooks/useDeleteHandler'
import { useState } from 'react'
import type { Cluster } from '@/types/api'

export function ClustersPage() {
  const { data, isLoading, error, refetch } = useClusters()
  const deleteMutation = useDeleteCluster()
  const [showCreatePanel, setShowCreatePanel] = useState(false)

  const deleteHandler = useDeleteHandler<Cluster>({
    deleteFn: deleteMutation.mutateAsync,
    resourceType: 'Cluster',
    getId: (cluster) => cluster.server,
    getDisplayName: (cluster) => cluster.name,
    onSuccess: () => refetch(),
    isDeleting: deleteMutation.isPending,
  })

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Clusters"
        description="Manage Kubernetes cluster connections"
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        action={{
          label: 'Add Cluster',
          onClick: () => setShowCreatePanel(true),
          icon: IconAdd,
        }}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-4">
          {/* Loading State */}
          {isLoading && (
            <LoadingSpinner message="Loading clusters..." />
          )}

          {/* Error State */}
          {error && (
            <ErrorAlert
              error={error}
              onRetry={() => refetch()}
              title="Failed to load clusters"
              icon="close"
              size="sm"
            />
          )}

          {/* Clusters Grid */}
          {!isLoading && !error && data?.items && data.items.length > 0 && (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {data.items.map((cluster) => (
                <div
                  key={cluster.server}
                  className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2 flex-1">
                      <div className="h-8 w-8 rounded bg-white dark:bg-black flex items-center justify-center shrink-0">
                        <IconServer size={16} className="text-black dark:text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-black dark:text-white truncate mb-0.5">{cluster.name}</h3>
                        <ConnectionStatusBadge status={cluster.connectionState?.status} className="mb-1" />
                      </div>
                    </div>
                  </div>

                  {/* Server URL */}
                  <div className="mb-2">
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-600 mb-0.5">Server</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono truncate">
                      {cluster.server}
                    </p>
                  </div>

                  {/* Cluster Info */}
                  {cluster.info && (
                    <div className="space-y-1 mb-2">
                      {cluster.info.serverVersion && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-500 dark:text-neutral-600">Version</span>
                          <span className="text-neutral-600 dark:text-neutral-400 font-mono">{cluster.info.serverVersion}</span>
                        </div>
                      )}
                      {cluster.info.applicationsCount !== undefined && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-500 dark:text-neutral-600">Applications</span>
                          <span className="text-neutral-600 dark:text-neutral-400">{cluster.info.applicationsCount}</span>
                        </div>
                      )}
                      {cluster.info.cacheInfo?.resourcesCount !== undefined && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-500 dark:text-neutral-600">Resources</span>
                          <span className="text-neutral-600 dark:text-neutral-400">{cluster.info.cacheInfo.resourcesCount}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteHandler.handleDeleteClick(cluster)}
                      className="w-full text-red-400 hover:text-red-300"
                    >
                      <IconDelete size={16} />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && (!data?.items || data.items.length === 0) && (
            <EmptyState
              icon={IconServer}
              title="No clusters yet"
              description="Add your first Kubernetes cluster to start deploying applications"
              action={{
                label: 'Add Cluster',
                onClick: () => setShowCreatePanel(true),
                icon: IconAdd,
              }}
            />
          )}
        </div>
      </div>

      {/* Create Cluster Panel */}
      <CreateClusterPanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        onSuccess={() => refetch()}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteHandler.dialogOpen}
        onOpenChange={deleteHandler.setDialogOpen}
        title="Delete Cluster"
        description={`Are you sure you want to delete the cluster "${deleteHandler.resourceToDelete?.name}"? This action cannot be undone and may affect deployed applications.`}
        confirmText="Delete"
        resourceName={deleteHandler.resourceToDelete?.name || ''}
        resourceType="cluster"
        onConfirm={deleteHandler.handleDeleteConfirm}
        isLoading={deleteHandler.isDeleting}
      />
    </div>
  )
}
