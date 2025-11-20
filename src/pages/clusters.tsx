import { IconServer, IconAdd, IconDelete, IconCircleCheck, IconCircleClose, IconCircleForward, IconOptionsHorizontal } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useClusters, useDeleteCluster } from '@/services/clusters'
import { CreateClusterPanel } from '@/components/create-cluster-panel'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ErrorAlert } from '@/components/ui/error-alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { PageContent } from '@/components/ui/page-content'
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
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <IconCircleForward size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
            <Button
              variant="default"
              onClick={() => setShowCreatePanel(true)}
            >
              <IconAdd size={16} />
              Add Cluster
            </Button>
          </>
        }
      />

      {/* Content */}
      <PageContent>
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
              <Card
                key={cluster.server}
                className="bg-transparent transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <CardHeader className="px-4 py-2 border-b border-border">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <CardTitle className="text-sm font-medium truncate leading-none">
                        {cluster.name}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {cluster.connectionState?.status && (
                        <Badge variant="outline" className="gap-1.5 h-6">
                          {cluster.connectionState.status === 'Successful' ? (
                            <IconCircleCheck size={12} className="text-grass-11" />
                          ) : (
                            <IconCircleClose size={12} className="text-red-400" />
                          )}
                          {cluster.connectionState.status}
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <IconOptionsHorizontal size={16} />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => deleteHandler.handleDeleteClick(cluster)}
                            className="text-destructive focus:text-destructive"
                          >
                            <IconDelete size={16} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4">
                  {/* Server URL */}
                  <div className="flex mb-2">
                    <p className="text-sm text-muted-foreground mb-0.5 w-24">Server</p>
                    <p className="text-sm text-foreground font-mono truncate">
                      {cluster.server}
                    </p>
                  </div>

                  {/* Cluster Info */}
                  {cluster.info && (
                    <div className="space-y-2">
                      {cluster.info.serverVersion && (
                        <div className="flex">
                          <p className="text-sm text-muted-foreground w-24">Version</p>
                          <p className="text-sm text-foreground font-mono truncate">
                            {cluster.info.serverVersion}
                          </p>
                        </div>
                      )}
                      {cluster.info.applicationsCount !== undefined && (
                        <div className="flex items-center">
                          <p className="text-sm text-muted-foreground w-24">Applications</p>
                          <p className="text-sm text-foreground font-mono truncate">
                            {cluster.info.applicationsCount}
                          </p>
                        </div>
                      )}
                      {cluster.info.cacheInfo?.resourcesCount !== undefined && (
                        <div className="flex items-center">
                          <p className="text-sm text-muted-foreground w-24">Resources</p>
                          <p className="text-sm text-foreground truncate">
                            {cluster.info.cacheInfo.resourcesCount}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
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
      </PageContent>

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
