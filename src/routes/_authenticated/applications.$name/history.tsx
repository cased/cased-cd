import { createFileRoute } from '@tanstack/react-router'
import { ApplicationHistory } from '@/components/application-history'
import { useApplication } from '@/services/applications'

export const Route = createFileRoute('/_authenticated/applications/$name/history')({
  component: HistoryPage,
})

function HistoryPage() {
  const { name } = Route.useParams()
  const { data: app } = useApplication(name || '', !!name)

  if (!app) {
    return (
      <div className="p-4">
        <div className="text-neutral-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <ApplicationHistory application={app} />
    </div>
  )
}
