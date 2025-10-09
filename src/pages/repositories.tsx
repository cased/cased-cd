import { IconFolder, IconAdd, IconDelete, IconCircleCheck, IconCircleClose, IconCircleForward } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRepositories, useDeleteRepository } from '@/services/repositories'
import { CreateRepositoryPanel } from '@/components/create-repository-panel'
import { useState } from 'react'

export function RepositoriesPage() {
  const { data, isLoading, error, refetch } = useRepositories()
  const deleteMutation = useDeleteRepository()
  const [showCreatePanel, setShowCreatePanel] = useState(false)

  const handleDelete = async (url: string, name: string, project?: string) => {
    if (confirm(`Are you sure you want to delete repository "${name || url}"?`)) {
      try {
        await deleteMutation.mutateAsync({ url, project })
        refetch()
      } catch (error) {
        console.error('Delete failed:', error)
        alert(`Failed to delete repository: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold text-black dark:text-white tracking-tight">Repositories</h1>
              <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                Connect and manage Git, Helm, and OCI repositories
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <IconCircleForward size={16} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </Button>
              <Button variant="default" className="gap-1" onClick={() => setShowCreatePanel(true)}>
                <IconAdd size={16} />
                Connect Repository
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-4">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <IconCircleForward size={24} className="animate-spin text-neutral-400 mx-auto mb-2" />
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Loading repositories...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded border border-red-500/20 bg-red-500/10 p-3">
              <div className="flex items-start gap-2">
                <IconCircleClose size={16} className="text-red-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-sm text-red-400 mb-0.5">Failed to load repositories</h3>
                  <p className="text-xs text-red-400/80 mb-2">
                    {error instanceof Error ? error.message : 'Unable to connect to ArgoCD API'}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
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
                            {repo.connectionState?.status && (
                              <Badge variant="outline" className="gap-1.5">
                                {repo.connectionState.status === 'Successful' ? (
                                  <IconCircleCheck size={12} className="text-grass-11" />
                                ) : (
                                  <IconCircleClose size={12} className="text-red-400" />
                                )}
                                {repo.connectionState.status}
                              </Badge>
                            )}
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
                      onClick={() => handleDelete(repo.repo, repo.name || '', repo.project)}
                      disabled={deleteMutation.isPending}
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
            <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-center">
              <div className="max-w-md mx-auto">
                <div className="h-9 w-9 rounded bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-2">
                  <IconFolder size={24} className="text-neutral-400" />
                </div>
                <h3 className="font-medium text-sm text-black dark:text-white mb-1">No repositories yet</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
                  Connect your first Git, Helm, or OCI repository to get started
                </p>
                <Button variant="default" onClick={() => setShowCreatePanel(true)}>
                  <IconAdd size={16} />
                  Connect Repository
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Repository Panel */}
      <CreateRepositoryPanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
