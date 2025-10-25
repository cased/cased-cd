import { createFileRoute } from '@tanstack/react-router'
import { AuditTrailPage } from '@/pages/audit-trail'

export const Route = createFileRoute('/_authenticated/audit-trail')({
  component: AuditTrailPage,
})
