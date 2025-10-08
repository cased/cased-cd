import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAppearance } from '@/lib/theme'
import { useAuth } from '@/lib/auth'
import {
  LayoutGrid,
  Settings,
  User,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  {
    title: 'Applications',
    href: '/applications',
    icon: LayoutGrid,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
  {
    title: 'User Info',
    href: '/user-info',
    icon: User,
  },
  {
    title: 'Documentation',
    href: '/help',
    icon: BookOpen,
  },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { appearance, setAppearance } = useAppearance()
  const { logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const toggleTheme = () => {
    const newAppearance = appearance === 'dark' ? 'light' : 'dark'
    setAppearance(newAppearance)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div
      className={cn(
        'flex flex-col border-r transition-all duration-300',
        'bg-white dark:bg-black border-neutral-200 dark:border-neutral-800',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center border-b border-neutral-200 dark:border-neutral-800 px-4 justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded bg-white dark:bg-black flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" className="text-black dark:text-white"/>
                <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black dark:text-white"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-black dark:text-white">Cased CD</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1 text-neutral-400 hover:text-white hover:bg-neutral-900 dark:text-neutral-600 dark:hover:text-black dark:hover:bg-neutral-100 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black'
                  : 'text-neutral-700 hover:bg-neutral-900 hover:text-white dark:text-neutral-400 dark:hover:bg-neutral-100 dark:hover:text-black'
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Theme Switcher */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 p-3">
        <button
          onClick={toggleTheme}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium w-full transition-colors',
            'text-neutral-700 hover:bg-neutral-900 hover:text-white',
            'dark:text-neutral-400 dark:hover:bg-neutral-100 dark:hover:text-black'
          )}
          title={collapsed ? (appearance === 'dark' ? 'Switch to Light' : 'Switch to Dark') : undefined}
        >
          {appearance === 'dark' || appearance === 'system' ? (
            <Sun className="h-4 w-4 flex-shrink-0" />
          ) : (
            <Moon className="h-4 w-4 flex-shrink-0" />
          )}
          {!collapsed && <span>{appearance === 'dark' ? 'Light Mode' : appearance === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
        </button>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="p-4">
          {collapsed ? (
            <div className="flex justify-center">
              <div className="h-8 w-8 rounded-full bg-white dark:bg-black flex items-center justify-center text-xs font-semibold text-black dark:text-white">
                AD
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-md bg-neutral-100 dark:bg-neutral-900 px-3 py-2.5">
              <div className="h-8 w-8 rounded-full bg-white dark:bg-black flex items-center justify-center text-xs font-semibold text-black dark:text-white">
                AD
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-black dark:text-white">Admin User</div>
                <div className="text-[10px] text-neutral-500 dark:text-neutral-600 truncate">admin@cased.cd</div>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium w-full transition-colors',
            'text-neutral-700 hover:bg-neutral-900 hover:text-white',
            'dark:text-neutral-400 dark:hover:bg-neutral-100 dark:hover:text-black',
            'mx-3 mb-3'
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  )
}
