import type { SearchAnalyticsData } from "./types";

export interface SearchAnalyticsLoadedData {
  data: SearchAnalyticsData | null;
  loading: boolean;
  error: string | null;
}

export async function fetchSearchAnalytics(
  apiEndpoint: string,
  daysBack: number = 30
): Promise<SearchAnalyticsData> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/get_search_analytics`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ days_back: daysBack }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch search analytics (HTTP ${res.status})`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.msg || "Search analytics request failed");
  }

  return json.data as SearchAnalyticsData;
}