"use client";

import { useMemo, useState, useCallback } from "react";
import {
  BookOpen,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  RefreshCw,
  Layers,
  CheckCircle,
  Archive,
  Clock,
  Info,
  Lightbulb,
  Target,
  BookText,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { useLocale, fmt } from "@/lib/i18n/context";
import { useUserPlaybooksData } from "./use-user-playbooks-data";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { JsonView } from "@/components/method/json-view";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  upgradeUserPlaybooks,
  downgradeUserPlaybooks,
  updateUserPlaybookStatus,
} from "@/lib/user-playbooks-api";
import type { UserPlaybookView } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  current: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  archived: "bg-muted text-muted-foreground",
};

const EMPTY_FILTER = "__none__";

export default function UserPlaybooksPage() {
  const { apiEndpoint } = useSettings();
  const { t } = useLocale();
  const {
    data,
    loading,
    error,
    refresh,
    removePlaybook,
    search,
    createPlaybook,
  } = useUserPlaybooksData(apiEndpoint);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlaybookName, setFilterPlaybookName] = useState<string>("all");

  // Lifecycle confirmation dialog
  const [showLifecycleDialog, setShowLifecycleDialog] = useState<
    "upgrade" | "downgrade" | null
  >(null);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [lifecycleResult, setLifecycleResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newPlaybook, setNewPlaybook] = useState({
    agent_version: "",
    request_id: "",
    playbook_name: "",
    content: "",
    trigger: "",
    source: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Compute unique playbook names & user ids
  const playbookNames = useMemo(() => {
    const names = new Set(
      data.playbooks.map((p) => p.playbook_name).filter(Boolean)
    );
    return Array.from(names).sort();
  }, [data.playbooks]);

  // Filter
  const filteredPlaybooks = useMemo(() => {
    let result = data.playbooks;

    if (filterStatus !== "all") {
      result = result.filter((p) => (p.status || "current") === filterStatus);
    }
    if (filterPlaybookName !== "all") {
      result = result.filter((p) => p.playbook_name === filterPlaybookName);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.content?.toLowerCase().includes(q) ||
          p.playbook_name?.toLowerCase().includes(q) ||
          p.agent_version?.toLowerCase().includes(q) ||
          p.trigger?.toLowerCase().includes(q) ||
          p.rationale?.toLowerCase().includes(q) ||
          p.user_id?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [data.playbooks, filterStatus, filterPlaybookName, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    console.log('[DEBUG] data.playbooks:', data.playbooks.map(p => ({id: p.user_playbook_id, status: p.status})));
    const total = data.playbooks.length;
    // Current 状态在数据库中 status 为 null，不是字符串 "current"
    const current = data.playbooks.filter(
      (p) => !p.status || p.status === "current"
    ).length;
    const pending = data.playbooks.filter((p) => p.status === "pending").length;
    const archived = data.playbooks.filter((p) => p.status === "archived")
      .length;
    console.log('[DEBUG] stats:', {total, current, pending, archived});
    const uniqueUsers = new Set(data.playbooks.map((p) => p.user_id)).size;
    return { total, current, pending, archived, uniqueUsers };
  }, [data.playbooks]);

  // ─── Handlers ─────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!newPlaybook.agent_version || !newPlaybook.playbook_name) {
      setCreateError("Agent version and playbook name are required");
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      await createPlaybook(newPlaybook);
      setShowCreate(false);
      setNewPlaybook({
        agent_version: "",
        request_id: "",
        playbook_name: "",
        content: "",
        trigger: "",
        source: "",
      });
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create playbook"
      );
    } finally {
      setCreateLoading(false);
    }
  }, [newPlaybook, createPlaybook]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      search(searchQuery);
    },
    [search, searchQuery]
  );

  const handleLifecycle = useCallback(
    async (operation: "upgrade" | "downgrade") => {
      setLifecycleLoading(true);
      setLifecycleResult(null);
      try {
        const fn =
          operation === "upgrade" ? upgradeUserPlaybooks : downgradeUserPlaybooks;
        const result = await fn(apiEndpoint);
        setLifecycleResult({
          success: result.success,
          message: result.msg || (result.success ? t.common.done : "Failed"),
        });
        if (result.success) {
          refresh();
        }
      } catch (err) {
        setLifecycleResult({
          success: false,
          message: err instanceof Error ? err.message : t.userPlaybooks.operationFailed,
        });
      } finally {
        setLifecycleLoading(false);
      }
    },
    [apiEndpoint, refresh]
  );

  if (loading) {
    return (
      <div className="flex-1 min-w-0 overflow-auto p-6 space-y-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.userPlaybooks.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t.userPlaybooks.desc}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LifecycleButton
            operation="upgrade"
            onClick={() => setShowLifecycleDialog("upgrade")}
            disabled={loading}
          />
          <LifecycleButton
            operation="downgrade"
            onClick={() => setShowLifecycleDialog("downgrade")}
            disabled={loading}
          />
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t.userPlaybooks.newPlaybook}
          </Button>
          <Button size="sm" variant="ghost" onClick={refresh}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Concept Explanation Panel */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <details className="group">
          <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-accent/30 transition-colors list-none">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <Lightbulb className="size-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t.userPlaybooks.howItWorks}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.userPlaybooks.tapToExpand}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-4 border-t border-border">
            <div className="grid gap-4 sm:grid-cols-3 pt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
                    <Target className="size-3 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs font-semibold">{t.userPlaybooks.trigger}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The condition or context when this rule applies. Designed to be
                  evaluable at the <strong>earliest possible decision point</strong>{" "}
                  so a future agent can act before trouble arises. Only facts
                  observable at that moment are used.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/10">
                    <BookText className="size-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs font-semibold">{t.userPlaybooks.content}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The actionable instruction for the agent. Written as an
                  action rule (<em>&quot;Verify all PRs are merged before deploying&quot;</em>
                  ) or an avoidance rule (<em>&quot;Avoid assuming backward compatibility&quot;</em>
                  ) when backed by a clear failure pattern.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-purple-500/10">
                    <Info className="size-3 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs font-semibold">{t.userPlaybooks.rationale}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The reasoning behind the rule — why it exists. Generated first
                  by the LLM to condition the rest of the extraction, and helps
                  agents judge whether the rule applies to their current context.
                </p>
              </div>
            </div>
          </div>
        </details>
      </div>

      {/* Lifecycle status banner */}
      {lifecycleResult && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 space-y-2">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg",
                  lifecycleResult.success
                    ? "bg-emerald-500/10"
                    : "bg-red-500/10"
                )}
              >
                {lifecycleResult.success ? (
                  <CheckCircle className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Archive className="size-3.5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    lifecycleResult.success
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-red-700 dark:text-red-300"
                  )}
                >
                  {lifecycleResult.success
                    ? t.userPlaybooks.lifecycleApplied
                    : t.userPlaybooks.operationFailed}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lifecycleResult.message}
                </p>
              </div>
              <button
                onClick={() => setLifecycleResult(null)}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <ChevronDown className="h-4 w-4 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.userPlaybooks.totalPlaybooks}
          value={stats.total}
          description={t.common.total}
          icon={BookOpen}
          iconClassName="bg-blue-500/10 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400"
        />
        <StatCard
          title={t.userPlaybooks.activeInUse}
          value={stats.current}
          description={t.userPlaybooks.activeInUse.toLowerCase()}
          icon={CheckCircle}
          iconClassName="bg-emerald-500/10 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400"
        />
        <StatCard
          title={t.userPlaybooks.awaitingUpgrade}
          value={stats.pending}
          description={t.common.pendingItems.toLowerCase()}
          icon={Clock}
          iconClassName="bg-amber-500/10 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
        />
        <StatCard
          title={t.common.uniqueUsers}
          value={stats.uniqueUsers}
          description={t.common.total}
          icon={BookOpen}
          iconClassName="bg-violet-500/10 [&>svg]:text-violet-600 dark:[&>svg]:text-violet-400"
        />
      </div>

      {/* Search & Filters */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-3 border-b border-border">
          <div className="flex flex-wrap items-center gap-3">
            <form
              onSubmit={handleSearch}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.userPlaybooks.searchPlaceholder}
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <Button type="submit" size="xs" variant="secondary">
                Search
              </Button>
            </form>
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="all">{t.userPlaybooks.allStatuses}</option>
                <option value="current">{t.common.currentItems}</option>
                <option value="pending">{t.common.pendingItems}</option>
                <option value="archived">{t.common.archivedItems}</option>
              </select>
              <select
                value={filterPlaybookName}
                onChange={(e) => setFilterPlaybookName(e.target.value)}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="all">{t.userPlaybooks.allCategories}</option>
                {playbookNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="px-5 py-2 border-b border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            {filteredPlaybooks.length} {t.common.total.toLowerCase()}
            {filteredPlaybooks.length !== 1 ? "s" : ""}
            {(filterStatus !== "all" ||
              filterPlaybookName !== "all" ||
              searchQuery.trim()) && (
              <span className="ml-1">
                ({fmt(t.common.filtered, { total: data.playbooks.length })})
              </span>
            )}
          </p>
        </div>

        {/* Table */}
        <UserPlaybooksTable
          playbooks={filteredPlaybooks}
          onDelete={removePlaybook}
          onPromote={(id) => updateUserPlaybookStatus(apiEndpoint, id, "promote")}
          onArchive={(id) => updateUserPlaybookStatus(apiEndpoint, id, "archive")}
          onActionSuccess={refresh}
        />
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-lg p-6 space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Create User Playbook</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="h-4 w-4 rotate-180" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">
                  Agent Version *
                </label>
                <Input
                  value={newPlaybook.agent_version}
                  onChange={(e) =>
                    setNewPlaybook({
                      ...newPlaybook,
                      agent_version: e.target.value,
                    })
                  }
                  placeholder="e.g. v1.0.0"
                  className="h-8 text-xs font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Playbook Name *
                </label>
                <Input
                  value={newPlaybook.playbook_name}
                  onChange={(e) =>
                    setNewPlaybook({
                      ...newPlaybook,
                      playbook_name: e.target.value,
                    })
                  }
                  placeholder="e.g. greeting, error_handling..."
                  className="h-8 text-xs font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Request ID
                </label>
                <Input
                  value={newPlaybook.request_id}
                  onChange={(e) =>
                    setNewPlaybook({
                      ...newPlaybook,
                      request_id: e.target.value,
                    })
                  }
                  placeholder="req-xxx"
                  className="h-8 text-xs font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Source</label>
                <Input
                  value={newPlaybook.source}
                  onChange={(e) =>
                    setNewPlaybook({
                      ...newPlaybook,
                      source: e.target.value,
                    })
                  }
                  placeholder="e.g. claude_code"
                  className="h-8 text-xs font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Content
                </label>
                <textarea
                  value={newPlaybook.content}
                  onChange={(e) =>
                    setNewPlaybook({
                      ...newPlaybook,
                      content: e.target.value,
                    })
                  }
                  placeholder="Playbook content..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono mt-1 min-h-[100px] resize-y"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Trigger
                </label>
                <textarea
                  value={newPlaybook.trigger}
                  onChange={(e) =>
                    setNewPlaybook({
                      ...newPlaybook,
                      trigger: e.target.value,
                    })
                  }
                  placeholder="Trigger condition..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono mt-1 min-h-[60px] resize-y"
                />
              </div>
              {createError && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  {createError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={createLoading}>
                {createLoading && (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                )}
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lifecycle Confirmation Dialog */}
      {showLifecycleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-lg mx-4 overflow-hidden">
            {/* Title */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg",
                    showLifecycleDialog === "upgrade"
                      ? "bg-emerald-500/10"
                      : "bg-amber-500/10"
                  )}
                >
                  {showLifecycleDialog === "upgrade" ? (
                    <Layers className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Archive className="size-3.5 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">
                    {showLifecycleDialog === "upgrade"
                      ? t.userPlaybooks.upgradeTitle
                      : t.userPlaybooks.downgradeTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {showLifecycleDialog === "upgrade"
                      ? t.userPlaybooks.upgradeDesc
                      : t.userPlaybooks.downgradeDesc}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowLifecycleDialog(null);
                  setLifecycleResult(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="h-4 w-4 rotate-180" />
              </button>
            </div>

            {/* State change preview */}
            <div className="px-5 py-4 space-y-4">
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="text-xs font-medium px-3 py-2 bg-muted/20 border-b border-border text-muted-foreground">
                  {t.userPlaybooks.changesBreakdown}
                </div>
                {showLifecycleDialog === "upgrade" ? (
                  <div className="divide-y divide-border">
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-xs">{t.userPlaybooks.pendingToActive}</span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {stats.pending} {t.common.total.toLowerCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-xs">{t.userPlaybooks.currentToArchived}</span>
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {stats.current} {t.common.total.toLowerCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-xs">{t.userPlaybooks.archivedToDeleted}</span>
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                        {stats.archived} {t.common.total.toLowerCase()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-xs">Archived → Active (restore)</span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {stats.archived} {t.common.total.toLowerCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-xs">{t.userPlaybooks.currentToArchived}</span>
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {stats.current} {t.common.total.toLowerCase()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Warning */}
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  {showLifecycleDialog === "upgrade"
                    ? t.userPlaybooks.upgradeWarning
                    : t.userPlaybooks.downgradeWarning}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {showLifecycleDialog === "upgrade"
                    ? t.userPlaybooks.upgradeWarningDetail
                    : t.userPlaybooks.downgradeWarningDetail}
                </p>
              </div>

              {/* Result after operation */}
              {lifecycleResult && (
                <div
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-xs",
                    lifecycleResult.success
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                      : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 text-red-700 dark:text-red-300"
                  )}
                >
                  {lifecycleResult.message}
                </div>
              )}
            </div>

            {/* Actions */}
            {!lifecycleResult?.success && (
              <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-muted/10">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowLifecycleDialog(null);
                    setLifecycleResult(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant={showLifecycleDialog === "upgrade" ? "default" : "secondary"}
                  onClick={() => handleLifecycle(showLifecycleDialog)}
                  disabled={lifecycleLoading}
                  className={
                    showLifecycleDialog === "upgrade"
                      ? ""
                      : "bg-amber-500 hover:bg-amber-600 text-white"
                  }
                >
                  {lifecycleLoading && (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  )}
                  {showLifecycleDialog === "upgrade" ? t.userPlaybooks.upgrade : t.userPlaybooks.downgrade}
                </Button>
              </div>
            )}

            {/* Close after success */}
            {lifecycleResult?.success && (
              <div className="flex justify-end px-5 py-3 border-t border-border bg-muted/10">
                <Button
                  size="sm"
                  onClick={() => {
                    setShowLifecycleDialog(null);
                    setLifecycleResult(null);
                  }}
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UserPlaybooksTable({
  playbooks,
  onDelete,
  onPromote,
  onArchive,
  onActionSuccess,
}: {
  playbooks: UserPlaybookView[];
  onDelete: (id: number) => Promise<{ success: boolean; msg?: string }>;
  onPromote: (id: number) => Promise<{ success: boolean; msg?: string }>;
  onArchive: (id: number) => Promise<{ success: boolean; msg?: string }>;
  onActionSuccess?: () => void;
}) {
  const { t } = useLocale();
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  if (!playbooks.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BookOpen className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          {t.userPlaybooks.noPlaybooks}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {t.userPlaybooks.noPlaybooksHint}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-muted/50 backdrop-blur z-10">
          <tr>
            <th className="w-8 px-2 py-2" />
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
              {t.common.status}
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
              {t.userPlaybooks.source}
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
              {t.common.user}
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
              {t.common.agent}
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
              {t.common.tags}
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
              {t.common.date}
            </th>
            <th className="w-12 px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
              {t.common.actions}
            </th>
          </tr>
        </thead>
        <tbody>
          {playbooks.map((playbook, i) => {
            const isExpanded =
              expandedRow === playbook.user_playbook_id;
            const status = playbook.status || "current";
            return (
              <FragmentRow
                key={playbook.user_playbook_id}
                playbook={playbook}
                status={status}
                index={i}
                expanded={isExpanded}
                onToggle={() =>
                  setExpandedRow(
                    isExpanded ? null : playbook.user_playbook_id
                  )
                }
                onDelete={async () => {
                  setDeletingId(playbook.user_playbook_id);
                  await onDelete(playbook.user_playbook_id);
                  setDeletingId(null);
                }}
                onPromote={async () => {
                  setActionLoadingId(playbook.user_playbook_id);
                  const result = await onPromote(playbook.user_playbook_id);
                  setActionLoadingId(null);
                  if (result.success && onActionSuccess) onActionSuccess();
                }}
                onArchive={async () => {
                  setActionLoadingId(playbook.user_playbook_id);
                  const result = await onArchive(playbook.user_playbook_id);
                  setActionLoadingId(null);
                  if (result.success && onActionSuccess) onActionSuccess();
                }}
                deletingId={deletingId}
                actionLoadingId={actionLoadingId}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRow({
  playbook,
  status,
  index,
  expanded,
  onToggle,
  onDelete,
  onPromote,
  onArchive,
  deletingId,
  actionLoadingId,
}: {
  playbook: UserPlaybookView;
  status: string;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => Promise<void>;
  onPromote: () => Promise<void>;
  onArchive: () => Promise<void>;
  deletingId: number | null;
  actionLoadingId: number | null;
}) {
  const { t } = useLocale();
  const isDeleting = deletingId === playbook.user_playbook_id;
  const isLoading = actionLoadingId === playbook.user_playbook_id;

  return (
    <>
      <tr
        className={cn(
          "border-b border-border hover:bg-muted/30 cursor-pointer transition-colors",
          index % 2 === 0 ? "bg-transparent" : "bg-muted/10",
          expanded && "bg-accent/30"
        )}
        onClick={onToggle}
      >
        <td className="px-2 py-1.5 text-muted-foreground">
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </td>
        <td className="px-3 py-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium",
              STATUS_COLORS[status] || "bg-muted text-muted-foreground"
            )}
          >
            {status}
          </span>
        </td>
        <td className="px-3 py-1.5 font-medium font-mono text-muted-foreground max-w-[160px] truncate" title={playbook.source || ""}>
          {playbook.source || "—"}
        </td>
        <td className="px-3 py-1.5 font-mono text-muted-foreground max-w-[100px] truncate">
          {playbook.user_id || "—"}
        </td>
        <td className="px-3 py-1.5 font-mono text-muted-foreground">
          {playbook.agent_version}
        </td>
        <td className="px-3 py-1.5">
          <div className="flex flex-wrap gap-1">
            {playbook.tags && playbook.tags.length > 0
              ? playbook.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))
              : null}
            {playbook.tags && playbook.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{playbook.tags.length - 3}
              </span>
            )}
            {(!playbook.tags || playbook.tags.length === 0) && (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </td>
        <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
          {playbook.created_at > 0
            ? new Date(playbook.created_at * 1000).toLocaleDateString()
            : "—"}
        </td>
        <td className="px-3 py-1.5">
          <div className="flex items-center gap-1">
            {/* Promote/Restore button: show for PENDING or ARCHIVED status */}
            {(status === "pending" || status === "archived") && (
              <button
                title={status === "pending" ? t.userPlaybooks.upgrade : "Restore"}
                onClick={(e) => {
                  e.stopPropagation();
                  const msg = status === "pending" ? t.userPlaybooks.upgrade + "?" : "Restore to current?";
                  if (confirm(msg)) onPromote();
                }}
                disabled={isLoading}
                className="rounded p-1 text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            {/* Archive button: show for CURRENT status */}
            {(status === "current" || status === null) && (
              <button
                title={t.userPlaybooks.downgrade}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(t.userPlaybooks.downgrade + "?")) onArchive();
                }}
                disabled={isLoading}
                className="rounded p-1 text-amber-600 hover:bg-amber-500/10 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Archive className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            {/* Delete button */}
            <button
              title={t.common.delete}
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(t.common.delete + "?")) onDelete();
              }}
              disabled={isDeleting}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="p-0">
            <div className="bg-muted/20 border-b border-border">
              <div className="p-4 space-y-3">
                {playbook.content && (
                  <DetailSection
                    title="Content"
                    content={playbook.content}
                    icon={<BookText className="size-3" />}
                    tooltip="Actionable instruction for the agent — what to do or avoid"
                  />
                )}
                {playbook.trigger && (
                  <DetailSection
                    title="Trigger"
                    content={playbook.trigger}
                    icon={<Target className="size-3" />}
                    tooltip="Condition or context when this rule applies, evaluable at the earliest decision point"
                  />
                )}
                {playbook.rationale && (
                  <DetailSection
                    title="Rationale"
                    content={playbook.rationale}
                    icon={<Info className="size-3" />}
                    tooltip="Why this rule exists — helps agents judge applicability"
                  />
                )}
                {playbook.source && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">
                      {t.userPlaybooks.source}
                    </h4>
                    <p className="text-xs font-mono text-foreground">
                      {playbook.source}
                    </p>
                  </div>
                )}
                {playbook.source_interaction_ids?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">
                      {t.userPlaybooks.sourceInteractions}
                    </h4>
                    <p className="text-xs font-mono text-muted-foreground">
                      {playbook.source_interaction_ids.join(", ")}
                    </p>
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">
                    {t.userPlaybooks.fullObject}
                  </h4>
                  <div className="max-h-60 overflow-auto rounded-md bg-muted/40">
                    <JsonView json={JSON.stringify(playbook, null, 2)} />
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function LifecycleButton({
  operation,
  onClick,
  disabled,
}: {
  operation: "upgrade" | "downgrade";
  onClick: () => void;
  disabled: boolean;
}) {
  const { t } = useLocale();
  const isUpgrade = operation === "upgrade";
  return (
    <Button
      size="sm"
      variant={isUpgrade ? "default" : "secondary"}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        !isUpgrade && "bg-amber-500 hover:bg-amber-600 text-white"
      )}
    >
      {isUpgrade ? (
        <Layers className="h-3.5 w-3.5 mr-1" />
      ) : (
        <Archive className="h-3.5 w-3.5 mr-1" />
      )}
      {isUpgrade ? t.userPlaybooks.upgrade : t.userPlaybooks.downgrade}
    </Button>
  );
}

function DetailSection({
  title,
  content,
  icon,
  tooltip,
}: {
  title: string;
  content: string;
  icon?: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
        {title}
        {icon && tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={
                <span className="inline-flex items-center justify-center cursor-help rounded-full text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
              }>
                {icon}
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-64">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </h4>
      <div className="rounded-md bg-muted/30 px-3 py-2 text-xs whitespace-pre-wrap font-mono leading-relaxed">
        {content}
      </div>
    </div>
  );
}