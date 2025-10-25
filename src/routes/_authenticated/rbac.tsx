import { createFileRoute } from '@tanstack/react-router'
import { RBACPage } from '@/pages/rbac'

export const Route = createFileRoute('/_authenticated/rbac')({
  component: RBACPage,
})
