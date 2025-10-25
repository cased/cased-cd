import { createFileRoute } from '@tanstack/react-router'
import { RepositoriesPage } from '@/pages/repositories'

export const Route = createFileRoute('/_authenticated/repositories')({
  component: RepositoriesPage,
})
