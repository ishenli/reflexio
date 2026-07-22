"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  Users,
  UserCheck,
  Clock,
  Archive,
  Search,
  Eye,
  History,
  Tag,
  ChevronRight,
  Filter,
  X,
  ArrowRight,
  Play,
  Loader2,
  Sparkles,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  RefreshCw,
  Layers,
} from "lucide-react";
import {
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Link from "next/link";
import { useSettings } from "@/hooks/use-settings";
import { useLocale } from "@/lib/i18n/context";
import { useProfilesData } from "./use-profiles-data";
import { StatCard } from "@/components/dashboard/stat-card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JsonView } from "@/components/method/json-view";
import {
  fetchProfileGenerationOperationStatus,
  triggerManualProfileGeneration,
  upgradeAllProfiles,
  downgradeAllProfiles,
} from "@/lib/profiles-api";
import type { ProfileGenerationOperationStatus } from "@/lib/profiles-api";
import type { LocaleDict } from "@/lib/i18n/locales";
import type { ProfileView } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  current: "var(--chart-2)",
  pending: "var(--chart-4)",
  archived: "var(--chart-5)",
};

export default function ProfilesDashboard() {
  const { apiEndpoint } = useSettings();
  const { t } = useLocale();
  const { data, loading, error, refresh } = useProfilesData(apiEndpoint);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileView | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Manual generation dialog state
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateParams, setGenerateParams] = useState({
    user_id: "",
    source: "",
    extractor_names: "",
  });
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<string | null>(null);
  const [generationSubmitted, setGenerationSubmitted] = useState(false);
  const [operationStatus, setOperationStatus] =
    useState<ProfileGenerationOperationStatus | null>(null);
  const [operationStatusError, setOperationStatusError] = useState<string | null>(null);
  const [refreshedAfterCompletion, setRefreshedAfterCompletion] = useState(false);

  // Lifecycle (upgrade/downgrade) state
  const [showLifecycleDialog, setShowLifecycleDialog] = useState<"upgrade" | "downgrade" | null>(null);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [lifecycleResult, setLifecycleResult] = useState<{ success: boolean; message: string } | null>(null);

  const pollGenerationStatus = useCallback(async () => {
    try {
      const result = await fetchProfileGenerationOperationStatus(apiEndpoint);
      if (result.success) {
        setOperationStatus(result.operation_status);
        setOperationStatusError(null);
      } else {
        setOperationStatusError(result.msg || t.dashboard.operationStatusUnavailable);
      }
    } catch (err) {
      setOperationStatusError(
        err instanceof Error ? err.message : t.dashboard.operationStatusUnavailable
      );
    }
  }, [apiEndpoint, t.dashboard.operationStatusUnavailable]);

  useEffect(() => {
    if (!showGenerateDialog || !generationSubmitted) return;
    if (
      operationStatus?.status === "completed" ||
      operationStatus?.status === "failed" ||
      operationStatus?.status === "cancelled"
    ) {
      return;
    }

    void pollGenerationStatus();
    const interval = window.setInterval(() => {
      void pollGenerationStatus();
    }, 2000);

    return () => window.clearInterval(interval);
  }, [generationSubmitted, operationStatus?.status, pollGenerationStatus, showGenerateDialog]);

  useEffect(() => {
    if (!operationStatus) return;
    if (operationStatus.status === "completed" && !refreshedAfterCompletion) {
      setRefreshedAfterCompletion(true);
      refresh();
    }
  }, [operationStatus?.status, refreshedAfterCompletion, refresh]);

  const handleManualGenerate = useCallback(async () => {
    setGenerating(true);
    setGenerateResult(null);
    try {
      const result = await triggerManualProfileGeneration(apiEndpoint, {
        user_id: generateParams.user_id || undefined,
        source: generateParams.source || undefined,
        extractor_names: generateParams.extractor_names
          ? generateParams.extractor_names.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      });
      const details = [
        result.success ? t.dashboard.generationStarted : t.dashboard.generationFailed,
        result.msg || "",
      ].filter(Boolean).join(": ");
      setGenerateResult(details);
      setGenerationSubmitted(true);
      setRefreshedAfterCompletion(false);
      void pollGenerationStatus();
    } catch (err) {
      setGenerateResult(
        err instanceof Error ? `${t.dashboard.error}: ${err.message}` : t.dashboard.anUnknownErrorOccurred
      );
    } finally {
      setGenerating(false);
    }
  }, [apiEndpoint, generateParams, pollGenerationStatus, t.dashboard.anUnknownErrorOccurred, t.dashboard.error, t.dashboard.generationFailed, t.dashboard.generationStarted]);

  const handleLifecycle = useCallback(
    async (operation: "upgrade" | "downgrade") => {
      setLifecycleLoading(true);
      setLifecycleResult(null);
      try {
        const fn = operation === "upgrade" ? upgradeAllProfiles : downgradeAllProfiles;
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
          message: err instanceof Error ? err.message : "Operation failed",
        });
      } finally {
        setLifecycleLoading(false);
      }
    },
    [apiEndpoint, refresh]
  );

  const {
    totalProfiles,
    currentCount,
    pendingCount,
    archivedCount,
    uniqueUsers,
    statusDistribution,
    usersList,
    filteredProfiles,
  } = useMemo(() => {
    const result = computeMetrics(data.allProfiles, {
      searchQuery,
      selectedUser,
      statusFilter,
    });
    return result;
  }, [data.allProfiles, searchQuery, selectedUser, statusFilter]);

  if (loading) {
    return (
      <div className="flex-1 min-w-0 overflow-auto p-6 space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.dashboard.profilesTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t.dashboard.profilesDesc}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Lifecycle Buttons */}
          <LifecycleButton
            operation="upgrade"
            onClick={() => {
              setLifecycleResult(null);
              setShowLifecycleDialog("upgrade");
            }}
            disabled={loading}
          />
          <LifecycleButton
            operation="downgrade"
            onClick={() => {
              setLifecycleResult(null);
              setShowLifecycleDialog("downgrade");
            }}
            disabled={loading}
          />
          <Button
            size="sm"
            onClick={() => {
              setGenerateResult(null);
              setGenerationSubmitted(false);
              setOperationStatus(null);
              setOperationStatusError(null);
              setRefreshedAfterCompletion(false);
              setGenerateParams({ user_id: "", source: "", extractor_names: "" });
              setShowGenerateDialog(true);
            }}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            {t.common.generate}
          </Button>
          <Button variant="outline" size="sm" onClick={refresh}>
            {t.common.refresh}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.dashboard.totalProfiles}
          value={totalProfiles}
          description={t.dashboard.totalProfiles.toLowerCase()}
          icon={Users}
          iconClassName="bg-blue-500/10 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400"
        />
        <StatCard
          title={t.dashboard.currentItems}
          value={currentCount}
          description={t.dashboard.activeProfiles}
          icon={UserCheck}
          iconClassName="bg-emerald-500/10 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400"
        />
        <StatCard
          title={t.dashboard.pendingItems}
          value={pendingCount}
          description={t.dashboard.awaitingApproval}
          icon={Clock}
          iconClassName="bg-amber-500/10 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
        />
        <StatCard
          title={t.dashboard.uniqueUsers}
          value={uniqueUsers}
          description={t.dashboard.uniqueUsers.toLowerCase()}
          icon={Archive}
          iconClassName="bg-purple-500/10 [&>svg]:text-purple-600 dark:[&>svg]:text-purple-400"
        />
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.dashboard.searchProfiles}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {["current", "pending", "archived"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(statusFilter === status ? null : status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Active Filters */}
      {(selectedUser || statusFilter) && (
        <div className="flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{t.dashboard.filters}:</span>
          {selectedUser && (
            <Badge variant="secondary" className="gap-1">
              {t.dashboard.userLabel}: {selectedUser.slice(0, 20)}...
              <button onClick={() => setSelectedUser(null)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {statusFilter && (
            <Badge variant="secondary" className="gap-1 capitalize">
              {t.dashboard.statusLabel}: {statusFilter}
              <button onClick={() => setStatusFilter(null)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto py-0 px-2 text-xs"
            onClick={() => {
              setSelectedUser(null);
              setStatusFilter(null);
            }}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Main Content: Users + Profiles */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Users List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users ({usersList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="divide-y divide-border">
                {usersList.map((user) => (
                  <button
                    key={user.userId}
                    onClick={() => setSelectedUser(user.userId)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors hover:bg-accent",
                      selectedUser === user.userId && "bg-accent"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.userId.length > 30
                            ? `${user.userId.slice(0, 30)}...`
                            : user.userId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.profileCount}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </button>
                ))}
                {usersList.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No users found
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Profile List or Detail */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {selectedUser ? t.dashboard.profilesTitle : t.dashboard.allProfiles}
              {filteredProfiles.length > 0 && (
                <span className="text-muted-foreground ml-2">
                  ({filteredProfiles.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="divide-y divide-border">
                {filteredProfiles.map((profile) => (
                  <div
                    key={profile.profile_id}
                    className="px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedProfile(profile)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate">
                            {profile.profile_id}
                          </p>
                          <StatusBadge status={profile.status} />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {profile.content || t.dashboard.noContent}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {profile.source && (
                            <span className="flex items-center gap-1">
                              <History className="h-3 w-3" />
                              {profile.source}
                            </span>
                          )}
                          {profile.tags && profile.tags.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {profile.tags.length} {t.common.tags.toLowerCase()}
                            </span>
                          )}
                          <span>
                            {profile.last_modified_timestamp > 0
                              ? new Date(profile.last_modified_timestamp * 1000).toLocaleDateString()
                              : t.dashboard.unknownDate}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </div>
                ))}
                {filteredProfiles.length === 0 && (
                  <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {searchQuery || selectedUser || statusFilter
                      ? t.dashboard.noProfilesMatch
                      : t.dashboard.noProfilesFound}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution Chart */}
      {statusDistribution.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <StatusDistributionChart data={statusDistribution} />
        </div>
      )}

      {/* Profile Detail Dialog */}
      <ProfileDetailDialog
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />

      {/* Manual Generate Dialog */}
      {showGenerateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-lg p-6 space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">{t.dashboard.manualGeneration}</h3>
              </div>
              <button
                onClick={() => setShowGenerateDialog(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.dashboard.manualGenerationDesc}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">
                  {t.dashboard.userId} <span className="text-muted-foreground/50">{t.dashboard.optional} — all users if empty</span>
                </label>
                <Input
                  value={generateParams.user_id}
                  onChange={(e) =>
                    setGenerateParams({ ...generateParams, user_id: e.target.value })
                  }
                  placeholder="user-xxx"
                  className="h-8 text-xs font-mono mt-1"
                  disabled={generating}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Source <span className="text-muted-foreground/50">(optional)</span>
                </label>
                <Input
                  value={generateParams.source}
                  onChange={(e) =>
                    setGenerateParams({ ...generateParams, source: e.target.value })
                  }
                  placeholder="e.g. claude_code, swe_bench"
                  className="h-8 text-xs font-mono mt-1"
                  disabled={generating}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Extractor Names <span className="text-muted-foreground/50">(optional, comma-separated)</span>
                </label>
                <Input
                  value={generateParams.extractor_names}
                  onChange={(e) =>
                    setGenerateParams({ ...generateParams, extractor_names: e.target.value })
                  }
                  placeholder="extractor-1, extractor-2"
                  className="h-8 text-xs font-mono mt-1"
                  disabled={generating}
                />
              </div>
            </div>

            {generateResult && (
              <div
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs",
                  generateResult.startsWith("Error") || generateResult.startsWith("Generation failed")
                    ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 text-red-800 dark:text-red-200"
                    : "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200"
                )}
              >
                {generateResult}
              </div>
            )}

            <GenerationChainStatus
              submitted={generationSubmitted}
              submitting={generating}
              operationStatus={operationStatus}
              operationStatusError={operationStatusError}
            />

            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowGenerateDialog(false)}
                disabled={generating}
              >
                {t.common.close}
              </Button>
              <Button size="sm" onClick={handleManualGenerate} disabled={generating}>
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 mr-1" />
                )}
                {t.dashboard.runGeneration}
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
                    <ArrowUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Archive className="size-3.5 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">
                    {showLifecycleDialog === "upgrade"
                      ? t.dashboard.upgradeProfiles
                      : t.dashboard.downgradeProfiles}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {showLifecycleDialog === "upgrade"
                      ? t.dashboard.upgradeProfilesDesc
                      : t.dashboard.downgradeProfilesDesc}
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
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Warning */}
            <div className="px-5 py-4 space-y-4">
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-4 py-3">
                <div className="flex items-start gap-2">
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 mt-0.5">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">!</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      {showLifecycleDialog === "upgrade"
                        ? t.dashboard.upgradeConfirm
                        : t.dashboard.downgradeConfirm}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      {showLifecycleDialog === "upgrade"
                        ? t.dashboard.upgradeConfirmDetail
                        : t.dashboard.downgradeConfirmDetail}
                    </p>
                  </div>
                </div>
              </div>

              {lifecycleResult && (
                <div
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-xs flex items-center gap-2",
                    lifecycleResult.success
                      ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200"
                      : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200"
                  )}
                >
                  {lifecycleResult.success ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {lifecycleResult.message}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border bg-muted/20">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowLifecycleDialog(null);
                  setLifecycleResult(null);
                }}
                disabled={lifecycleLoading}
              >
                {t.common.close}
              </Button>
              <Button
                size="sm"
                variant={showLifecycleDialog === "upgrade" ? "default" : "default"}
                onClick={() => handleLifecycle(showLifecycleDialog)}
                disabled={lifecycleLoading}
                className={
                  showLifecycleDialog === "downgrade" ? "bg-amber-600 hover:bg-amber-700" : ""
                }
              >
                {lifecycleLoading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                )}
                {showLifecycleDialog === "upgrade"
                  ? t.dashboard.upgradeAll
                  : t.dashboard.downgradeAll}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Metrics Computation ─────────────────────────────────────────────

interface FilterOptions {
  searchQuery: string;
  selectedUser: string | null;
  statusFilter: string | null;
}

function computeMetrics(profiles: ProfileView[], filters: FilterOptions) {
  const { searchQuery, selectedUser, statusFilter } = filters;

  // Build user list
  const userMap = new Map<string, { profileCount: number; profiles: ProfileView[] }>();

  for (const p of profiles) {
    const existing = userMap.get(p.user_id);
    if (existing) {
      existing.profileCount++;
      existing.profiles.push(p);
    } else {
      userMap.set(p.user_id, { profileCount: 1, profiles: [p] });
    }
  }

  const usersList = Array.from(userMap.entries())
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.profileCount - a.profileCount);

  // Filter profiles
  let filteredProfiles = profiles;

  if (selectedUser) {
    filteredProfiles = filteredProfiles.filter((p) => p.user_id === selectedUser);
  }

  if (statusFilter) {
    filteredProfiles = filteredProfiles.filter(
      (p) => (p.status || "current") === statusFilter
    );
  }

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredProfiles = filteredProfiles.filter(
      (p) =>
        p.content?.toLowerCase().includes(query) ||
        p.user_id.toLowerCase().includes(query) ||
        p.profile_id.toLowerCase().includes(query) ||
        p.tags?.some((t) => t.toLowerCase().includes(query))
    );
  }

  // Stats
  let currentCount = 0;
  let pendingCount = 0;
  let archivedCount = 0;
  const statusCount: Record<string, number> = {};

  for (const p of profiles) {
    const status = p.status || "current";
    if (status === "current") currentCount++;
    else if (status === "pending") pendingCount++;
    else if (status === "archived") archivedCount++;
    statusCount[status] = (statusCount[status] || 0) + 1;
  }

  const statusDistribution = Object.entries(statusCount)
    .map(([name, value]) => ({
      name,
      value,
      color: STATUS_COLORS[name] || "var(--chart-3)",
    }))
    .sort((a, b) => b.value - a.value);

  return {
    totalProfiles: profiles.length,
    currentCount,
    pendingCount,
    archivedCount,
    uniqueUsers: userMap.size,
    statusDistribution,
    usersList,
    filteredProfiles,
  };
}

// ─── Components ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  const normalized = status || "current";

  const colorClasses: Record<string, string> = {
    current: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    archived: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium",
        colorClasses[normalized] || colorClasses.current
      )}
    >
      {normalized}
    </span>
  );
}

function GenerationChainStatus({
  submitted,
  submitting,
  operationStatus,
  operationStatusError,
}: {
  submitted: boolean;
  submitting: boolean;
  operationStatus: ProfileGenerationOperationStatus | null;
  operationStatusError: string | null;
}) {
  const { t } = useLocale();
  const asyncStatus = operationStatus?.status;
  const progress = operationStatus
    ? Math.round(operationStatus.progress_percentage || 0)
    : 0;
  const isRunning = asyncStatus === "in_progress";
  const isTerminal =
    asyncStatus === "completed" ||
    asyncStatus === "failed" ||
    asyncStatus === "cancelled";
  const totalGenerated =
    typeof operationStatus?.stats?.total_generated === "number"
      ? operationStatus.stats.total_generated
      : null;
  const firstFailedUser = operationStatus?.failed_user_ids?.[0];

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
      <p className="mb-3 font-medium">{t.dashboard.generationFlow}</p>
      <div className="space-y-0">
        <GenerationFlowStep
          title={t.dashboard.syncGeneration}
          description={t.dashboard.syncGenerationDesc}
          label={
            submitting
              ? t.dashboard.submitting
              : submitted
                ? t.dashboard.submitted
                : t.dashboard.notSubmitted
          }
          tone={submitting ? "running" : submitted ? "success" : "muted"}
          pulse={submitting}
          connector
        />

        <GenerationFlowStep
          title={t.dashboard.asyncGeneration}
          description={t.dashboard.asyncGenerationDesc}
          label={operationStatus ? formatOperationStatus(asyncStatus, t) : t.dashboard.waiting}
          tone={operationStatus ? statusTone(asyncStatus) : "muted"}
          pulse={isRunning}
        />
      </div>

      {operationStatus && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{t.dashboard.progress}</span>
            <span className="font-medium text-foreground">
              {operationStatus.processed_users}/{operationStatus.total_users} · {progress}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                asyncStatus === "failed" || asyncStatus === "cancelled"
                  ? "bg-red-500"
                  : "bg-emerald-500"
              )}
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
          {operationStatus.current_user_id && isRunning && (
            <p className="truncate text-muted-foreground">
              {t.dashboard.currentUser}:{" "}
              <span className="font-mono text-foreground">
                {operationStatus.current_user_id}
              </span>
            </p>
          )}
          {operationStatus.failed_users > 0 && (
            <p className="text-red-600 dark:text-red-400">
              {t.dashboard.failedUsers}: {operationStatus.failed_users}
            </p>
          )}
          {totalGenerated !== null && isTerminal && (
            <p className="text-muted-foreground">
              {t.dashboard.generatedProfiles}:{" "}
              <span className="font-medium text-foreground">{totalGenerated}</span>
            </p>
          )}
          {firstFailedUser && (
            <p className="text-red-600 dark:text-red-400">
              <span className="font-mono">{firstFailedUser.user_id}</span>:{" "}
              {firstFailedUser.error}
            </p>
          )}
          {operationStatus.error_message && isTerminal && (
            <p className="text-red-600 dark:text-red-400">
              {operationStatus.error_message}
            </p>
          )}
        </div>
      )}

      {operationStatusError && (
        <p className="mt-3 text-red-600 dark:text-red-400">{operationStatusError}</p>
      )}
    </div>
  );
}

function GenerationFlowStep({
  title,
  description,
  label,
  tone,
  pulse = false,
  connector = false,
}: {
  title: string;
  description: string;
  label: string;
  tone: "muted" | "running" | "success" | "error";
  pulse?: boolean;
  connector?: boolean;
}) {
  return (
    <div className="grid grid-cols-[18px_1fr_auto] gap-x-3">
      <div className="relative flex justify-center">
        <span
          className={cn(
            "mt-1 size-2 rounded-full",
            tone === "success" && "bg-emerald-500",
            tone === "running" && "bg-blue-500",
            tone === "error" && "bg-red-500",
            tone === "muted" && "bg-muted-foreground/40",
            pulse && "animate-pulse"
          )}
        />
        {connector && (
          <span className="absolute top-4 bottom-0 w-px bg-border" />
        )}
      </div>
      <div className={cn("min-w-0 pb-4", !connector && "pb-0")}>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-muted-foreground">{description}</p>
      </div>
      <GenerationStateBadge label={label} tone={tone} pulse={pulse} />
    </div>
  );
}

function GenerationStateBadge({
  label,
  tone,
  pulse = false,
}: {
  label: string;
  tone: "muted" | "running" | "success" | "error";
  pulse?: boolean;
}) {
  const classes = {
    muted: "bg-muted text-muted-foreground",
    running: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    error: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-medium",
        classes[tone]
      )}
    >
      {pulse && <span className="mr-1.5 size-1.5 rounded-full bg-current animate-pulse" />}
      {label}
    </span>
  );
}

function formatOperationStatus(
  status: string | undefined,
  t: LocaleDict
) {
  if (status === "in_progress") return t.dashboard.inProgress;
  if (status === "completed") return t.dashboard.completed;
  if (status === "failed") return t.dashboard.failed;
  if (status === "cancelled") return t.dashboard.cancelled;
  return t.common.unknown;
}

function statusTone(status: string | undefined): "muted" | "running" | "success" | "error" {
  if (status === "in_progress") return "running";
  if (status === "completed") return "success";
  if (status === "failed" || status === "cancelled") return "error";
  return "muted";
}

function ProfileDetailDialog({
  profile,
  onClose,
}: {
  profile: ProfileView | null;
  onClose: () => void;
}) {
  const { t } = useLocale();
  if (!profile) return null;

  const open = !!profile;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base">{t.dashboard.profileDetails}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-6 pr-4">
            {/* Header Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {profile.profile_id}
                </code>
                <StatusBadge status={profile.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                User: <span className="font-mono">{profile.user_id}</span>
              </p>
            </div>

            <Tabs defaultValue="content">
              <TabsList className="w-full">
                <TabsTrigger value="content" className="flex-1">{t.userPlaybooks.content}</TabsTrigger>
                <TabsTrigger value="lineage" className="flex-1">{t.dashboard.lineage}</TabsTrigger>
                <TabsTrigger value="metadata" className="flex-1">{t.dashboard.metadata}</TabsTrigger>
              </TabsList>

              {/* Content Tab */}
              <TabsContent value="content" className="mt-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm whitespace-pre-wrap">{profile.content}</p>
                </div>
              </TabsContent>

              {/* Lineage Tab */}
              <TabsContent value="lineage" className="mt-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <History className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.dashboard.generatedFromRequest}</p>
                      <code className="text-xs font-mono text-muted-foreground">
                        {profile.generated_from_request_id}
                      </code>
                    </div>
                  </div>

                  {profile.source_span && (
                    <div className="flex items-start gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                        <Eye className="size-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.dashboard.sourceSpan}</p>
                        <p className="text-xs text-muted-foreground">{profile.source_span}</p>
                      </div>
                    </div>
                  )}

                  {profile.source_interaction_ids && profile.source_interaction_ids.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                        <ArrowRight className="size-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.dashboard.sourceInteractions}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {profile.source_interaction_ids.map((id) => (
                            <Link
                              key={id}
                              href={`/dashboard/interactions?highlight=${id}`}
                              onClick={onClose}
                            >
                              <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                                #{id}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {profile.source && (
                    <div className="flex items-start gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                        <Tag className="size-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.userPlaybooks.source}</p>
                        <p className="text-xs text-muted-foreground">{profile.source}</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Metadata Tab */}
              <TabsContent value="metadata" className="mt-4 space-y-4">
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Profile ID</span>
                    <code className="font-mono text-xs">{profile.profile_id}</code>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">User ID</span>
                    <code className="font-mono text-xs">{profile.user_id}</code>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">{t.dashboard.statusLabel}</span>
                    <span className="capitalize">{profile.status || "current"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">{t.dashboard.lastModified}</span>
                    <span>
                      {profile.last_modified_timestamp > 0
                        ? new Date(profile.last_modified_timestamp * 1000).toLocaleString()
                        : t.common.unknown}
                    </span>
                  </div>
                  {profile.expiration_timestamp > 0 && (
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">{t.dashboard.expiration}</span>
                      <span>
                        {new Date(profile.expiration_timestamp * 1000).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {profile.profile_time_to_live && (
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">{t.dashboard.ttl}</span>
                      <span>{profile.profile_time_to_live}</span>
                    </div>
                  )}
                  {profile.extractor_names && profile.extractor_names.length > 0 && (
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">{t.dashboard.extractors}</span>
                      <div className="flex gap-1">
                        {profile.extractor_names.map((name) => (
                          <Badge key={name} variant="secondary" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.tags && profile.tags.length > 0 && (
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">{t.common.tags}</span>
                      <div className="flex gap-1">
                        {profile.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {profile.custom_features && Object.keys(profile.custom_features).length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">{t.dashboard.customFeatures}</p>
                    <JsonView json={JSON.stringify(profile.custom_features, null, 2)} />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function StatusDistributionChart({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  const { t } = useLocale();
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-semibold">{t.dashboard.profileDistribution}</h3>
      </div>
      <div className="p-4 flex items-center justify-center gap-6">
        <ResponsiveContainer width="50%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              dataKey="value"
              paddingAngle={2}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
                    <p className="font-medium text-foreground capitalize">
                      {payload[0].name}
                    </p>
                    <p className="text-muted-foreground">{payload[0].value} {t.dashboard.profilesLabel}</p>
                  </div>
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-1.5 text-xs">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground capitalize">{entry.name}</span>
              <span className="font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Lifecycle Button ───────────────────────────────────────────────

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
        <ArrowUp className="h-3.5 w-3.5 mr-1" />
      ) : (
        <Archive className="h-3.5 w-3.5 mr-1" />
      )}
      {isUpgrade ? t.dashboard.upgradeAll : t.dashboard.downgradeAll}
    </Button>
  );
}
