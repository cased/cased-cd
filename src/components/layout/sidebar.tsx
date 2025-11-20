import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useAppearance } from "@/lib/theme";
import {
  IconGrid,
  IconSettings,
  IconBookOpen,
  IconLogOut,
  IconCodeBranch,
  IconLayers,
  IconFolder,
  IconLock,
  IconMessage,
  IconDocument,
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
    title: "Projects",
    href: "/projects",
    icon: IconFolder,
  },
  {
    title: "Repositories",
    href: "/repositories",
    icon: IconCodeBranch,
  },
  {
    title: "Clusters",
    href: "/clusters",
    icon: IconLayers,
  },
  {
    title: "Permissions",
    href: "/rbac",
    icon: IconLock,
    requiresFeature: 'rbac' as const, // Requires enterprise license
  },
  {
    title: "Notifications",
    href: "/notifications",
    icon: IconMessage,
    requiresFeature: 'notifications' as const, // Requires enterprise license
  },
  {
    title: "Audit Trail",
    href: "/audit-trail",
    icon: IconDocument,
    requiresFeature: 'audit' as const, // Requires enterprise license
  },
];

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const router = useRouterState();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isDark } = useAppearance();

  // Use build-time flag to determine if enterprise features should be shown
  const isEnterprise = import.meta.env.VITE_IS_ENTERPRISE === 'true';

  // Filter nav items based on build type (no runtime license check needed)
  const visibleNavItems = navItems.filter(item => {
    if (!item.requiresFeature) return true;
    return isEnterprise; // Show all enterprise features if this is an enterprise build
  });

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "13rem" } as React.CSSProperties}
    >
      <Sidebar collapsible="icon">
        <SidebarHeader className="items-start pb-4 pt-6 px-2">
          <img 
            src={isDark ? "/cased-logo-dark-mode.svg" : "/cased-logo.svg"} 
            alt="Cased" 
            className="h-6 ml-2" 
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = router.location.pathname.startsWith(item.href);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className="h-[34px] gap-[6px]"
                      >
                        <Link to={item.href}>
                          <Icon size={16} />
                          <span className="text-[15px]">{item.title}</span>
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
                isActive={router.location.pathname.startsWith("/help")}
                tooltip="Documentation"
                className="h-[34px] gap-[6px]"
              >
                <Link to="/help">
                  <IconBookOpen size={16} />
                  <span className="text-[15px]">Documentation</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={router.location.pathname.startsWith("/settings")}
                tooltip="Settings"
                className="h-[34px] gap-[6px]"
              >
                <Link to="/settings">
                  <IconSettings size={16} />
                  <span className="text-[15px]">Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Logout" className="h-[34px] gap-[6px]">
                <button onClick={handleLogout} className="w-full">
                  <IconLogOut size={16} />
                  <span className="text-[15px]">Logout</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarSeparator />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/user-info">
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="text-xs font-medium">Admin User</span>
                    <span className="text-[11px] text-sidebar-foreground/70">
                      admin@cased.cd
                    </span>
                  </div>
                </Link>
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
