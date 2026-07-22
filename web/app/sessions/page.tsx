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
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { useLocale, fmt } from "@/lib/i18n/context";
import { useSessionsData } from "./use-sessions-data";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { JsonView } from "@/components/method/json-view";
import {
  deleteSession,
} from "@/lib/sessions-api";
import type { SessionView } from "@/lib/types";

export default function SessionsPage() {
  const { apiEndpoint } = useSettings();
  const { t } = useLocale();
  const {
    data,
    loading,
    error,
    refresh,
  } = useSessionsData(apiEndpoint);

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  // Compute stats
  const stats = useMemo(() => {
    const total = data.sessions.length;
    const totalRequests = data.sessions.reduce(
      (acc, s) => acc + s.requests.length, 0
    );
    const totalInteractions = data.sessions.reduce(
      (acc, s) =>
        acc +
        s.requests.reduce(
          (racc, r) => racc + r.interactions.length, 0
        ),
      0
    );
    const uniqueUsers = new Set(
      data.sessions.flatMap((s) =>
        s.requests.map((r) => r.request.user_id)
      )
    ).size;
    return { total, totalRequests, totalInteractions, uniqueUsers };
  }, [data.sessions]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return data.sessions;
    const q = searchQuery.toLowerCase();
    return data.sessions.filter(
      (s) =>
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
  }, [data.sessions, searchQuery]);

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
        refresh();
      } catch (err) {
        setDeleteResult(
          err instanceof Error ? err.message : t.sessions.deleteFailed
        );
      }
    },
    [apiEndpoint, refresh, t]
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
          value={stats.total}
          description={t.sessions.allSessions}
          icon={Layers}
          iconClassName="bg-blue-500/10 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400"
        />
        <StatCard
          title={t.sessions.requests}
          value={stats.totalRequests}
          description={t.sessions.acrossAllSessions}
          icon={MessageSquare}
          iconClassName="bg-violet-500/10 [&>svg]:text-violet-600 dark:[&>svg]:text-violet-400"
        />
        <StatCard
          title={t.sessions.interactions}
          value={stats.totalInteractions}
          description={t.sessions.acrossAllRequests}
          icon={Hash}
          iconClassName="bg-amber-500/10 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
        />
        <StatCard
          title={t.dashboard.uniqueUsers}
          value={stats.uniqueUsers}
          description={t.sessions.usersWithSessions}
          icon={User}
          iconClassName="bg-emerald-500/10 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400"
        />
      </div>

      {/* Search */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.sessions.searchPlaceholder}
                className="h-8 pl-8 text-xs"
              />
            </div>
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
        />
      </div>
    </div>
  );
}

// ─── Sessions Table ───────────────────────────────────────────────

function SessionsTable({
  sessions,
  onDelete,
}: {
  sessions: SessionView[];
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useLocale();
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
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
            <th className="w-8 px-2 py-2" />
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
              {t.sessions.sessionId}
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
            <th className="w-12 px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
              {t.common.actions}
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, i) => {
            const isExpanded = expandedSession === session.session_id;
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

            return (
              <FragmentWithSessionRow
                key={session.session_id}
                session={session}
                index={i}
                expanded={isExpanded}
                onToggle={() =>
                  setExpandedSession(isExpanded ? null : session.session_id)
                }
                onDelete={async () => {
                  setDeletingSession(session.session_id);
                  await onDelete(session.session_id);
                  setDeletingSession(null);
                }}
                deletingId={deletingSession}
                users={users}
                sources={sources}
                agents={agents}
                totalInteractions={totalInteractions}
                expandedRequest={expandedRequest}
                onToggleRequest={setExpandedRequest}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FragmentWithSessionRow({
  session,
  index,
  expanded,
  onToggle,
  onDelete,
  deletingId,
  users,
  sources,
  agents,
  totalInteractions,
  expandedRequest,
  onToggleRequest,
}: {
  session: SessionView;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => Promise<void>;
  deletingId: string | null;
  users: string[];
  sources: string[];
  agents: string[];
  totalInteractions: number;
  expandedRequest: string | null;
  onToggleRequest: (id: string | null) => void;
}) {
  const { t } = useLocale();
  const isDeleting = deletingId === session.session_id;

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
        <td className="px-3 py-1.5 font-mono max-w-[200px] truncate">
          {session.session_id}
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
          <button
            title={t.common.delete}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
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
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="p-0">
            <div className="bg-muted/10 border-b border-border">
              <div className="p-4 space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t.sessions.requestsLabel} ({session.requests.length})
                </h4>
                {session.requests.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t.sessions.noRequests}</p>
                )}
                {session.requests.map((request) => {
                  const reqId = request.request.request_id;
                  const isReqExpanded = expandedRequest === reqId;
                  return (
                    <div
                      key={reqId}
                      className="rounded-lg border border-border bg-card overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          onToggleRequest(isReqExpanded ? null : reqId)
                        }
                        className="flex items-center justify-between w-full px-4 py-2.5 text-left hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isReqExpanded ? (
                            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                          )}
                          <span className="font-mono text-xs truncate">
                            {request.request.request_id}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>
                            {request.interactions.length} {t.sessions.interactions.toLowerCase()}
                          </span>
                          <Clock className="h-3 w-3" />
                          <span>
                            {request.request.created_at > 0
                              ? new Date(
                                  request.request.created_at * 1000
                                ).toLocaleDateString()
                              : "—"}
                          </span>
                        </div>
                      </button>
                      {isReqExpanded && (
                        <div className="border-t border-border px-4 py-3 space-y-3">
                          {/* Request metadata */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">{t.sessions.userLabel}:</span>{" "}
                              <span className="font-mono">
                                {request.request.user_id}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t.sessions.sourceLabel}:</span>{" "}
                              <span className="font-mono">
                                {request.request.source || "—"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t.sessions.agentLabel}:</span>{" "}
                              <span className="font-mono">
                                {request.request.agent_version || "—"}
                              </span>
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
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
