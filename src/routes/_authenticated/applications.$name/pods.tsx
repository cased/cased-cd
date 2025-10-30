import { createFileRoute, useParams } from '@tanstack/react-router'
import { useManagedResources } from '@/services/applications'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorAlert } from '@/components/ui/error-alert'
import { Badge } from '@/components/ui/badge'
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

export const Route = createFileRoute('/_authenticated/applications/$name/pods')({
  component: PodsPage,
})

function PodsPage() {
  const { name } = useParams({ from: '/_authenticated/applications/$name/pods' })
  const { data, isLoading, error, refetch } = useManagedResources(name || '')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <LoadingSpinner message="Loading pods..." size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorAlert
          error={error}
          onRetry={() => refetch()}
          title="Failed to load pods"
          size="lg"
        />
      </div>
    )
  }

  // Filter resources to only show Pods
  const pods = data?.items?.filter((resource) => resource.kind === 'Pod') || []

  return (
    <div className="p-4">
      {pods.length === 0 ? (
        <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-center">
          <div className="text-neutral-600 dark:text-neutral-400">
            No pods found for this application
          </div>
        </div>
      ) : (
        <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Namespace</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Sync Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pods.map((pod, index) => (
                <TableRow key={`${pod.name}-${pod.namespace || 'default'}-${index}`}>
                  <TableCell className="font-medium">{pod.name}</TableCell>
                  <TableCell className="text-neutral-600 dark:text-neutral-400">
                    {pod.namespace || '-'}
                  </TableCell>
                  <TableCell>
                    {pod.health?.status ? (
                      <HealthBadge status={pod.health.status} />
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {pod.syncStatus ? (
                      <SyncBadge status={pod.syncStatus} />
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
