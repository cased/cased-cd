import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ThemeProvider } from '@/lib/theme'
import { QueryProvider } from '@/lib/query-client'
import { AuthProvider } from '@/lib/auth'
import { Toaster } from '@/components/ui/sonner'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <Outlet />
          <Toaster />
          {import.meta.env.DEV && <TanStackRouterDevtools />}
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}
