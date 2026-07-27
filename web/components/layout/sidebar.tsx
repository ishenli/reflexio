"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Users,
  FolderOpen,
  BookOpen,
  BookMarked,
  Sparkles,
  BarChart,
  Search,
  Cpu,
  Settings as SettingsIcon,
  BarChart3,
  UserCheck,
  FileCheck,
  Layers,
  TrendingUp,
  PanelLeft,
  PanelLeftClose,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  matchFn: (pathname: string, href: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    labelKey: "dashboard",
    icon: Search,
    matchFn: (p, h) => p.startsWith(h),
  },
  {
    href: "/search",
    labelKey: "search",
    icon: Search,
    matchFn: (p, h) => p.startsWith(h),
  },
  {
    href: "/search-analytics",
    labelKey: "searchAnalytics",
    icon: TrendingUp,
    matchFn: (p, h) => p.startsWith(h),
  },
  {
    href: "/sessions",
    labelKey: "sessions",
    icon: Layers,
    matchFn: (p, h) => p.startsWith(h),
  },
  {
    href: "/interactions",
    labelKey: "interactions",
    icon: BarChart3,
    matchFn: (p, h) => p.startsWith(h),
  },
  {
    href: "/profiles",
    labelKey: "profiles",
    icon: UserCheck,
    matchFn: (p, h) => p.startsWith(h),
  },
  {
    href: "/evaluations",
    labelKey: "evaluations",
    icon: FileCheck,
    matchFn: (p, h) => p.startsWith(h),
  },
  {
    href: "/agent-playbooks",
    labelKey: "agentPlaybooks",
    icon: BookMarked,
    matchFn: (p, h) => p.startsWith(h),
  },
  {
    href: "/user-playbooks",
    labelKey: "userPlaybooks",
    icon: BookOpen,
    matchFn: (p, h) => p.startsWith(h),
  },
  {
    href: "/settings",
    labelKey: "settings",
    icon: SettingsIcon,
    matchFn: (p, h) => p.startsWith(h + "/") || p === h,
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLocale();

  const navLabel = (key: string) =>
    (t.nav as Record<string, string>)[key] ?? key;

  return (
    <ScrollArea className="h-full">
      <div className={cn("flex flex-col gap-1 px-2 py-4", collapsed && "items-center px-2")}>
        {/* Toggle button */}
        <div className={cn("mb-2", collapsed ? "w-full flex justify-center" : "flex justify-end")}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onToggle}
            title={t.nav.collapseSidebar}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Nav links */}
        {NAV_ITEMS.map((item) => {
          const isActive = item.matchFn(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap",
                collapsed && "justify-center px-0 w-full",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
              title={collapsed ? navLabel(item.labelKey) : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{navLabel(item.labelKey)}</span>}
            </Link>
          );
        })}
      </div>
    </ScrollArea>
  );
}