import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppearance } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import {
  IconGrid,
  IconSettings,
  IconUser,
  IconBookOpen,
  IconSun,
  IconMoon,
  IconLogOut,
  IconFolder,
  IconServer,
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
    title: "Settings",
    href: "/settings",
    icon: IconSettings,
  },
  {
    title: "User Info",
    href: "/user-info",
    icon: IconUser,
  },
  {
    title: "Documentation",
    href: "/help",
    icon: IconBookOpen,
  },
];

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { appearance, setAppearance } = useAppearance();
  const { logout } = useAuth();

  const toggleTheme = () => {
    const newAppearance = appearance === "dark" ? "light" : "dark";
    setAppearance(newAppearance);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "13rem" } as React.CSSProperties}
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
                {navItems.map((item) => {
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
                onClick={toggleTheme}
                tooltip={
                  appearance === "dark"
                    ? "Switch to Light Mode"
                    : "Switch to Dark Mode"
                }
              >
                {appearance === "dark" || appearance === "system" ? (
                  <IconSun />
                ) : (
                  <IconMoon />
                )}
                <span>
                  {appearance === "dark" ? "Light Mode" : "Dark Mode"}
                </span>
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
                <a href="#">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <span className="text-xs font-semibold">AD</span>
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="text-xs font-medium">Admin User</span>
                    <span className="text-[10px] text-sidebar-foreground/70">
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
