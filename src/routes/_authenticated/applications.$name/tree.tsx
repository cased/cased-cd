import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { useResourceTree, useApplication } from '@/services/applications'
import { ResourceTree } from '@/components/resource-tree'
import { ResourceDetailsPanel } from '@/components/resource-details-panel'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorAlert } from '@/components/ui/error-alert'

export const Route = createFileRoute('/_authenticated/applications/$name/tree')({
  component: TreePage,
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
  parentRefs?: Array<{
    kind: string
    name: string
    namespace?: string
    group?: string
  }>
}

function TreePage() {
  const { name } = useParams({ from: '/_authenticated/applications/$name/tree' })
  const { data, isLoading, error, refetch } = useResourceTree(name || '')
  const { data: app } = useApplication(name || '')
  const [selectedResource, setSelectedResource] = useState<ResourceNode | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <LoadingSpinner message="Loading resource tree..." size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorAlert
          error={error}
          onRetry={() => refetch()}
          title="Failed to load resource tree"
          size="lg"
        />
      </div>
    )
  }

  const resources = data?.nodes || []

  return (
    <div className="p-4 h-full">
      {resources.length === 0 ? (
        <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-center">
          <div className="text-neutral-600 dark:text-neutral-400">
            No resources found for this application
          </div>
        </div>
      ) : (
        <>
          <ResourceTree
            resources={resources}
            onResourceClick={setSelectedResource}
          />

          {selectedResource && app && (
            <ResourceDetailsPanel
              resource={selectedResource}
              onClose={() => setSelectedResource(null)}
              appName={name || ''}
              app={app}
            />
          )}
        </>
      )}
    </div>
  )
}
