import { Outlet } from 'react-router-dom'
import { AppSidebar } from './sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

export function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
