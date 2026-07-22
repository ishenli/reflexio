import type { ReflexioConfig } from "./config-schema";

// ─── System Info ────────────────────────────────────────────────

export interface WhoamiResponse {
  success: boolean;
  org_id: string;
  storage_type: string | null;
  storage_label: string | null;
  storage_configured: boolean;
  message: string;
}

export interface HealthResponse {
  status: string;
}

export async function fetchWhoami(apiEndpoint: string): Promise<WhoamiResponse> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/whoami`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch whoami (HTTP ${res.status})`);
  return res.json();
}

export async function fetchHealth(apiEndpoint: string): Promise<HealthResponse> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/health`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch health (HTTP ${res.status})`);
  return res.json();
}

// ─── Config ─────────────────────────────────────────────────────

export async function fetchConfig(
  apiEndpoint: string
): Promise<Record<string, unknown>> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/get_config`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch config (HTTP ${res.status})`);
  return res.json();
}

export async function updateConfig(
  apiEndpoint: string,
  partial: Record<string, unknown>
): Promise<{ success: boolean; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/update_config`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body.detail as string) || `Failed to update config (HTTP ${res.status})`
    );
  }
  return res.json();
}

// ─── Storage Stats ──────────────────────────────────────────────

export interface StorageStatsResponse {
  profile_count: number;
  playbook_count: number;
  oldest_profile_modified: string | null;
  newest_profile_modified: string | null;
  success: boolean;
  msg: string | null;
}

export async function fetchStorageStats(
  apiEndpoint: string,
  userId: string
): Promise<StorageStatsResponse> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/storage_stats?user_id=${encodeURIComponent(userId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch storage stats (HTTP ${res.status})`);
  return res.json();
}

// ─── Operation Status ───────────────────────────────────────────

export interface OperationStatusResponse {
  success: boolean;
  operation_status: {
    service_name: string;
    status: string;
    started_at: number | null;
    heartbeat_at: number | null;
    progress_pct: number | null;
    message: string | null;
  } | null;
  msg: string | null;
}

export async function fetchOperationStatus(
  apiEndpoint: string,
  serviceName: string = "profile_generation"
): Promise<OperationStatusResponse> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/get_operation_status?service_name=${encodeURIComponent(serviceName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch operation status (HTTP ${res.status})`);
  return res.json();
}

export async function cancelOperation(
  apiEndpoint: string,
  serviceName: string = "profile_generation"
): Promise<{ success: boolean; cancelled_services: string[]; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/cancel_operation`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service_name: serviceName }),
  });
  if (!res.ok) {
    throw new Error(`Failed to cancel operation (HTTP ${res.status})`);
  }
  return res.json();
}

// ─── Cache Invalidation ─────────────────────────────────────────

export async function invalidateCache(
  apiEndpoint: string
): Promise<{ success: boolean; invalidated: boolean; org_id: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/admin/cache/invalidate`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Failed to invalidate cache (HTTP ${res.status})`);
  }
  return res.json();
}