import { IconFolder, IconAdd, IconDelete, IconCircleForward } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useProjects, useDeleteProject } from '@/services/projects'
import { CreateProjectPanel } from '@/components/create-project-panel'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { useState } from 'react'

export function ProjectsPage() {
  const { data, isLoading, error, refetch } = useProjects()
  const deleteMutation = useDeleteProject()
  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<{ name: string } | null>(null)

  const handleDeleteClick = (name: string) => {
    setProjectToDelete({ name })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return

    try {
      await deleteMutation.mutateAsync(projectToDelete.name)
      toast.success('Project deleted', {
        description: `Successfully deleted project "${projectToDelete.name}"`,
      })
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
      refetch()
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Failed to delete project', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold text-black dark:text-white tracking-tight">Projects</h1>
              <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                Organize applications and control access with project-level permissions
              </p>
            </div>
            <div className="flex gap-2">
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
                Create Project
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
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Loading projects...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded border border-red-500/20 bg-red-500/10 p-3">
              <div className="flex items-start gap-2">
                <div>
                  <h3 className="font-medium text-sm text-red-400 mb-0.5">Failed to load projects</h3>
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

          {/* Projects List */}
          {!isLoading && !error && data?.items && data.items.length > 0 && (
            <div className="space-y-2">
              {data.items.map((project) => {
                const isDefaultProject = project.metadata.name === 'default'
                const sourceReposCount = project.spec.sourceRepos?.length || 0
                const destinationsCount = project.spec.destinations?.length || 0
                const rolesCount = project.spec.roles?.length || 0

                return (
                  <div
                    key={project.metadata.name}
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
                              <h3 className="font-medium text-sm text-black dark:text-white">
                                {project.metadata.name}
                              </h3>
                              {isDefaultProject && (
                                <Badge variant="secondary">Default</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
                              {sourceReposCount === 0 ? (
                                <span>All sources</span>
                              ) : (
                                <span>{sourceReposCount} source{sourceReposCount !== 1 ? 's' : ''}</span>
                              )}
                              <span>•</span>
                              {destinationsCount === 0 ? (
                                <span>All destinations</span>
                              ) : (
                                <span>{destinationsCount} destination{destinationsCount !== 1 ? 's' : ''}</span>
                              )}
                              {rolesCount > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{rolesCount} role{rolesCount !== 1 ? 's' : ''}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="pl-10 space-y-1.5">
                          {/* Source Repos */}
                          {sourceReposCount > 0 && sourceReposCount <= 3 && (
                            <div className="text-xs">
                              <span className="text-neutral-500 dark:text-neutral-500">Sources:</span>{' '}
                              <span className="text-neutral-600 dark:text-neutral-400 font-mono">
                                {project.spec.sourceRepos?.join(', ')}
                              </span>
                            </div>
                          )}
                          {sourceReposCount > 3 && (
                            <div className="text-xs">
                              <span className="text-neutral-500 dark:text-neutral-500">Sources:</span>{' '}
                              <span className="text-neutral-600 dark:text-neutral-400 font-mono">
                                {project.spec.sourceRepos?.slice(0, 2).join(', ')} and {sourceReposCount - 2} more
                              </span>
                            </div>
                          )}

                          {/* Destinations */}
                          {destinationsCount > 0 && destinationsCount <= 3 && (
                            <div className="text-xs">
                              <span className="text-neutral-500 dark:text-neutral-500">Destinations:</span>{' '}
                              <span className="text-neutral-600 dark:text-neutral-400">
                                {project.spec.destinations?.map(d =>
                                  `${d.name || d.server}${d.namespace ? `/${d.namespace}` : ''}`
                                ).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {!isDefaultProject && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(project.metadata.name)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <IconDelete size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && (!data?.items || data.items.length === 0) && (
            <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-center">
              <div className="max-w-md mx-auto">
                <div className="h-9 w-9 rounded bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-2">
                  <IconFolder size={24} className="text-neutral-400" />
                </div>
                <h3 className="font-medium text-sm text-black dark:text-white mb-1">No projects yet</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
                  Create your first project to organize applications and control access
                </p>
                <Button variant="default" onClick={() => setShowCreatePanel(true)}>
                  <IconAdd size={16} />
                  Create Project
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Project Panel */}
      <CreateProjectPanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        onSuccess={() => refetch()}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Project"
        description={`Are you sure you want to delete the project "${projectToDelete?.name}"? This action cannot be undone and may affect applications in this project.`}
        confirmText="Delete"
        resourceName={projectToDelete?.name || ''}
        resourceType="project"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
