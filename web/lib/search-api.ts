import type {
  UnifiedSearchViewResponse,
  ProfileView,
  AgentPlaybookView,
  UserPlaybookView,
} from "./types";

export interface UnifiedSearchRequest {
  query: string;
  top_k?: number;
  threshold?: number;
  user_id?: string;
  agent_version?: string;
  playbook_name?: string;
  entity_types?: ("profiles" | "user_playbooks" | "agent_playbooks")[];
  search_mode?: "vector" | "fts" | "hybrid";
}

/**
 * Extract unique user_ids from profiles data.
 * Returns sorted list of unique user IDs.
 */
export function extractUserIdsFromProfiles(profiles: ProfileView[]): string[] {
  const userIdSet = new Set<string>();
  profiles.forEach((profile) => {
    if (profile.user_id) {
      userIdSet.add(profile.user_id);
    }
  });
  return Array.from(userIdSet).sort();
}

export interface SearchData {
  results: UnifiedSearchViewResponse | null;
  loading: boolean;
  error: string | null;
}

export async function fetchUnifiedSearch(
  apiEndpoint: string,
  payload: UnifiedSearchRequest
): Promise<UnifiedSearchViewResponse> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/search`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: payload.query,
      top_k: payload.top_k ?? 5,
      threshold: payload.threshold ?? 0.3,
      user_id: payload.user_id,
      agent_version: payload.agent_version,
      playbook_name: payload.playbook_name,
      entity_types: payload.entity_types,
      search_mode: payload.search_mode ?? "hybrid",
    }),
  });

  if (!res.ok) {
    throw new Error(`Search failed (HTTP ${res.status})`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.msg || "Search request failed");
  }

  return json as UnifiedSearchViewResponse;
}

export async function fetchSearchData(
  apiEndpoint: string,
  query: string,
  userId?: string
): Promise<SearchData> {
  try {
    const results = await fetchUnifiedSearch(apiEndpoint, { query, user_id: userId });
    return { results, loading: false, error: null };
  } catch (err) {
    return {
      results: null,
      loading: false,
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}