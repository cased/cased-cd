import { createFileRoute } from '@tanstack/react-router'
import { ClustersPage } from '@/pages/clusters'

export const Route = createFileRoute('/_authenticated/clusters')({
  component: ClustersPage,
})
