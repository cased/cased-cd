import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/applications')({
  component: ApplicationsLayout,
})

function ApplicationsLayout() {
  return <Outlet />
}
