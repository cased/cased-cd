import { createFileRoute, Outlet, useNavigate, useParams, useRouterState } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  IconArrowLeft,
  IconCircleForward,
  IconDelete,
  IconCodeBranch,
  IconCircleCheck,
  IconSettings
} from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { getHealthIcon } from '@/lib/status-icons'
import {
  useApplication,
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

  // Get current view from pathname
  const currentPath = router.location.pathname
  const currentView = currentPath.split('/').pop() || 'tree'

  const { data: app, isLoading, error, refetch } = useApplication(name || '', !!name)

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
  const { icon: HealthIcon, color: healthColor } = getHealthIcon(healthStatus)

  // Parse app versions from image tags
  const appVersions = parseAppVersions(app.status?.summary?.images)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="px-6 py-3">
          {/* Controls row */}
          <div className="flex items-center justify-between mb-3">
                      {/* Title and info */}
          <div className="mb-3">
            <h1 className="text-lg font-semibold text-black dark:text-white">
              {app.metadata.name}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
              <span>{app.spec.destination.namespace || 'default'}</span>
              <span>·</span>
              <span>{app.spec.destination.server || app.spec.destination.name || 'unknown'}</span>
            </div>
          </div>
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

          {/* Status badges and info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="gap-1.5">
                <HealthIcon size={12} className={healthColor} />
                {healthStatus}
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <IconCircleCheck size={12} className={syncStatus === 'Synced' ? 'text-grass-11' : 'text-amber-400'} />
                {syncStatus}
              </Badge>
            </div>

            {/* App Versions */}
            {appVersions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-600 dark:text-neutral-400">App:</span>
                <div className="flex items-center gap-1.5">
                  {appVersions.map((version, i) => (
                    <Badge key={i} variant="outline" className="gap-1 text-xs font-mono">
                      {version.name}: {version.version}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              <IconCodeBranch size={14} />
              <span className="truncate max-w-md">{app.spec.source.repoURL}</span>
            </div>

            {app.spec.source.targetRevision && (
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                <span className="text-neutral-600">Config:</span> {app.spec.source.targetRevision}
              </div>
            )}
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1.5 mt-3">
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
      </div>

      {/* Content - Outlet for nested routes */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <Outlet />
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
