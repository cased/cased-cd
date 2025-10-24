import { Outlet } from "@tanstack/react-router";
import { AppSidebar } from "./sidebar";

export function Layout() {
  return (
    <AppSidebar>
      <Outlet />
    </AppSidebar>
  );
}
