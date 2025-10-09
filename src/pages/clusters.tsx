import { IconServer as Server, IconAdd as Plus, IconDelete as Trash2, IconCircleCheck as CheckCircle2, IconCircleClose as XCircle, IconRotate as RefreshCw } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useClusters, useDeleteCluster } from '@/services/clusters'
import { CreateClusterPanel } from '@/components/create-cluster-panel'
import { useState } from 'react'

export function ClustersPage() {
  const { data, isLoading, error, refetch } = useClusters()
  const deleteMutation = useDeleteCluster()
  const [showCreatePanel, setShowCreatePanel] = useState(false)

  const handleDelete = async (server: string, name: string) => {
    if (confirm(`Are you sure you want to delete cluster "${name}"?`)) {
      try {
        console.log('Deleting cluster with server:', server)
        await deleteMutation.mutateAsync(server)
        refetch()
      } catch (error: any) {
        console.error('Delete failed:', error)
        console.error('Error response:', error.response)
        alert(`Failed to delete cluster: ${error.response?.data?.message || error.message || 'Unknown error'}`)
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight">Clusters</h1>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Manage Kubernetes cluster connections
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="primary" className="gap-2" onClick={() => setShowCreatePanel(true)}>
                <Plus className="h-4 w-4" />
                Add Cluster
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-8">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600 dark:text-neutral-400">Loading clusters...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-400 mb-1">Failed to load clusters</h3>
                  <p className="text-sm text-red-400/80 mb-3">
                    {error instanceof Error ? error.message : 'Unable to connect to ArgoCD API'}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Clusters Grid */}
          {!isLoading && !error && data?.items && data.items.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.items.map((cluster) => (
                <div
                  key={cluster.server}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="h-10 w-10 rounded-md bg-white dark:bg-black flex items-center justify-center shrink-0">
                        <Server className="h-5 w-5 text-black dark:text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-black dark:text-white truncate mb-1">{cluster.name}</h3>
                        {cluster.connectionState?.status && (
                          <Badge variant={cluster.connectionState.status === 'Successful' ? 'success' : 'warning'} className="mb-2">
                            {cluster.connectionState.status === 'Successful' ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {cluster.connectionState.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Server URL */}
                  <div className="mb-4">
                    <p className="text-xs text-neutral-500 dark:text-neutral-600 mb-1">Server</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 font-mono truncate">
                      {cluster.server}
                    </p>
                  </div>

                  {/* Cluster Info */}
                  {cluster.info && (
                    <div className="space-y-2 mb-4">
                      {cluster.info.serverVersion && (
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500 dark:text-neutral-600">Version</span>
                          <span className="text-neutral-600 dark:text-neutral-400 font-mono">{cluster.info.serverVersion}</span>
                        </div>
                      )}
                      {cluster.info.applicationsCount !== undefined && (
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500 dark:text-neutral-600">Applications</span>
                          <span className="text-neutral-600 dark:text-neutral-400">{cluster.info.applicationsCount}</span>
                        </div>
                      )}
                      {cluster.info.cacheInfo?.resourcesCount !== undefined && (
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500 dark:text-neutral-600">Resources</span>
                          <span className="text-neutral-600 dark:text-neutral-400">{cluster.info.cacheInfo.resourcesCount}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(cluster.server, cluster.name)}
                      disabled={deleteMutation.isPending}
                      className="w-full text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && (!data?.items || data.items.length === 0) && (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="h-16 w-16 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-4">
                  <Server className="h-8 w-8 text-neutral-400" />
                </div>
                <h3 className="font-medium text-black dark:text-white mb-2">No clusters yet</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                  Add your first Kubernetes cluster to start deploying applications
                </p>
                <Button variant="primary" onClick={() => setShowCreatePanel(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cluster
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Cluster Panel */}
      <CreateClusterPanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
