import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useHasFeature } from "@/services/license";
import {
  IconGrid,
  IconSettings,
  IconBookOpen,
  IconLogOut,
  IconCodeBranch,
  IconLayers,
  IconFolder,
  IconLock,
  IconBill,
} from "obra-icons-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Applications",
    href: "/applications",
    icon: IconGrid,
    color: "#3b82f6", // blue
  },
  {
    title: "Projects",
    href: "/projects",
    icon: IconFolder,
    color: "#f59e0b", // amber
  },
  {
    title: "Repositories",
    href: "/repositories",
    icon: IconCodeBranch,
    color: "#8b5cf6", // purple
  },
  {
    title: "Clusters",
    href: "/clusters",
    icon: IconLayers,
    color: "#10b981", // green
  },
  {
    title: "RBAC",
    href: "/rbac",
    icon: IconLock,
    color: "#ef4444", // red
    requiresFeature: 'rbac' as const, // Requires enterprise license
  },
  {
    title: "Notifications",
    href: "/notifications",
    icon: IconBill,
    color: "#ec4899", // pink
  },
];

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const hasRBAC = useHasFeature('rbac');

  // Filter nav items based on license
  const visibleNavItems = navItems.filter(item => {
    if (!item.requiresFeature) return true;
    if (item.requiresFeature === 'rbac') return hasRBAC;
    return false;
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "13rem" } as React.CSSProperties}
    >
      <Sidebar collapsible="icon">
        <SidebarHeader className="items-start py-3 px-2">
          <img src="/cased-logo.svg" alt="Cased" className="h-6 ml-2" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.href);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                      >
                        <Link to={item.href}>
                          <Icon style={{ color: item.color }} />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
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
                asChild
                isActive={location.pathname.startsWith("/help")}
                tooltip="Documentation"
              >
                <Link to="/help">
                  <IconBookOpen />
                  <span>Documentation</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.pathname.startsWith("/settings")}
                tooltip="Settings"
              >
                <Link to="/settings">
                  <IconSettings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Logout">
                <button onClick={handleLogout} className="w-full">
                  <IconLogOut />
                  <span>Logout</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarSeparator />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href="/user-info">
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="text-xs font-medium">Admin User</span>
                    <span className="text-[11px] text-sidebar-foreground/70">
                      admin@cased.cd
                    </span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
