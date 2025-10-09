import { Outlet } from "react-router-dom";
import { AppSidebar } from "./sidebar";

export function Layout() {
  return (
    <AppSidebar>
      <Outlet />
    </AppSidebar>
  );
}
