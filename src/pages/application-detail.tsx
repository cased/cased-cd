import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  IconArrowLeft,
  IconCircleForward,
  IconDelete,
  IconCodeBranch,
  IconCircleInfo,
  IconCircleWarning,
  IconCircleCheck,
  IconClock3,
  IconCircle,
  IconUnorderedList,
  IconBox
} from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useApplication, useSyncApplication, useDeleteApplication, useRefreshApplication, useResourceTree } from '@/services/applications'
import { ResourceTree } from '@/components/resource-tree'
import { ResourceDetailsPanel } from '@/components/resource-details-panel'

type ViewType = 'tree' | 'network' | 'list' | 'pods'

const healthIcons = {
  Healthy: { icon: IconCircleCheck, color: 'text-emerald-400' },
  Progressing: { icon: IconClock3, color: 'text-blue-400' },
  Degraded: { icon: IconCircleWarning, color: 'text-amber-400' },
  Suspended: { icon: IconCircleWarning, color: 'text-neutral-400' },
  Missing: { icon: IconCircleWarning, color: 'text-red-400' },
  Unknown: { icon: IconCircleInfo, color: 'text-neutral-500' },
}

export function ApplicationDetailPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const [view, setView] = useState<ViewType>('tree')
  const [selectedResource, setSelectedResource] = useState<any>(null)

  const { data: app, isLoading, error, refetch } = useApplication(name || '', !!name)
  const { data: resourceTree } = useResourceTree(name || '', !!name)
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
            <IconCircleWarning size={20} className="text-red-400 mt-0.5" />
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
  const HealthIcon = healthIcons[healthStatus]?.icon || IconCircleInfo
  const healthColor = healthIcons[healthStatus]?.color || 'text-neutral-500'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="px-6 py-3">
          {/* Controls row */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/applications')}
              className="gap-1"
            >
              <IconArrowLeft size={16} />
              Back
            </Button>

            {/* Actions */}
            <div className="flex gap-2">
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
                <IconCircleInfo size={16} />
                {syncMutation.isPending ? 'Syncing...' : 'Sync'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-red-400 hover:text-red-300"
              >
                <IconDelete size={16} />
                Delete
              </Button>
            </div>
          </div>

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

          {/* Status badges and info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Badge
                variant={healthStatus === 'Healthy' ? 'default' : healthStatus === 'Degraded' ? 'destructive' : 'secondary'}
                className="gap-1.5"
              >
                <HealthIcon size={12} className={healthColor} />
                {healthStatus}
              </Badge>
              <Badge variant={syncStatus === 'Synced' ? 'default' : 'destructive'}>
                {syncStatus}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              <IconCodeBranch size={14} />
              <span className="truncate max-w-md">{app.spec.source.repoURL}</span>
            </div>

            {app.spec.source.targetRevision && (
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                <span className="text-neutral-600">Revision:</span> {app.spec.source.targetRevision}
              </div>
            )}
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1.5 mt-3">
            <Button
              variant={view === 'tree' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('tree')}
              className="gap-1"
            >
              <IconCircle size={16} />
              Tree
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
              className="gap-1"
            >
              <IconUnorderedList size={16} />
              List
            </Button>
            <Button
              variant={view === 'pods' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('pods')}
              className="gap-1"
            >
              <IconBox size={16} />
              Pods
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-4">
          {view === 'tree' && <TreeView app={app} onResourceClick={setSelectedResource} />}
          {view === 'list' && <ListView app={app} onResourceClick={setSelectedResource} />}
          {view === 'pods' && <PodsView app={app} resourceTree={resourceTree} onResourceClick={setSelectedResource} />}
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
      <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-center">
        <IconCircle size={48} className="text-neutral-600 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-black dark:text-white mb-1">No Resources</h3>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">This application has no resources yet.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-medium text-black dark:text-white">Resource Tree ({resources.length} resources)</h2>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">Visual graph of all Kubernetes resources</p>
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
      <div className="mb-3">
        <h2 className="text-sm font-medium text-black dark:text-white">Resources ({resources.length})</h2>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">All Kubernetes resources in this application</p>
      </div>

      {resources.length === 0 ? (
        <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-center">
          <IconUnorderedList size={36} className="text-neutral-600 mx-auto mb-2" />
          <p className="text-xs text-neutral-600 dark:text-neutral-400">No resources found</p>
        </div>
      ) : (
        <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-100 dark:bg-neutral-900">
                <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Kind
                </TableHead>
                <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Name
                </TableHead>
                <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Namespace
                </TableHead>
                <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Health
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((resource: any, i: number) => (
                <TableRow
                  key={i}
                  className="cursor-pointer"
                  onClick={() => onResourceClick(resource)}
                >
                  <TableCell className="text-sm text-black dark:text-white">{resource.kind}</TableCell>
                  <TableCell className="text-sm text-black dark:text-white">{resource.name}</TableCell>
                  <TableCell className="text-sm text-neutral-600 dark:text-neutral-400">{resource.namespace || '-'}</TableCell>
                  <TableCell className="text-sm">
                    <Badge variant={resource.status === 'Synced' ? 'default' : 'destructive'} className="text-xs">
                      {resource.status || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {resource.health?.status ? (
                      <Badge
                        variant={resource.health.status === 'Healthy' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {resource.health.status}
                      </Badge>
                    ) : (
                      <span className="text-neutral-600 text-xs">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function PodsView({ app, resourceTree, onResourceClick }: { app: any; resourceTree?: any; onResourceClick: (resource: any) => void }) {
  // Get pods from resource tree (which includes all child resources)
  const allNodes = resourceTree?.nodes || []
  const pods = allNodes.filter((node: any) => node.kind === 'Pod')

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-medium text-black dark:text-white">Pods ({pods.length})</h2>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">All pods in this application</p>
      </div>

      {pods.length === 0 ? (
        <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-center">
          <IconBox size={36} className="text-neutral-600 mx-auto mb-2" />
          <p className="text-xs text-neutral-600 dark:text-neutral-400">No pods found</p>
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {pods.map((pod: any, i: number) => (
            <div
              key={i}
              className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
              onClick={() => onResourceClick(pod)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-medium text-black dark:text-white truncate flex-1">{pod.name}</h3>
                {pod.health?.status && (
                  <Badge
                    variant={pod.health.status === 'Healthy' ? 'default' : 'destructive'}
                    className="text-[10px] ml-2"
                  >
                    {pod.health.status}
                  </Badge>
                )}
              </div>
              <div className="space-y-0.5 text-[11px] text-neutral-600 dark:text-neutral-400">
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
