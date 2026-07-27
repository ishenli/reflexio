"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Layers,
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  RefreshCw,
  Clock,
  MessageSquare,
  User,
  Hash,
  Bot,
  ExternalLink,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { useLocale, fmt } from "@/lib/i18n/context";
import { useSessionsData } from "./use-sessions-data";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { JsonView } from "@/components/method/json-view";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { deleteSession } from "@/lib/sessions-api";
import type { SessionView, RequestDataView } from "@/lib/types";

function formatTime(ts: number): string {
  const date = new Date(ts * 1000);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function formatDateTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

export default function SessionsPage() {
  const { apiEndpoint } = useSettings();
  const { t } = useLocale();
  const {
    data,
    loading,
    error,
    refresh,
    offset,
    pageSize,
    hasMore,
    goNext,
    goPrev,
    stats,
  } = useSessionsData(apiEndpoint);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterUser, setFilterUser] = useState<string>("");
  const [filterAgent, setFilterAgent] = useState<string>("");
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
  const [detailSession, setDetailSession] = useState<SessionView | null>(null);

  // Unique users and agents for dropdown options
  const userOptions = useMemo(() => {
    const set = new Set<string>();
    data.sessions.forEach((s) =>
      s.requests.forEach((r) => {
        if (r.request.user_id) set.add(r.request.user_id);
      })
    );
    return Array.from(set).sort();
  }, [data.sessions]);

  const agentOptions = useMemo(() => {
    const set = new Set<string>();
    data.sessions.forEach((s) =>
      s.requests.forEach((r) => {
        if (r.request.agent_version) set.add(r.request.agent_version);
      })
    );
    return Array.from(set).sort();
  }, [data.sessions]);

  // Filter sessions — text search + user + agent filters
  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.sessions.filter((s) => {
      // User filter
      if (filterUser && !s.requests.some((r) => r.request.user_id === filterUser)) {
        return false;
      }
      // Agent filter
      if (filterAgent && !s.requests.some((r) => r.request.agent_version === filterAgent)) {
        return false;
      }
      // Text search
      if (!q) return true;
      return (
        s.session_id.toLowerCase().includes(q) ||
        s.requests.some(
          (r) =>
            r.request.user_id?.toLowerCase().includes(q) ||
            r.request.source?.toLowerCase().includes(q) ||
            r.request.agent_version?.toLowerCase().includes(q) ||
            r.interactions.some(
              (i) =>
                i.content?.toLowerCase().includes(q) ||
                i.shadow_content?.toLowerCase().includes(q) ||
                i.expert_content?.toLowerCase().includes(q)
            )
        )
      );
    });
  }, [data.sessions, searchQuery, filterUser, filterAgent]);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      if (!confirm(fmt(t.sessions.deleteConfirm, { id: sessionId }))) return;
      try {
        const result = await deleteSession(apiEndpoint, sessionId);
        setDeleteResult(
          result.success
            ? fmt(t.sessions.deleteSuccess, { id: sessionId, count: result.deleted_requests_count })
            : fmt(t.sessions.deleteFail, { msg: result.message })
        );
        if (detailSession?.session_id === sessionId) {
          setDetailSession(null);
        }
        refresh();
      } catch (err) {
        setDeleteResult(
          err instanceof Error ? err.message : t.sessions.deleteFailed
        );
      }
    },
    [apiEndpoint, refresh, t, detailSession]
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
          <h1 className="text-2xl font-bold tracking-tight">{t.sessions.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t.sessions.desc}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={refresh}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Result banner */}
      {deleteResult && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            deleteResult.toLowerCase().includes("deleted")
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200"
              : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 text-red-800 dark:text-red-200"
          )}
        >
          {deleteResult}
          <button
            onClick={() => setDeleteResult(null)}
            className="ml-2 text-xs underline"
          >
            {t.sessions.dismiss}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.sessions.totalSessions}
          value={stats.total_sessions}
          description={t.sessions.allSessions}
          icon={Layers}
          iconClassName="bg-blue-500/10 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400"
        />
        <StatCard
          title={t.sessions.requests}
          value={stats.total_requests}
          description={t.sessions.acrossAllSessions}
          icon={MessageSquare}
          iconClassName="bg-violet-500/10 [&>svg]:text-violet-600 dark:[&>svg]:text-violet-400"
        />
        <StatCard
          title={t.sessions.interactions}
          value={stats.total_interactions}
          description={t.sessions.acrossAllRequests}
          icon={Hash}
          iconClassName="bg-amber-500/10 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
        />
        <StatCard
          title={t.dashboard.uniqueUsers}
          value={stats.unique_users}
          description={t.sessions.usersWithSessions}
          icon={User}
          iconClassName="bg-emerald-500/10 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400"
        />
      </div>

      {/* Search & Filters */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-3 border-b border-border">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.sessions.searchPlaceholder}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select value={filterUser} onValueChange={(v) => setFilterUser(v ?? "")}>
              <SelectTrigger className="h-8 text-xs min-w-[195px]" size="sm">
                <SelectValue placeholder={t.sessions.filterUser} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={""}>
                  {t.sessions.allUsers}
                </SelectItem>
                {userOptions.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAgent} onValueChange={(v) => setFilterAgent(v ?? "")}>
              <SelectTrigger className="h-8 text-xs min-w-[195px]" size="sm">
                <SelectValue placeholder={t.sessions.filterAgent} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={""}>
                  {t.sessions.allAgents}
                </SelectItem>
                {agentOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        <div className="px-5 py-2 border-b border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            {filteredSessions.length} {t.sessions.title.toLowerCase()}
            {searchQuery.trim() && (
              <span className="ml-1">
                ({fmt(t.common.filtered, { total: data.sessions.length })})
              </span>
            )}
          </p>
        </div>

        {/* Sessions Table */}
        <SessionsTable
          sessions={filteredSessions}
          onDelete={handleDeleteSession}
          onViewDetails={setDetailSession}
        />

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {offset + 1}–{offset + filteredSessions.length} of{" "}
            {hasMore ? `${offset + pageSize}+` : offset + filteredSessions.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={offset === 0}
              onClick={goPrev}
            >
              ← {t.common.prev}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={!hasMore}
              onClick={goNext}
            >
              {t.common.next} →
            </Button>
          </div>
        </div>
      </div>

      {/* Session Details Sheet */}
      <Sheet open={!!detailSession} onOpenChange={(open) => { if (!open) setDetailSession(null); }}>
        <SheetContent side="right" style={{ width: '800px', maxWidth: 'none' }} className="p-0 overflow-hidde">
          {detailSession && <SessionDetailPanel session={detailSession} onDelete={handleDeleteSession} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Sessions Table ───────────────────────────────────────────────

function SessionsTable({
  sessions,
  onDelete,
  onViewDetails,
}: {
  sessions: SessionView[];
  onDelete: (id: string) => Promise<void>;
  onViewDetails: (session: SessionView) => void;
}) {
  const { t } = useLocale();
  const [deletingSession, setDeletingSession] = useState<string | null>(null);

  if (!sessions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Layers className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          {t.sessions.noSessions}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {t.sessions.noSessionsHint}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-muted/50 backdrop-blur z-10">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
              {t.sessions.firstMessage}
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
              {t.sessions.lastActivity}
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
              {t.sessions.agentLabel}
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
              {t.sessions.requests}
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
              {t.sessions.interactions}
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
              {t.common.user}
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
              {t.sessions.sources}
            </th>
            <th className="w-20 px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
              {t.common.actions}
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, i) => {
            const users = [
              ...new Set(session.requests.map((r) => r.request.user_id).filter(Boolean)),
            ];
            const sources = [
              ...new Set(session.requests.map((r) => r.request.source).filter(Boolean)),
            ];
            const agents = [
              ...new Set(
                session.requests
                  .map((r) => r.request.agent_version)
                  .filter(Boolean)
              ),
            ];
            const totalInteractions = session.requests.reduce(
              (acc, r) => acc + r.interactions.length, 0
            );
            const timestamps = session.requests
              .map((r) => r.request.created_at)
              .filter((t) => t > 0)
              .sort((a, b) => b - a);
            const lastActive = timestamps.length > 0 ? timestamps[0] : null;
            const isDeleting = deletingSession === session.session_id;

            // First User message from the session's requests
            const firstRequest = session.requests[0];
            const firstUserContent = firstRequest?.interactions.find(
              (i) => i.role === "User"
            )?.content || "";
            const displayContent = firstUserContent.length > 120
              ? firstUserContent.slice(0, 120) + "…"
              : firstUserContent;

            return (
              <tr
                key={session.session_id}
                className={cn(
                  "border-b border-border transition-colors",
                  i % 2 === 0 ? "bg-transparent" : "bg-muted/10",
                )}
              >
                <td
                  className="px-3 py-1.5 font-mono text-xs max-w-[280px] truncate"
                  title={displayContent || session.session_id}
                >
                  {displayContent || session.session_id}
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">
                  {lastActive ? formatTime(lastActive) : "—"}
                </td>
                <td className="px-3 py-1.5 max-w-[180px]">
                  {agents.length > 0 ? (
                    <div
                      className="flex items-center gap-1.5 min-w-0 text-muted-foreground"
                      title={agents.join(", ")}
                    >
                      <Bot className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-mono truncate">{agents[0]}</span>
                      {agents.length > 1 && (
                        <span className="shrink-0 rounded border border-border bg-muted px-1 py-0.5 text-[10px] leading-none">
                          +{agents.length - 1}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-1.5">{session.requests.length}</td>
                <td className="px-3 py-1.5">{totalInteractions}</td>
                <td className="px-3 py-1.5 font-mono text-muted-foreground max-w-[100px] truncate">
                  {users.join(", ") || "—"}
                </td>
                <td className="px-3 py-1.5 text-muted-foreground max-w-[100px] truncate">
                  {sources.join(", ") || "—"}
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      title={t.sessions.details}
                      onClick={() => onViewDetails(session)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title={t.common.delete}
                      onClick={async (e) => {
                        e.stopPropagation();
                        setDeletingSession(session.session_id);
                        await onDelete(session.session_id);
                        setDeletingSession(null);
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Session Detail Sheet Panel ───────────────────────────────────

function SessionDetailPanel({
  session,
  onDelete,
}: {
  session: SessionView;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useLocale();
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const users = [
    ...new Set(session.requests.map((r) => r.request.user_id).filter(Boolean)),
  ];
  const sources = [
    ...new Set(session.requests.map((r) => r.request.source).filter(Boolean)),
  ];
  const agents = [
    ...new Set(
      session.requests
        .map((r) => r.request.agent_version)
        .filter(Boolean)
    ),
  ];
  const timestamps = session.requests
    .map((r) => r.request.created_at)
    .filter((ts) => ts > 0)
    .sort((a, b) => b - a);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(session.session_id);
    setDeleting(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <SheetHeader className="border-b border-border shrink-0 px-5 py-4">
        <SheetTitle className="text-base">{t.sessions.details}</SheetTitle>
        <SheetDescription className="text-xs font-mono break-all">
          {session.session_id}
        </SheetDescription>
      </SheetHeader>

      {/* Session summary */}
      <div className="border-b border-border bg-muted/20 px-5 py-3 shrink-0">
        <div className="grid grid-cols-2 gap-y-2 text-xs">
          <div>
            <span className="text-muted-foreground">{t.common.user}:</span>{" "}
            <span className="font-mono">{users.join(", ") || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t.sessions.sources}:</span>{" "}
            <span className="font-mono">{sources.join(", ") || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t.sessions.agentLabel}:</span>{" "}
            <span className="font-mono">{agents.join(", ") || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t.sessions.lastActivity}:</span>{" "}
            <span className="font-mono">
              {timestamps.length > 0 ? formatDateTime(timestamps[0]) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Requests list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t.sessions.requestsLabel} ({session.requests.length})
        </h4>
        {session.requests.length === 0 && (
          <p className="text-xs text-muted-foreground">{t.sessions.noRequests}</p>
        )}
        {session.requests.map((request) => {
          const reqId = request.request.request_id;
          const isExpanded = expandedRequest === reqId;
          const firstUserContent = request.interactions.find(
            (i) => i.role === "User"
          )?.content || "";
          const truncatedContent = firstUserContent.length > 80
            ? firstUserContent.slice(0, 80) + "…"
            : firstUserContent;
          return (
            <div
              key={reqId}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              <button
                onClick={() => setExpandedRequest(isExpanded ? null : reqId)}
                className="flex items-center justify-between w-full px-3 py-2.5 text-left hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="font-mono text-xs truncate max-w-[560px]">
                    {truncatedContent || reqId}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
                  <span>
                    {request.interactions.length} {t.sessions.interactions.toLowerCase()}
                  </span>
                  <Clock className="h-3 w-3" />
                  <span>
                    {request.request.created_at > 0
                      ? formatTime(request.request.created_at)
                      : "—"}
                  </span>
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-border px-3 py-3 space-y-3">
                  {/* Request metadata */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">{t.sessions.userLabel}:</span>{" "}
                      <span className="font-mono">{request.request.user_id}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t.sessions.sourceLabel}:</span>{" "}
                      <span className="font-mono">{request.request.source || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t.sessions.agentLabel}:</span>{" "}
                      <span className="font-mono">{request.request.agent_version || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t.sessions.evalOnly}:</span>{" "}
                      <span className="font-mono">
                        {request.request.evaluation_only ? t.sessions.yes : t.sessions.no}
                      </span>
                    </div>
                  </div>

                  {/* Full JSON */}
                  <div>
                    <h5 className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                      {t.sessions.fullObject}
                    </h5>
                    <div className="max-h-60 overflow-auto rounded-md bg-muted/40">
                      <JsonView json={JSON.stringify(request, null, 2)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer with actions */}
      <div className="border-t border-border p-4 shrink-0">
        <Button
          variant="destructive"
          size="sm"
          className="w-full text-xs"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <Trash2 className="h-3.5 w-3.5 mr-1" />
          )}
          {t.common.delete} {t.sessions.title.toLowerCase()}
        </Button>
      </div>
    </div>
  );
}