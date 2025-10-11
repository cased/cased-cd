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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useApplication, useSyncApplication, useDeleteApplication, useRefreshApplication, useResourceTree } from '@/services/applications'
import { ResourceTree } from '@/components/resource-tree'
import { ResourceDetailsPanel } from '@/components/resource-details-panel'

type ViewType = 'tree' | 'network' | 'list' | 'pods'

interface ResourceFilters {
  kind: string
  status: string
  namespace: string
  health: string
}

interface K8sResource {
  kind: string
  name: string
  namespace?: string
  status?: string
  health?: {
    status?: string
  }
}

const healthIcons = {
  Healthy: { icon: IconCircleCheck, color: 'text-grass-11' },
  Progressing: { icon: IconClock3, color: 'text-blue-400' },
  Degraded: { icon: IconCircleWarning, color: 'text-amber-400' },
  Suspended: { icon: IconCircleWarning, color: 'text-neutral-400' },
  Missing: { icon: IconCircleWarning, color: 'text-red-400' },
  Unknown: { icon: IconCircleInfo, color: 'text-neutral-500' },
}

// Helper function to extract unique values from resources
function getUniqueValues(resources: K8sResource[], key: string): string[] {
  const values = new Set<string>()
  resources.forEach(resource => {
    let value: string | undefined
    if (key === 'health') {
      value = resource.health?.status
    } else {
      value = resource[key as keyof K8sResource] as string | undefined
    }
    if (value) values.add(value)
  })
  return Array.from(values).sort()
}

// Helper function to filter resources
function filterResources(resources: K8sResource[], filters: ResourceFilters): K8sResource[] {
  return resources.filter(resource => {
    if (filters.kind !== 'all' && resource.kind !== filters.kind) return false
    if (filters.status !== 'all' && resource.status !== filters.status) return false
    if (filters.namespace !== 'all' && resource.namespace !== filters.namespace) return false
    if (filters.health !== 'all' && resource.health?.status !== filters.health) return false
    return true
  })
}

interface FilterBarProps {
  resources: K8sResource[]
  filters: ResourceFilters
  onFiltersChange: (filters: ResourceFilters) => void
}

function FilterBar({ resources, filters, onFiltersChange }: FilterBarProps) {
  const kinds = getUniqueValues(resources, 'kind')
  const statuses = getUniqueValues(resources, 'status')
  const namespaces = getUniqueValues(resources, 'namespace')
  const healthStatuses = getUniqueValues(resources, 'health')

  return (
    <div className="flex items-center gap-2">
      <Select
        value={filters.kind}
        onValueChange={(value) => onFiltersChange({ ...filters, kind: value })}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Kind" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Kinds</SelectItem>
          {kinds.map(kind => (
            <SelectItem key={kind} value={kind}>{kind}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status}
        onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {statuses.map(status => (
            <SelectItem key={status} value={status}>{status}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.namespace}
        onValueChange={(value) => onFiltersChange({ ...filters, namespace: value })}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Namespace" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Namespaces</SelectItem>
          {namespaces.map(namespace => (
            <SelectItem key={namespace} value={namespace}>{namespace}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.health}
        onValueChange={(value) => onFiltersChange({ ...filters, health: value })}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Health" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Health</SelectItem>
          {healthStatuses.map(health => (
            <SelectItem key={health} value={health}>{health}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function ApplicationDetailPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const [view, setView] = useState<ViewType>('tree')
  const [selectedResource, setSelectedResource] = useState<K8sResource | null>(null)
  const [filters, setFilters] = useState<ResourceFilters>({
    kind: 'all',
    status: 'all',
    namespace: 'all',
    health: 'all',
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data: app, isLoading, error, refetch } = useApplication(name || '', !!name)
  const { data: resourceTree } = useResourceTree(name || '', !!name)
  const syncMutation = useSyncApplication()
  const deleteMutation = useDeleteApplication()
  const refreshMutation = useRefreshApplication()

  const handleSync = async () => {
    if (!name) return
    try {
      await syncMutation.mutateAsync({ name, prune: false, dryRun: false })
      toast.success('Application synced', {
        description: 'Sync initiated successfully',
      })
      refetch()
    } catch (error) {
      toast.error('Failed to sync application', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
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
      navigate('/applications')
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
                onClick={handleDeleteClick}
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
              <Badge variant="outline" className="gap-1.5">
                <HealthIcon size={12} className={healthColor} />
                {healthStatus}
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <IconCircleCheck size={12} className={syncStatus === 'Synced' ? 'text-grass-11' : 'text-amber-400'} />
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
          {view === 'tree' && <TreeView app={app} filters={filters} onFiltersChange={setFilters} onResourceClick={setSelectedResource} />}
          {view === 'list' && <ListView app={app} filters={filters} onFiltersChange={setFilters} onResourceClick={setSelectedResource} />}
          {view === 'pods' && <PodsView resourceTree={resourceTree} filters={filters} onFiltersChange={setFilters} onResourceClick={setSelectedResource} />}
        </div>
      </div>

      {/* Resource Details Panel */}
      {selectedResource && (
        <ResourceDetailsPanel
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      )}

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
    </div>
  )
}

// Placeholder components for different views
interface TreeViewProps {
  app: { status?: { resources?: K8sResource[] } }
  filters: ResourceFilters
  onFiltersChange: (filters: ResourceFilters) => void
  onResourceClick: (resource: K8sResource) => void
}

function TreeView({ app, filters, onFiltersChange, onResourceClick }: TreeViewProps) {
  const resources = app.status?.resources || []
  const filteredResources = filterResources(resources, filters)

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
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-black dark:text-white">Resource Tree ({filteredResources.length} of {resources.length} resources)</h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">Visual graph of all Kubernetes resources</p>
        </div>
        <FilterBar resources={resources} filters={filters} onFiltersChange={onFiltersChange} />
      </div>

      <ResourceTree
        resources={filteredResources}
        onResourceClick={onResourceClick}
      />
    </div>
  )
}

interface ListViewProps {
  app: { status?: { resources?: K8sResource[] } }
  filters: ResourceFilters
  onFiltersChange: (filters: ResourceFilters) => void
  onResourceClick: (resource: K8sResource) => void
}

function ListView({ app, filters, onFiltersChange, onResourceClick }: ListViewProps) {
  const resources = app.status?.resources || []
  const filteredResources = filterResources(resources, filters)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-black dark:text-white">Resources ({filteredResources.length} of {resources.length})</h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">All Kubernetes resources in this application</p>
        </div>
        <FilterBar resources={resources} filters={filters} onFiltersChange={onFiltersChange} />
      </div>

      {filteredResources.length === 0 ? (
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
              {filteredResources.map((resource, i: number) => (
                <TableRow
                  key={i}
                  className="cursor-pointer"
                  onClick={() => onResourceClick(resource)}
                >
                  <TableCell className="text-sm text-black dark:text-white">{resource.kind}</TableCell>
                  <TableCell className="text-sm text-black dark:text-white">{resource.name}</TableCell>
                  <TableCell className="text-sm text-neutral-600 dark:text-neutral-400">{resource.namespace || '-'}</TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="outline" className="gap-1.5">
                      <IconCircleCheck size={10} className={resource.status === 'Synced' ? 'text-grass-11' : 'text-amber-400'} />
                      {resource.status || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {resource.health?.status ? (
                      <Badge variant="outline" className="gap-1.5">
                        {resource.health.status === 'Healthy' ? (
                          <IconCircleCheck size={10} className="text-grass-11" />
                        ) : (
                          <IconCircleWarning size={10} className="text-amber-400" />
                        )}
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

interface PodsViewProps {
  resourceTree?: { nodes?: K8sResource[] }
  filters: ResourceFilters
  onFiltersChange: (filters: ResourceFilters) => void
  onResourceClick: (resource: K8sResource) => void
}

function PodsView({ resourceTree, filters, onFiltersChange, onResourceClick }: PodsViewProps) {
  // Get pods from resource tree (which includes all child resources)
  const allNodes = resourceTree?.nodes || []
  const pods = allNodes.filter((node) => node.kind === 'Pod')
  const filteredPods = filterResources(pods, filters)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-black dark:text-white">Pods ({filteredPods.length} of {pods.length})</h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">All pods in this application</p>
        </div>
        <FilterBar resources={pods} filters={filters} onFiltersChange={onFiltersChange} />
      </div>

      {filteredPods.length === 0 ? (
        <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-center">
          <IconBox size={36} className="text-neutral-600 mx-auto mb-2" />
          <p className="text-xs text-neutral-600 dark:text-neutral-400">No pods found</p>
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {filteredPods.map((pod, i: number) => (
            <div
              key={i}
              className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
              onClick={() => onResourceClick(pod)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-medium text-black dark:text-white truncate flex-1">{pod.name}</h3>
                {pod.health?.status && (
                  <Badge variant="outline" className="gap-1 ml-2">
                    {pod.health.status === 'Healthy' ? (
                      <IconCircleCheck size={10} className="text-grass-11" />
                    ) : (
                      <IconCircleWarning size={10} className="text-amber-400" />
                    )}
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
