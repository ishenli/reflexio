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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/context";
import { ScrollArea } from "@/components/ui/scroll-area";


export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <ScrollArea className="h-full">
      <div className="px-3 py-4">
         {/* Search (top-level — first) */}
        <div className="mb-3">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
              pathname.startsWith("/dashboard")
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <Search className="h-4 w-4" />
            <span>{t.nav.dashboard}</span>
          </Link>
        </div>

        {/* Search (top-level — first) */}
        <div className="mb-3">
          <Link
            href="/search"
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
              pathname.startsWith("/search")
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <Search className="h-4 w-4" />
            <span>{t.nav.search}</span>
          </Link>
        </div>

        {/* Sessions (top-level) */}
        <div className="mb-3">
          <Link
            href="/sessions"
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
              pathname.startsWith("/sessions")
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <Layers className="h-4 w-4" />
            <span>{t.nav.sessions}</span>
          </Link>
        </div>

        {/* Interactions (top-level) */}
        <div className="mb-3">
          <Link
            href="/interactions"
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
              pathname.startsWith("/interactions")
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <BarChart3 className="h-4 w-4" />
            <span>{t.nav.interactions}</span>
          </Link>
        </div>

        {/* Profiles (top-level) */}
        <div className="mb-3">
          <Link
            href="/profiles"
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
              pathname.startsWith("/profiles")
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <UserCheck className="h-4 w-4" />
            <span>{t.nav.profiles}</span>
          </Link>
        </div>


        {/* Evaluations (top-level) */}
        <div className="mb-3">
          <Link
            href="/evaluations"
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
              pathname.startsWith("/evaluations")
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <FileCheck className="h-4 w-4" />
            <span>{t.nav.evaluations}</span>
          </Link>
        </div>

        {/* Agent Playbooks (top-level) */}
        <div className="mb-3">
          <Link
            href="/agent-playbooks"
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
              pathname.startsWith("/agent-playbooks")
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <BookMarked className="h-4 w-4" />
            <span>{t.nav.agentPlaybooks}</span>
          </Link>
        </div>

        {/* User Playbooks (top-level) */}
        <div className="mb-3">
          <Link
            href="/user-playbooks"
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
              pathname.startsWith("/user-playbooks")
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <BookOpen className="h-4 w-4" />
            <span>{t.nav.userPlaybooks}</span>
          </Link>
        </div>

        {/* Settings (top-level) */}
        <div className="mb-3">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
              pathname.startsWith("/settings/") || pathname === "/settings"
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <SettingsIcon className="h-4 w-4" />
            <span>{t.nav.settings}</span>
          </Link>
        </div>
      </div>
    </ScrollArea>
  );
}