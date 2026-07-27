"use client";

import { useSidebar } from "@/hooks/use-sidebar";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

const SIDEBAR_EXPANDED = "w-40";
const SIDEBAR_COLLAPSED = "w-14";

export function SidebarLayoutShell({ children }: { children: React.ReactNode }) {
  const { collapsed, toggle } = useSidebar();

  return (
    <div className="flex flex-1 min-h-0">
      <aside
        className={cn(
          "hidden lg:block border-r border-border shrink-0 transition-all duration-200 ease-in-out",
          collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED
        )}
      >
        <Sidebar collapsed={collapsed} onToggle={toggle} />
      </aside>
      <main
        className={cn(
          "flex-1 min-w-0 flex flex-col transition-all duration-200 ease-in-out"
        )}
      >
        {children}
      </main>
    </div>
  );
}