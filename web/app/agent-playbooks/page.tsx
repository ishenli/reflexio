"use client";

import { useMemo, useState, useCallback } from "react";
import {
  BookMarked,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  RefreshCw,
  Layers,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { useAgentPlaybooksData } from "./use-agent-playbooks-data";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { JsonView } from "@/components/method/json-view";
import { runPlaybookAggregation } from "@/lib/agent-playbooks-api";
import type { AgentPlaybookView, PlaybookStatus } from "@/lib/types";

const PLAYBOOK_STATUS_COLORS: Record<PlaybookStatus, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const PLAYBOOK_STATUS_ICONS: Record<PlaybookStatus, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

export default function AgentPlaybooksPage() {
  const { apiEndpoint } = useSettings();
  const {
    data,
    loading,
    error,
    refresh,
    updateStatus,
    removePlaybook,
    search,
    createPlaybook,
  } = useAgentPlaybooksData(apiEndpoint);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<PlaybookStatus | "all">("all");
  const [filterPlaybookName, setFilterPlaybookName] = useState<string>("all");
  const [aggregationLoading, setAggregationLoading] = useState(false);
  const [aggregationResult, setAggregationResult] = useState<string | null>(null);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newPlaybook, setNewPlaybook] = useState({
    agent_version: "",
    playbook_name: "",
    content: "",
    playbook_status: "pending" as PlaybookStatus,
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Compute unique playbook names for filter
  const playbookNames = useMemo(() => {
    const names = new Set(data.playbooks.map((p) => p.playbook_name));
    return Array.from(names).sort();
  }, [data.playbooks]);

  // Filter & search
  const filteredPlaybooks = useMemo(() => {
    let result = data.playbooks;

    if (filterStatus !== "all") {
      result = result.filter((p) => p.playbook_status === filterStatus);
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
          p.rationale?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [data.playbooks, filterStatus, filterPlaybookName, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = data.playbooks.length;
    const approved = data.playbooks.filter((p) => p.playbook_status === "approved").length;
    const pending = data.playbooks.filter((p) => p.playbook_status === "pending").length;
    const rejected = data.playbooks.filter((p) => p.playbook_status === "rejected").length;
    return { total, approved, pending, rejected };
  }, [data.playbooks]);

  // ─── Handlers ─────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!newPlaybook.agent_version || !newPlaybook.playbook_name || !newPlaybook.content) {
      setCreateError("Agent version, playbook name, and content are required");
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      await createPlaybook(newPlaybook);
      setShowCreate(false);
      setNewPlaybook({
        agent_version: "",
        playbook_name: "",
        content: "",
        playbook_status: "pending",
      });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create playbook");
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

  const handleRunAggregation = useCallback(async () => {
    setAggregationLoading(true);
    setAggregationResult(null);
    try {
      const result = await runPlaybookAggregation(apiEndpoint);
      setAggregationResult(
        result.success ? "Aggregation started successfully" : result.msg || "Failed"
      );
    } catch (err) {
      setAggregationResult(
        err instanceof Error ? err.message : "Aggregation failed"
      );
    } finally {
      setAggregationLoading(false);
    }
  }, [apiEndpoint]);

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
          <h1 className="text-2xl font-bold tracking-tight">Agent Playbooks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage aggregated agent playbooks — browse, search, create, approve, reject, and delete
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleRunAggregation} disabled={aggregationLoading}>
            {aggregationLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Layers className="h-3.5 w-3.5 mr-1" />}
            Run Aggregation
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Playbook
          </Button>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Aggregation result */}
      {aggregationResult && (
        <div className={cn(
          "rounded-lg border px-4 py-3 text-sm",
          aggregationResult.includes("successfully")
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200"
            : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 text-red-800 dark:text-red-200"
        )}>
          {aggregationResult}
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
          title="Total Playbooks"
          value={stats.total}
          description="All agent playbooks"
          icon={BookMarked}
          iconClassName="bg-blue-500/10 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400"
        />
        <StatCard
          title="Approved"
          value={stats.approved}
          description="Active approved playbooks"
          icon={CheckCircle}
          iconClassName="bg-emerald-500/10 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400"
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          description="Awaiting review"
          icon={Clock}
          iconClassName="bg-amber-500/10 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          description="Rejected playbooks"
          icon={XCircle}
          iconClassName="bg-red-500/10 [&>svg]:text-red-600 dark:[&>svg]:text-red-400"
        />
      </div>

      {/* Search & Filters */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-3 border-b border-border">
          <div className="flex flex-wrap items-center gap-3">
            <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by content, name, trigger, rationale..."
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
                onChange={(e) => setFilterStatus(e.target.value as PlaybookStatus | "all")}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="all">All statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={filterPlaybookName}
                onChange={(e) => setFilterPlaybookName(e.target.value)}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="all">All categories</option>
                {playbookNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="px-5 py-2 border-b border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            {filteredPlaybooks.length} playbook{filteredPlaybooks.length !== 1 ? "s" : ""}
            {(filterStatus !== "all" || filterPlaybookName !== "all" || searchQuery.trim()) && (
              <span className="ml-1">
                (filtered from {data.playbooks.length} total)
              </span>
            )}
          </p>
        </div>

        {/* Table */}
        <AgentPlaybooksTable
          playbooks={filteredPlaybooks}
          onUpdateStatus={updateStatus}
          onDelete={removePlaybook}
        />
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-lg p-6 space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Create Agent Playbook</h3>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Agent Version *</label>
                <Input
                  value={newPlaybook.agent_version}
                  onChange={(e) => setNewPlaybook({ ...newPlaybook, agent_version: e.target.value })}
                  placeholder="e.g. v1.0.0"
                  className="h-8 text-xs font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Playbook Name *</label>
                <Input
                  value={newPlaybook.playbook_name}
                  onChange={(e) => setNewPlaybook({ ...newPlaybook, playbook_name: e.target.value })}
                  placeholder="e.g. greeting, error_handling..."
                  className="h-8 text-xs font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Content *</label>
                <textarea
                  value={newPlaybook.content}
                  onChange={(e) => setNewPlaybook({ ...newPlaybook, content: e.target.value })}
                  placeholder="Playbook content..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono mt-1 min-h-[120px] resize-y"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Initial Status</label>
                <select
                  value={newPlaybook.playbook_status}
                  onChange={(e) => setNewPlaybook({ ...newPlaybook, playbook_status: e.target.value as PlaybookStatus })}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs w-full mt-1"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              {createError && (
                <div className="text-xs text-red-600 dark:text-red-400">{createError}</div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={createLoading}>
                {createLoading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Agent Playbooks Table ────────────────────────────────────────

function AgentPlaybooksTable({
  playbooks,
  onUpdateStatus,
  onDelete,
}: {
  playbooks: AgentPlaybookView[];
  onUpdateStatus: (id: number, status: PlaybookStatus) => Promise<{ success: boolean; msg?: string }>;
  onDelete: (id: number) => Promise<{ success: boolean; msg?: string }>;
}) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  if (!playbooks.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BookMarked className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No agent playbooks found</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Create a new playbook or adjust filters to see results
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
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Status</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Name</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Version</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Tags</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Date</th>
            <th className="w-24 px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {playbooks.map((playbook, i) => {
            const isExpanded = expandedRow === playbook.agent_playbook_id;
            const StatusIcon = PLAYBOOK_STATUS_ICONS[playbook.playbook_status];
            return (
              <FragmentRow
                key={playbook.agent_playbook_id}
                playbook={playbook}
                index={i}
                expanded={isExpanded}
                onToggle={() => setExpandedRow(isExpanded ? null : playbook.agent_playbook_id)}
                onUpdateStatus={async (status) => {
                  setUpdatingId(playbook.agent_playbook_id);
                  await onUpdateStatus(playbook.agent_playbook_id, status);
                  setUpdatingId(null);
                }}
                onDelete={async () => {
                  setDeletingId(playbook.agent_playbook_id);
                  await onDelete(playbook.agent_playbook_id);
                  setDeletingId(null);
                }}
                deletingId={deletingId}
                updatingId={updatingId}
                StatusIcon={StatusIcon}
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
  index,
  expanded,
  onToggle,
  onUpdateStatus,
  onDelete,
  deletingId,
  updatingId,
  StatusIcon,
}: {
  playbook: AgentPlaybookView;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onUpdateStatus: (status: PlaybookStatus) => Promise<void>;
  onDelete: () => Promise<void>;
  deletingId: number | null;
  updatingId: number | null;
  StatusIcon: typeof Clock;
}) {
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
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </td>
        <td className="px-3 py-1.5">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium",
            PLAYBOOK_STATUS_COLORS[playbook.playbook_status]
          )}>
            <StatusIcon className="h-3 w-3" />
            {playbook.playbook_status}
          </span>
        </td>
        <td className="px-3 py-1.5 font-medium">{playbook.playbook_name}</td>
        <td className="px-3 py-1.5 font-mono text-muted-foreground">{playbook.agent_version}</td>
        <td className="px-3 py-1.5">
          <div className="flex flex-wrap gap-1">
            {playbook.tags && playbook.tags.length > 0
              ? playbook.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {tag}
                  </span>
                ))
              : <span className="text-muted-foreground">—</span>}
            {playbook.tags && playbook.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{playbook.tags.length - 3}</span>
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
            {playbook.playbook_status !== "approved" && (
              <button
                title="Approve"
                onClick={(e) => { e.stopPropagation(); onUpdateStatus("approved"); }}
                disabled={updatingId === playbook.agent_playbook_id}
                className="rounded p-1 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 disabled:opacity-50"
              >
                {updatingId === playbook.agent_playbook_id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            {playbook.playbook_status !== "rejected" && (
              <button
                title="Reject"
                onClick={(e) => { e.stopPropagation(); onUpdateStatus("rejected"); }}
                disabled={updatingId === playbook.agent_playbook_id}
                className="rounded p-1 text-red-600 hover:bg-red-500/10 dark:text-red-400 disabled:opacity-50"
              >
                {updatingId === playbook.agent_playbook_id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            <button
              title="Delete"
              onClick={(e) => { e.stopPropagation(); if (confirm("Delete this playbook?")) onDelete(); }}
              disabled={deletingId === playbook.agent_playbook_id}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600 disabled:opacity-50"
            >
              {deletingId === playbook.agent_playbook_id ? (
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
          <td colSpan={7} className="p-0">
            <div className="bg-muted/20 border-b border-border">
              <div className="p-4 space-y-3">
                <PlaybookDetailSection title="Content" content={playbook.content} />
                {playbook.trigger && <PlaybookDetailSection title="Trigger" content={playbook.trigger} />}
                {playbook.rationale && <PlaybookDetailSection title="Rationale" content={playbook.rationale} />}
                {playbook.playbook_metadata && <PlaybookDetailSection title="Metadata" content={playbook.playbook_metadata} />}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Full Object</h4>
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

function PlaybookDetailSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground mb-1">{title}</h4>
      <div className="rounded-md bg-muted/30 px-3 py-2 text-xs whitespace-pre-wrap font-mono leading-relaxed">
        {content}
      </div>
    </div>
  );
}