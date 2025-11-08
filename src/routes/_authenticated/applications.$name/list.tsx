import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { useResourceTree, useApplication } from '@/services/applications'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorAlert } from '@/components/ui/error-alert'
import { Badge } from '@/components/ui/badge'
import { ResourceDetailsPanel } from '@/components/resource-details-panel'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  IconCircleCheck,
  IconCircleWarning,
  IconCircleClose,
  IconCircleForward,
  IconCircleInfo,
} from 'obra-icons-react'

export const Route = createFileRoute('/_authenticated/applications/$name/list')({
  component: ListPage,
})

interface ResourceNode {
  kind: string
  name: string
  namespace?: string
  status?: string
  health?: {
    status?: string
  }
  group?: string
  version?: string
}

function ListPage() {
  const { name } = useParams({ from: '/_authenticated/applications/$name/list' })
  const { data, isLoading, error, refetch } = useResourceTree(name || '')
  const { data: app } = useApplication(name || '')
  const [selectedResource, setSelectedResource] = useState<ResourceNode | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <LoadingSpinner message="Loading resources..." size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorAlert
          error={error}
          onRetry={() => refetch()}
          title="Failed to load resources"
          size="lg"
        />
      </div>
    )
  }

  const resources = data?.nodes || []

  return (
    <div className="flex h-full">
      <div className="flex-1 p-4 overflow-auto">
        {resources.length === 0 ? (
          <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-center">
            <div className="text-neutral-600 dark:text-neutral-400">
              No resources found for this application
            </div>
          </div>
        ) : (
          <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kind</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Namespace</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Sync Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource, index) => (
                  <TableRow
                    key={`${resource.kind}-${resource.name}-${resource.namespace || 'default'}-${index}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedResource(resource)}
                  >
                    <TableCell className="font-medium">{resource.kind}</TableCell>
                    <TableCell>{resource.name}</TableCell>
                    <TableCell className="text-neutral-600 dark:text-neutral-400">
                      {resource.namespace || '-'}
                    </TableCell>
                    <TableCell className="text-neutral-600 dark:text-neutral-400">
                      {resource.group || '-'}
                    </TableCell>
                    <TableCell>
                      {resource.health?.status ? (
                        <HealthBadge status={resource.health.status} />
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {resource.status ? (
                        <SyncBadge status={resource.status} />
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Resource Details Slide-out Panel */}
      {selectedResource && app && (
        <ResourceDetailsPanel
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
          appName={name || ''}
          app={app}
        />
      )}
    </div>
  )
}

function HealthBadge({ status }: { status: string }) {
  const statusLower = status.toLowerCase()

  if (statusLower === 'healthy') {
    return (
      <Badge variant="success" className="gap-1">
        <IconCircleCheck size={12} />
        Healthy
      </Badge>
    )
  }

  if (statusLower === 'progressing') {
    return (
      <Badge variant="default" className="gap-1">
        <IconCircleForward size={12} />
        Progressing
      </Badge>
    )
  }

  if (statusLower === 'degraded') {
    return (
      <Badge variant="warning" className="gap-1">
        <IconCircleWarning size={12} />
        Degraded
      </Badge>
    )
  }

  if (statusLower === 'suspended') {
    return (
      <Badge variant="outline" className="gap-1">
        <IconCircleInfo size={12} />
        Suspended
      </Badge>
    )
  }

  return (
    <Badge variant="destructive" className="gap-1">
      <IconCircleClose size={12} />
      {status}
    </Badge>
  )
}

function SyncBadge({ status }: { status: string }) {
  const statusLower = status.toLowerCase()

  if (statusLower === 'synced') {
    return (
      <Badge variant="success" className="gap-1">
        <IconCircleCheck size={12} />
        Synced
      </Badge>
    )
  }

  if (statusLower === 'outofsync') {
    return (
      <Badge variant="warning" className="gap-1">
        <IconCircleWarning size={12} />
        OutOfSync
      </Badge>
    )
  }

  return (
    <Badge variant="outline">
      {status}
    </Badge>
  )
}
