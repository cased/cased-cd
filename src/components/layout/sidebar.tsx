import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useHasFeature } from "@/services/license";
import {
  IconGrid,
  IconSettings,
  IconBookOpen,
  IconLogOut,
  IconFolder,
  IconServer,
  IconBox,
  IconLock,
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
  },
  {
    title: "Repositories",
    href: "/repositories",
    icon: IconFolder,
  },
  {
    title: "Clusters",
    href: "/clusters",
    icon: IconServer,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: IconBox,
  },
  {
    title: "RBAC",
    href: "/rbac",
    icon: IconLock,
    requiresFeature: 'rbac' as const, // Requires enterprise license
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
      style={{ "--sidebar-width": "11rem" } as React.CSSProperties}
    >
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/applications">
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">Cased CD</span>
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
                          <Icon />
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
        <div className="px-4 py-2 border-t border-sidebar-border">
          <a
            href="https://cased.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[11px] text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors group"
          >
            <span>Powered by</span>
            <span className="font-semibold group-hover:underline">Cased</span>
          </a>
        </div>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
