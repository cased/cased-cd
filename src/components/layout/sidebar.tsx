import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppearance } from '@/lib/theme'
import { useAuth } from '@/lib/auth'
import {
  IconGrid as LayoutGrid,
  IconSettings as Settings,
  IconUser as User,
  IconBookOpen as BookOpen,
  IconSun as Sun,
  IconMoon as Moon,
  IconLogOut as LogOut,
  IconFolder as FolderGit2,
  IconServer as Server,
} from 'obra-icons-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'

const navItems = [
  {
    title: 'Applications',
    href: '/applications',
    icon: LayoutGrid,
  },
  {
    title: 'Repositories',
    href: '/repositories',
    icon: FolderGit2,
  },
  {
    title: 'Clusters',
    href: '/clusters',
    icon: Server,
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

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { appearance, setAppearance } = useAppearance()
  const { logout } = useAuth()

  const toggleTheme = () => {
    const newAppearance = appearance === 'dark' ? 'light' : 'dark'
    setAppearance(newAppearance)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/applications">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <svg viewBox="0 0 24 24" fill="none" className="size-4">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
                    <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Cased CD</span>
                  <span className="text-xs">GitOps Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname.startsWith(item.href)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link to={item.href}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleTheme}
              tooltip={appearance === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {appearance === 'dark' || appearance === 'system' ? (
                <Sun />
              ) : (
                <Moon />
              )}
              <span>{appearance === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Logout">
              <button onClick={handleLogout} className="w-full">
                <LogOut />
                <span>Logout</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <span className="text-xs font-semibold">AD</span>
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="text-xs font-medium">Admin User</span>
                  <span className="text-[10px] text-sidebar-foreground/70">admin@cased.cd</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
