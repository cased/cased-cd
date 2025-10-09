import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  IconArrowLeft as ArrowLeft,
  IconRotate as RefreshCw,
  IconDelete as Trash2,
  IconCodeBranch as GitBranch,
  IconCircleInfo as Activity,
  IconCircleWarning as AlertCircle,
  IconCircleCheck as CheckCircle2,
  IconClock3 as Clock,
  IconCircle as Network,
  IconUnorderedList as List,
  IconBox as Box
} from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useApplication, useSyncApplication, useDeleteApplication, useRefreshApplication } from '@/services/applications'
import { ResourceTree } from '@/components/resource-tree'
import { ResourceDetailsPanel } from '@/components/resource-details-panel'

type ViewType = 'tree' | 'network' | 'list' | 'pods'

const healthIcons = {
  Healthy: { icon: CheckCircle2, color: 'text-emerald-400' },
  Progressing: { icon: Clock, color: 'text-blue-400' },
  Degraded: { icon: AlertCircle, color: 'text-amber-400' },
  Suspended: { icon: AlertCircle, color: 'text-neutral-400' },
  Missing: { icon: AlertCircle, color: 'text-red-400' },
  Unknown: { icon: Activity, color: 'text-neutral-500' },
}

export function ApplicationDetailPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const [view, setView] = useState<ViewType>('tree')
  const [selectedResource, setSelectedResource] = useState<any>(null)

  const { data: app, isLoading, error, refetch } = useApplication(name || '', !!name)
  const syncMutation = useSyncApplication()
  const deleteMutation = useDeleteApplication()
  const refreshMutation = useRefreshApplication()

  const handleSync = async () => {
    if (!name) return
    await syncMutation.mutateAsync({ name, prune: false, dryRun: false })
    refetch()
  }

  const handleRefresh = async () => {
    if (!name) return
    await refreshMutation.mutateAsync(name)
    refetch()
  }

  const handleDelete = async () => {
    if (!name) return
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      await deleteMutation.mutateAsync({ name, cascade: true })
      navigate('/applications')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-neutral-400 mx-auto mb-4" />
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
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-400 mb-1">Failed to load application</h3>
              <p className="text-sm text-red-400/80 mb-3">
                {error instanceof Error ? error.message : 'Application not found'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/applications')}>
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
  const HealthIcon = healthIcons[healthStatus]?.icon || Activity
  const healthColor = healthIcons[healthStatus]?.color || 'text-neutral-500'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="px-8 py-6">
          {/* Back button and title */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/applications')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight">
                  {app.metadata.name}
                </h1>
                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  <span>{app.spec.destination.namespace || 'default'}</span>
                  <span>·</span>
                  <span>{app.spec.destination.server || app.spec.destination.name || 'unknown'}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncMutation.isPending}
              >
                <Activity className="h-4 w-4 mr-2" />
                {syncMutation.isPending ? 'Syncing...' : 'Sync'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

          {/* Status badges and info */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Badge
                variant={healthStatus === 'Healthy' ? 'success' : healthStatus === 'Degraded' ? 'warning' : 'info'}
                className="gap-1.5"
              >
                <HealthIcon className={`h-3 w-3 ${healthColor}`} />
                {healthStatus}
              </Badge>
              <Badge variant={syncStatus === 'Synced' ? 'success' : 'warning'}>
                {syncStatus}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <GitBranch className="h-4 w-4" />
              <span className="truncate max-w-md">{app.spec.source.repoURL}</span>
            </div>

            {app.spec.source.targetRevision && (
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                <span className="text-neutral-600">Revision:</span> {app.spec.source.targetRevision}
              </div>
            )}
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-2 mt-6">
            <Button
              variant={view === 'tree' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setView('tree')}
              className="gap-2"
            >
              <Network className="h-4 w-4" />
              Tree
            </Button>
            <Button
              variant={view === 'list' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              variant={view === 'pods' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setView('pods')}
              className="gap-2"
            >
              <Box className="h-4 w-4" />
              Pods
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-8">
          {view === 'tree' && <TreeView app={app} onResourceClick={setSelectedResource} />}
          {view === 'list' && <ListView app={app} onResourceClick={setSelectedResource} />}
          {view === 'pods' && <PodsView app={app} onResourceClick={setSelectedResource} />}
        </div>
      </div>

      {/* Resource Details Panel */}
      {selectedResource && (
        <ResourceDetailsPanel
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      )}
    </div>
  )
}

// Placeholder components for different views
function TreeView({ app, onResourceClick }: { app: any; onResourceClick: (resource: any) => void }) {
  const resources = app.status?.resources || []

  if (resources.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-12 text-center">
        <Network className="h-16 w-16 text-neutral-600 mx-auto mb-4" />
        <h3 className="font-medium text-black dark:text-white mb-2">No Resources</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">This application has no resources yet.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-medium text-black dark:text-white">Resource Tree ({resources.length} resources)</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Visual graph of all Kubernetes resources</p>
      </div>

      <ResourceTree
        resources={resources}
        onResourceClick={onResourceClick}
      />
    </div>
  )
}

function ListView({ app, onResourceClick }: { app: any; onResourceClick: (resource: any) => void }) {
  const resources = app.status?.resources || []

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-medium text-black dark:text-white">Resources ({resources.length})</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">All Kubernetes resources in this application</p>
      </div>

      {resources.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-8 text-center">
          <List className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-600 dark:text-neutral-400">No resources found</p>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Kind
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Namespace
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Health
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 dark:divide-neutral-200">
              {resources.map((resource: any, i: number) => (
                <tr
                  key={i}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
                  onClick={() => onResourceClick(resource)}
                >
                  <td className="px-4 py-3 text-sm text-black dark:text-white">{resource.kind}</td>
                  <td className="px-4 py-3 text-sm text-black dark:text-white">{resource.name}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{resource.namespace || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <Badge variant={resource.status === 'Synced' ? 'success' : 'warning'} className="text-xs">
                      {resource.status || 'Unknown'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {resource.health?.status ? (
                      <Badge
                        variant={resource.health.status === 'Healthy' ? 'success' : 'warning'}
                        className="text-xs"
                      >
                        {resource.health.status}
                      </Badge>
                    ) : (
                      <span className="text-neutral-600 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PodsView({ app, onResourceClick }: { app: any; onResourceClick: (resource: any) => void }) {
  const resources = app.status?.resources || []
  const pods = resources.filter((r: any) => r.kind === 'Pod')

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-medium text-black dark:text-white">Pods ({pods.length})</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">All pods in this application</p>
      </div>

      {pods.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-8 text-center">
          <Box className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-600 dark:text-neutral-400">No pods found</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pods.map((pod: any, i: number) => (
            <div
              key={i}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
              onClick={() => onResourceClick(pod)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-medium text-black dark:text-white text-sm truncate flex-1">{pod.name}</h3>
                {pod.health?.status && (
                  <Badge
                    variant={pod.health.status === 'Healthy' ? 'success' : 'warning'}
                    className="text-xs ml-2"
                  >
                    {pod.health.status}
                  </Badge>
                )}
              </div>
              <div className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Namespace:</span>
                  <span>{pod.namespace || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Status:</span>
                  <span>{pod.status || 'Unknown'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
