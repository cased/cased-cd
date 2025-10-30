import { createFileRoute, redirect } from '@tanstack/react-router'
import { Layout } from '@/components/layout/layout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    // Check if user is authenticated
    const token = localStorage.getItem('argocd_token')
    if (!token) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return <Layout />
}
