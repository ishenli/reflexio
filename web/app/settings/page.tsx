"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Server,
  Database,
  Activity,
  RefreshCw,
  Trash2,
  XCircle,
  Globe,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileText,
  Wifi,
  Eye,
  EyeOff,
  Languages,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { useLocale } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  fetchWhoami,
  fetchHealth,
  fetchConfig,
  fetchStorageStats,
  fetchOperationStatus,
  cancelOperation,
  invalidateCache,
  type WhoamiResponse,
  type StorageStatsResponse,
  type OperationStatusResponse,
  type HealthResponse,
} from "@/lib/settings-api";

export default function SettingsPage() {
  const { apiEndpoint } = useSettings();
  const { t, locale, setLocale } = useLocale();
  const baseUrl = useMemo(() => apiEndpoint.replace(/\/$/, ""), [apiEndpoint]);

  // ─── State ──────────────────────────────────────────────────
  const [whoami, setWhoami] = useState<WhoamiResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStatsResponse | null>(null);
  const [operationStatus, setOperationStatus] = useState<OperationStatusResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [configExpanded, setConfigExpanded] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const [cacheResult, setCacheResult] = useState<string | null>(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [cancelResult, setCancelResult] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // ─── Data Loading ───────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [whoamiData, healthData, configData] = await Promise.all([
        fetchWhoami(baseUrl),
        fetchHealth(baseUrl),
        fetchConfig(baseUrl),
      ]);
      setWhoami(whoamiData);
      setHealth(healthData);
      setConfig(configData);

      // Load storage stats if org_id is available
      if (whoamiData?.org_id) {
        fetchStorageStats(baseUrl, whoamiData.org_id)
          .then(setStorageStats)
          .catch(() => {});
      }

      // Load operation status
      fetchOperationStatus(baseUrl)
        .then(setOperationStatus)
        .catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setLastRefresh(new Date());
    setRefreshing(false);
  }, [loadAll]);

  const handleInvalidateCache = useCallback(async () => {
    setCacheLoading(true);
    setCacheResult(null);
    try {
      const result = await invalidateCache(baseUrl);
      setCacheResult(
        result.invalidated
          ? "Cache invalidated successfully"
          : "No cache entry was present"
      );
    } catch (err) {
      setCacheResult(err instanceof Error ? err.message : "Failed to invalidate cache");
    } finally {
      setCacheLoading(false);
    }
  }, [baseUrl]);

  const handleCancelOperation = useCallback(async () => {
    setCancelLoading(true);
    setCancelResult(null);
    try {
      const result = await cancelOperation(baseUrl);
      if (result.success && result.cancelled_services.length > 0) {
        setCancelResult(`Cancelled: ${result.cancelled_services.join(", ")}`);
      } else {
        setCancelResult("No running operations to cancel");
      }
    } catch (err) {
      setCancelResult(err instanceof Error ? err.message : "Failed to cancel operation");
    } finally {
      setCancelLoading(false);
    }
  }, [baseUrl]);

  if (loading) {
    return (
      <div className="flex-1 min-w-0 overflow-auto p-6 space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.settings.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t.settings.desc}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5 mr-1", refreshing && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Health + Identiy */}
      <div className="grid gap-4 md:grid-cols-2">
        <SystemHealthCard health={health} />
        <IdentityCard whoami={whoami} />
      </div>

      {/* Storage Stats + Operation Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <StorageStatsCard stats={storageStats} />
        <OperationStatusCard
          status={operationStatus}
          onCancel={handleCancelOperation}
          loading={cancelLoading}
          result={cancelResult}
        />
      </div>

      {/* Management Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <CacheManagementCard
          onInvalidate={handleInvalidateCache}
          loading={cacheLoading}
          result={cacheResult}
        />
        <LanguageCard locale={locale} setLocale={setLocale} t={t} />
      </div>

      {/* Configuration */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Current Configuration</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSensitive(!showSensitive)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                showSensitive
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {showSensitive ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
              {showSensitive ? "Hide secrets" : "Show secrets"}
            </button>
            <button
              onClick={() => setConfigExpanded(!configExpanded)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {configExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {configExpanded ? "Collapse" : "Expand"}
            </button>
          </div>
        </div>
        <div
          className={cn(
            "transition-all",
            configExpanded ? "max-h-[600px]" : "max-h-[300px]"
          )}
        >
          <div
            className={cn(
              "p-4 overflow-auto",
              configExpanded ? "max-h-[600px]" : "max-h-[260px]"
            )}
          >
            {config ? (
              <ConfigTree
                data={config}
                path=""
                hideSensitive={!showSensitive}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No configuration data available. Configure storage to begin.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────

function StatusBadge({
  status,
  pulse,
}: {
  status: "healthy" | "unhealthy" | "starting" | "unknown" | string;
  pulse?: boolean;
}) {
  const parsed =
    status === "healthy"
      ? "healthy"
      : status === "starting"
        ? "starting"
        : status === "unhealthy" || status === "error" || status === "failed"
          ? "unhealthy"
          : "unknown";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        parsed === "healthy" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        parsed === "starting" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        parsed === "unhealthy" && "bg-red-500/10 text-red-600 dark:text-red-400",
        parsed === "unknown" && "bg-muted text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "inline-block size-1.5 rounded-full",
          pulse && "animate-pulse",
          parsed === "healthy" && "bg-emerald-500",
          parsed === "starting" && "bg-amber-500",
          parsed === "unhealthy" && "bg-red-500",
          parsed === "unknown" && "bg-muted-foreground"
        )}
      />
      {parsed === "healthy"
        ? "Online"
        : parsed === "starting"
          ? "Starting"
          : parsed === "unhealthy"
            ? "Offline"
            : "Unknown"}
    </span>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function SystemHealthCard({ health }: { health: HealthResponse | null }) {
  const status = health?.status ?? "unknown";
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">System Health</h3>
        </div>
        <StatusBadge status={status} pulse={status === "healthy"} />
      </div>
      {health ? (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium capitalize">{status}</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Health endpoint unavailable
        </p>
      )}
    </div>
  );
}

function IdentityCard({ whoami }: { whoami: WhoamiResponse | null }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Server className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Instance Identity</h3>
      </div>
      {whoami ? (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Organization ID</span>
            <span className="font-mono font-medium">{whoami.org_id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Storage</span>
            <span className="font-medium">
              {whoami.storage_configured
                ? whoami.storage_type || "Configured"
                : "Not configured"}
            </span>
          </div>
          {whoami.storage_label && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Storage Label</span>
              <span className="font-mono text-xs">{whoami.storage_label}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Identity information unavailable
        </p>
      )}
    </div>
  );
}

function StorageStatsCard({
  stats,
}: {
  stats: StorageStatsResponse | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Storage Statistics</h3>
      </div>
      {stats ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <p className="text-2xl font-bold tabular-nums">{stats.profile_count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Profiles</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <p className="text-2xl font-bold tabular-nums">{stats.playbook_count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Playbooks</p>
          </div>
          <div className="col-span-2 space-y-1 text-xs">
            {stats.oldest_profile_modified && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Oldest Profile</span>
                <span className="font-mono">
                  {new Date(stats.oldest_profile_modified).toLocaleDateString()}
                </span>
              </div>
            )}
            {stats.newest_profile_modified && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Newest Profile</span>
                <span className="font-mono">
                  {new Date(stats.newest_profile_modified).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Storage statistics unavailable
        </p>
      )}
    </div>
  );
}

function OperationStatusCard({
  status,
  onCancel,
  loading,
  result,
}: {
  status: OperationStatusResponse | null;
  onCancel: () => void;
  loading: boolean;
  result: string | null;
}) {
  const op = status?.operation_status;
  const isRunning = op?.status === "running" || op?.status === "processing";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Operations</h3>
      </div>
      {op ? (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Service</span>
            <span className="font-medium capitalize">
              {op.service_name.replace(/_/g, " ")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge
              status={isRunning ? "healthy" : "unknown"}
              pulse={isRunning}
            />
          </div>
          {op.progress_pct !== null && op.progress_pct !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{op.progress_pct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${op.progress_pct}%` }}
                />
              </div>
            </div>
          )}
          {op.message && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Message</span>
              <span className="font-medium max-w-[200px] truncate">
                {op.message}
              </span>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-1"
            onClick={onCancel}
            disabled={loading || !isRunning}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5 mr-1" />
            )}
            Cancel Operation
          </Button>
          {result && (
            <p
              className={cn(
                "text-xs",
                result.startsWith("Cancelled")
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
              )}
            >
              {result}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            No active operations
          </p>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={onCancel}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5 mr-1" />
            )}
            Cancel Operation
          </Button>
          {result && (
            <p className="text-xs text-muted-foreground">{result}</p>
          )}
        </div>
      )}
    </div>
  );
}

function CacheManagementCard({
  onInvalidate,
  loading,
  result,
}: {
  onInvalidate: () => void;
  loading: boolean;
  result: string | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Cache Management</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Invalidate the per-org Reflexio cache. Use when the running config has
        changed through an unobserved channel.
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={onInvalidate}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5 mr-1" />
        )}
        Invalidate Cache
      </Button>
      {result && (
        <p
          className={cn(
            "text-xs",
            result.includes("successfully")
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground"
          )}
        >
          {result}
        </p>
      )}
    </div>
  );
}

function ApiEndpointCard() {
  const { apiEndpoint, setApiEndpoint } = useSettings();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(apiEndpoint);

  const handleSave = useCallback(() => {
    setApiEndpoint(draft);
    setEditing(false);
  }, [draft, setApiEndpoint]);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">API Endpoint</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        The Reflexio API server endpoint used by this documentation UI.
      </p>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-8 text-xs font-mono flex-1"
            placeholder="http://localhost:8061"
          />
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(apiEndpoint);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-foreground">{apiEndpoint}</span>
          <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      )}
    </div>
  );
}

function LanguageCard({
  locale,
  setLocale,
  t,
}: {
  locale: string;
  setLocale: (l: "en" | "zh") => void;
  t: any;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Languages className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{t.settings.language}</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        {locale === "en"
          ? "Switch the documentation UI language."
          : "切换文档界面语言。"}
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={locale === "zh" ? "default" : "outline"}
          onClick={() => setLocale("zh")}
          className={cn(locale === "zh" ? "" : "text-muted-foreground")}
        >
          中文
        </Button>
        <Button
          size="sm"
          variant={locale === "en" ? "default" : "outline"}
          onClick={() => setLocale("en")}
          className={cn(locale === "en" ? "" : "text-muted-foreground")}
        >
          English
        </Button>
      </div>
    </div>
  );
}

// ─── Config Tree ─────────────────────────────────────────────────

const SENSITIVE_KEYS = new Set([
  "api_key",
  "api_key_config",
  "storage_config",
  "db_path",
  "openai",
  "anthropic",
  "openrouter",
  "gemini",
  "minimax",
  "deepseek",
  "dashscope",
  "zai",
  "moonshot",
  "xai",
  "custom_endpoint",
]);

function ConfigTree({
  data,
  path,
  hideSensitive,
}: {
  data: unknown;
  path: string;
  hideSensitive: boolean;
}) {
  const topLevelKey = path.split(".")[0] || "";
  const isSensitive = hideSensitive && SENSITIVE_KEYS.has(topLevelKey);

  if (isSensitive) {
    return (
      <div className="text-xs text-muted-foreground italic py-1">
        Sensitive — click &quot;Show secrets&quot; to reveal
      </div>
    );
  }

  if (data === null || data === undefined) {
    return <span className="text-xs text-muted-foreground italic">null</span>;
  }

  if (typeof data === "string") {
    // Truncate long strings
    const display = data.length > 120 ? data.slice(0, 120) + "..." : data;
    return <span className="text-xs text-foreground font-mono">{display}</span>;
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return (
      <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">
        {String(data)}
      </span>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-xs text-muted-foreground italic">[]</span>;
    }
    return (
      <div className="space-y-1">
        {data.map((item, i) => (
          <div key={i} className="pl-3 border-l-2 border-border">
            <span className="text-xs text-muted-foreground">[{i}]</span>
            <ConfigTree
              data={item}
              path={`${path}[${i}]`}
              hideSensitive={hideSensitive}
            />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) {
      return <span className="text-xs text-muted-foreground italic">{}</span>;
    }
    return (
      <div className="space-y-1.5">
        {entries.map(([key, value]) => {
          const childPath = path ? `${path}.${key}` : key;
          return (
            <div key={key}>
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium text-foreground shrink-0 min-w-[100px]">
                  {key}
                </span>
                <ConfigTree
                  data={value}
                  path={childPath}
                  hideSensitive={hideSensitive}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <span className="text-xs text-muted-foreground">{String(data)}</span>
  );
}