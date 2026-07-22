import type { DashboardStats, PlaybookApplicationStat } from "./types";

export interface DashboardData {
  stats: DashboardStats | null;
  playbookStats: PlaybookApplicationStat[];
  loading: boolean;
  error: string | null;
}

export async function fetchDashboardStats(
  apiEndpoint: string,
  daysBack: number = 30
): Promise<DashboardStats> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/get_dashboard_stats`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ days_back: daysBack }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch dashboard stats (HTTP ${res.status})`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.msg || "Dashboard stats request failed");
  }

  return json.stats as DashboardStats;
}

export async function fetchPlaybookApplicationStats(
  apiEndpoint: string,
  daysBack: number = 30
): Promise<PlaybookApplicationStat[]> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/get_playbook_application_stats`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ days_back: daysBack }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch playbook stats (HTTP ${res.status})`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.msg || "Playbook stats request failed");
  }

  return json.stats as PlaybookApplicationStat[];
}

export async function fetchAllDashboardData(
  apiEndpoint: string,
  daysBack: number = 30
): Promise<DashboardData> {
  try {
    const [stats, playbookStats] = await Promise.all([
      fetchDashboardStats(apiEndpoint, daysBack),
      fetchPlaybookApplicationStats(apiEndpoint, daysBack),
    ]);
    return { stats, playbookStats, loading: false, error: null };
  } catch (err) {
    return {
      stats: null,
      playbookStats: [],
      loading: false,
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}