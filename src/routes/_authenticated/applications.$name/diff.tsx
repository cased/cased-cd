import { createFileRoute, useParams } from '@tanstack/react-router'
import { useManagedResources, useApplication } from '@/services/applications'
import { ResourceDiffPanel } from '@/components/resource-diff-panel'

export const Route = createFileRoute('/_authenticated/applications/$name/diff')({
  component: DiffPage,
})

function DiffPage() {
  const { name } = useParams({ from: '/_authenticated/applications/$name/diff' })
  const { data: managedResourcesData, isLoading: isLoadingResources } = useManagedResources(name || '')
  const { data: applicationData, isLoading: isLoadingApp } = useApplication(name || '')

  const resources = managedResourcesData?.items || []
  const resourceStatuses = applicationData?.status?.resources || []

  return (
    <div className="h-full">
      <ResourceDiffPanel
        resources={resources}
        resourceStatuses={resourceStatuses}
        isLoading={isLoadingResources || isLoadingApp}
      />
    </div>
  )
}
