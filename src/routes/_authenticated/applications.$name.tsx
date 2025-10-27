import { createFileRoute, Outlet, useNavigate, useParams, useRouterState } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  IconCircleForward,
  IconDelete,
  IconCodeBranch,
  IconSettings,
  IconChevronRight,
  IconCircleCheckFill,
  IconChevronDown,
  IconBrandGithubFill
} from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { getHealthIcon } from '@/lib/status-icons'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn, formatRepoUrl } from '@/lib/utils'
import {
  useApplication,
  useApplications,
  useUpdateApplicationSpec,
  useSyncApplication,
  useDeleteApplication,
  useRefreshApplication,
} from '@/services/applications'
import { SyncProgressSheet } from '@/components/sync-progress-sheet'

export const Route = createFileRoute('/_authenticated/applications/$name')({
  component: ApplicationDetailLayout,
})

function ApplicationDetailLayout() {
  const { name } = useParams({ from: '/_authenticated/applications/$name' })
  const navigate = useNavigate()
  const router = useRouterState()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [syncProgressOpen, setSyncProgressOpen] = useState(false)
  const [comboboxOpen, setComboboxOpen] = useState(false)

  // Get current view from pathname
  const currentPath = router.location.pathname
  const currentView = currentPath.split('/').pop() || 'tree'

  const { data: app, isLoading, error, refetch } = useApplication(name || '', !!name)
  const { data: allApps } = useApplications()

  const syncMutation = useSyncApplication()
  const updateSpecMutation = useUpdateApplicationSpec()
  const deleteMutation = useDeleteApplication()
  const refreshMutation = useRefreshApplication()

  // Auto-open sync progress sheet when operation is running
  useEffect(() => {
    if (app?.status?.operationState?.phase === 'Running') {
      setSyncProgressOpen(true)
    }
  }, [app?.status?.operationState?.phase])

  const handleSync = async () => {
    if (!name) return
    try {
      setSyncProgressOpen(true)
      await syncMutation.mutateAsync({ name, prune: false, dryRun: false })
      toast.success('Application synced', {
        description: 'Sync initiated successfully',
      })
      refetch()
    } catch (error) {
      toast.error('Failed to sync application', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
      setSyncProgressOpen(false)
    }
  }

  const handleRefresh = async () => {
    if (!name) return
    try {
      await refreshMutation.mutateAsync(name)
      toast.success('Application refreshed', {
        description: 'Refresh initiated successfully',
      })
      refetch()
    } catch (error) {
      toast.error('Failed to refresh application', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const handleToggleAutoSync = async (checked: boolean) => {
    if (!name || !app) return
    try {
      await updateSpecMutation.mutateAsync({
        name,
        spec: {
          ...app.spec,
          syncPolicy: checked
            ? {
                ...app.spec.syncPolicy,
                automated: {
                  prune: false,
                  selfHeal: false,
                },
              }
            : {
                ...app.spec.syncPolicy,
                automated: undefined,
              },
        },
      })
      toast.success(checked ? 'Auto-sync enabled' : 'Auto-sync disabled', {
        description: checked
          ? 'Application will sync automatically on changes'
          : 'Application will require manual sync',
      })
    } catch (error) {
      toast.error('Failed to toggle auto-sync', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!name) return
    try {
      await deleteMutation.mutateAsync({ name, cascade: true })
      toast.success('Application deleted', {
        description: `Successfully deleted application "${name}" with cascade`,
      })
      setDeleteDialogOpen(false)
      navigate({ to: '/applications' })
    } catch (error) {
      console.error('Failed to delete application:', error)
      toast.error('Failed to delete application', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <IconCircleForward size={32} className="animate-spin text-neutral-400 mx-auto mb-4" />
          <p className="text-neutral-400">Loading application...</p>
        </div>
      </div>
    )
  }

  if (error || !app) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 max-w-md">
          <div className="flex items-start gap-3">
            <div>
              <h3 className="font-medium text-red-400 mb-1">Failed to load application</h3>
              <p className="text-sm text-red-400/80 mb-3">
                {error instanceof Error ? error.message : 'Application not found'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate({ to: '/applications' })}>
                  Back to Applications
                </Button>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const healthStatus = app.status?.health?.status || 'Unknown'
  const syncStatus = app.status?.sync?.status || 'Unknown'
  const { color: healthColor } = getHealthIcon(healthStatus)

  // Parse app versions from image tags
  const appVersions = parseAppVersions(app.status?.summary?.images)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white dark:bg-black">
        {/* Breadcrumb section - full width */}
        <div className="px-6 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                    onClick={() => navigate({ to: '/applications' })}
                  >
                    Applications
                  </Button>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <IconChevronRight size={14} />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        role="combobox"
                        aria-expanded={comboboxOpen}
                        className="h-auto p-0 text-sm font-medium text-black dark:text-white hover:bg-transparent gap-1.5"
                      >
                        {app.metadata.name}
                        <IconChevronDown size={14} className="opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search applications..." />
                        <CommandList>
                          <CommandEmpty>No application found.</CommandEmpty>
                          <CommandGroup>
                            {allApps?.items?.map((application) => (
                              <CommandItem
                                key={application.metadata.name}
                                value={application.metadata.name}
                                onSelect={(selectedName) => {
                                  navigate({
                                    to: '/applications/$name/tree',
                                    params: { name: selectedName }
                                  })
                                  setComboboxOpen(false)
                                }}
                              >
                                {application.metadata.name}
                                <IconCircleCheckFill
                                  size={16}
                                  className={cn(
                                    'ml-auto',
                                    app.metadata.name === application.metadata.name
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* Actions */}
            <div className="flex gap-3 items-center">
              {/* Auto-sync toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-600 dark:text-neutral-400">Auto-sync</span>
                <Switch
                  checked={!!app.spec?.syncPolicy?.automated}
                  onCheckedChange={handleToggleAutoSync}
                  disabled={updateSpecMutation.isPending}
                />
              </div>

              <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: '/applications/$name/settings', params: { name } })}
              >
                <IconSettings size={16} />
                Settings
              </Button>

              <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" />

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshMutation.isPending}
              >
                <IconCircleForward size={16} className={refreshMutation.isPending ? 'animate-spin' : ''} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncMutation.isPending}
              >
                Sync
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteClick}
                className="text-red-400 hover:text-red-300"
              >
                <IconDelete size={16} />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area with sidebar */}
      <div className="flex flex-1 overflow-hidden bg-white dark:bg-black">
        {/* Left content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* View switcher - hide on settings page */}
          {currentView !== 'settings' && (
            <div className="px-6 py-3">
              <div className="flex items-center gap-1.5">
                <Button
                  variant={currentView === 'tree' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => navigate({ to: '/applications/$name/tree', params: { name } })}
                  className="gap-1"
                >
                  Tree
                </Button>
                <Button
                  variant={currentView === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => navigate({ to: '/applications/$name/list', params: { name } })}
                  className="gap-1"
                >
                  List
                </Button>
                <Button
                  variant={currentView === 'pods' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => navigate({ to: '/applications/$name/pods', params: { name } })}
                  className="gap-1"
                >
                  Pods
                </Button>
                <Button
                  variant={currentView === 'diff' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => navigate({ to: '/applications/$name/diff', params: { name } })}
                  className="gap-1"
                >
                  Diff
                </Button>
                <Button
                  variant={currentView === 'history' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => navigate({ to: '/applications/$name/history', params: { name } })}
                  className="gap-1"
                >
                  History
                </Button>
              </div>
            </div>
          )}

          {/* Content - Outlet for nested routes */}
          <div className="flex-1 overflow-auto">
            <Outlet />
          </div>
        </div>

        {/* Right sidebar - metadata */}
        <div className="w-80 overflow-y-auto border-l border-border p-6 space-y-4">
          {/* Health status */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Health</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${healthColor.replace('text-', 'bg-').replace('bg-grass-11', 'bg-grass-9')}`} />
                <div className="text-sm">{healthStatus}</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Sync status</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${syncStatus === 'Synced' ? 'bg-grass-9' : 'bg-amber-400'}`} />
                <div className="text-sm">{syncStatus}</div>
              </div>
            </div>
          </div>

          {/* Namespace */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Namespace</div>
            <div className="text-sm">{app.spec.destination.namespace || 'default'}</div>
          </div>

          {/* Destination server */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Destination</div>
            <div className="text-sm break-all">{app.spec.destination.server || app.spec.destination.name || 'unknown'}</div>
          </div>

          {/* Repository */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Repository</div>
            <div className="flex items-center gap-1.5 text-sm break-all">
              {formatRepoUrl(app.spec.source.repoURL).isGithub ? (
                <IconBrandGithubFill size={14} className="flex-shrink-0" />
              ) : (
                <IconCodeBranch size={14} className="flex-shrink-0" />
              )}
              <span>{formatRepoUrl(app.spec.source.repoURL).displayText}</span>
            </div>
          </div>

          {/* Target revision */}
          {app.spec.source.targetRevision && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Target revision</div>
              <div className="text-sm font-mono">{app.spec.source.targetRevision}</div>
            </div>
          )}

          {/* App Versions */}
          {appVersions.length > 0 && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">App versions</div>
              <div className="space-y-1.5">
                {appVersions.map((version, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium">{version.name}:</span>{' '}
                    <span className="font-mono">{version.version}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Application"
        description={`Are you sure you want to delete the application "${name}"? This action cannot be undone and will remove all associated resources from the cluster.`}
        confirmText="Delete"
        resourceName={name || ''}
        resourceType="application"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />

      {/* Sync Progress Sheet */}
      <SyncProgressSheet
        application={app}
        open={syncProgressOpen}
        onOpenChange={setSyncProgressOpen}
      />
    </div>
  )
}

// Helper function to parse app versions from Docker images
interface AppVersion {
  name: string
  version: string
  isCommitSha: boolean
}

function parseAppVersions(images: string[] | undefined): AppVersion[] {
  if (!images || images.length === 0) return []

  return images
    .map(image => {
      const parts = image.split('/')
      const lastPart = parts[parts.length - 1]
      const [name, tag] = lastPart.split(':')

      if (!tag || tag === 'latest') return null

      const isCommitSha = /^[0-9a-f]{40}$/i.test(tag)
      const version = isCommitSha ? tag.substring(0, 7) : tag

      return { name, version, isCommitSha }
    })
    .filter((v): v is AppVersion => v !== null)
}
