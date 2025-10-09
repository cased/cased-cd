import { IconFolder as FolderGit2, IconAdd as Plus, IconDelete as Trash2, IconCircleCheck as CheckCircle2, IconCircleClose as XCircle, IconRotate as RefreshCw } from 'obra-icons-react'
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
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight">Repositories</h1>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
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
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="primary" className="gap-2" onClick={() => setShowCreatePanel(true)}>
                <Plus className="h-4 w-4" />
                Connect Repository
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
                <p className="text-neutral-600 dark:text-neutral-400">Loading repositories...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-400 mb-1">Failed to load repositories</h3>
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

          {/* Repositories List */}
          {!isLoading && !error && data?.items && data.items.length > 0 && (
            <div className="space-y-3">
              {data.items.map((repo) => (
                <div
                  key={repo.repo}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-md bg-white dark:bg-black flex items-center justify-center">
                          <FolderGit2 className="h-5 w-5 text-black dark:text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-black dark:text-white">{repo.name || repo.repo}</h3>
                            <Badge variant={repo.type === 'git' ? 'info' : repo.type === 'helm' ? 'success' : 'warning'}>
                              {repo.type || 'git'}
                            </Badge>
                            {repo.connectionState?.status && (
                              <Badge variant={repo.connectionState.status === 'Successful' ? 'success' : 'warning'}>
                                {repo.connectionState.status === 'Successful' ? (
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                ) : (
                                  <XCircle className="h-3 w-3 mr-1" />
                                )}
                                {repo.connectionState.status}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 font-mono truncate max-w-2xl">
                            {repo.repo}
                          </p>
                        </div>
                      </div>

                      {/* Connection Details */}
                      {repo.connectionState?.message && (
                        <div className="pl-13 text-sm text-neutral-600 dark:text-neutral-400">
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
                      <Trash2 className="h-4 w-4" />
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
                  <FolderGit2 className="h-8 w-8 text-neutral-400" />
                </div>
                <h3 className="font-medium text-black dark:text-white mb-2">No repositories yet</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                  Connect your first Git, Helm, or OCI repository to get started
                </p>
                <Button variant="primary" onClick={() => setShowCreatePanel(true)}>
                  <Plus className="h-4 w-4 mr-2" />
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
