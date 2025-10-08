import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-black">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
