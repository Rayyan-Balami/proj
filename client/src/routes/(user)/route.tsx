import { AppSidebar } from "@/components/app-sidebar";
import { DialogProvider } from "@/components/dialogs/DialogProvider";
import { FileSystemDndProvider } from "@/components/dnd/FileSystemDndContext";
import { SiteFooter } from "@/components/footer/site-footer";
import { SiteHeader } from "@/components/header/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { useUserSync } from "@/hooks/useUserSync";

export const Route = createFileRoute('/(user)')({
  component: RouteComponent,
})

function RouteComponent() {
  // Keep user data in sync
  useUserSync();

  useEffect(() => {
    // Disable right click to prevent browser context menu
    const disableRightClick = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", disableRightClick);
    return () => document.removeEventListener("contextmenu", disableRightClick);
  }, []);

  return (
    <SidebarProvider>
      <FileSystemDndProvider>
          <AppSidebar />
          <SidebarInset className="h-screen overflow-y-auto">
            <SiteHeader />
            <section className="flex-1 flex flex-col">
              <Outlet />
            </section>
            <SiteFooter />
          </SidebarInset>
      </FileSystemDndProvider>
      {process.env.NODE_ENV === 'development' && <TanStackRouterDevtools position="top-right" />}
      <DialogProvider />
    </SidebarProvider>
  );
}
