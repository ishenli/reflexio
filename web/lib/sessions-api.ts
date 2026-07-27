import type { SessionView, DeleteSessionResponse } from "./types";

// The /api/get_requests endpoint returns sessions under GetRequestsViewResponse
export interface GetSessionsResponse {
  success: boolean;
  sessions: SessionView[];
  has_more: boolean;
  msg?: string;
}

export interface SessionStats {
  total_sessions: number;
  total_requests: number;
  total_interactions: number;
  unique_users: number;
}

export interface SessionsData {
  sessions: SessionView[];
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  stats: SessionStats;
}

export async function fetchSessions(
  apiEndpoint: string,
  params: {
    user_id?: string;
    session_id?: string;
    source?: string;
    start_time?: string;
    end_time?: string;
    top_k?: number;
    offset?: number;
  } = {}
): Promise<GetSessionsResponse> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/get_requests`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: params.user_id,
      session_id: params.session_id,
      source: params.source,
      start_time: params.start_time,
      end_time: params.end_time,
      top_k: params.top_k ?? 50,
      offset: params.offset ?? 0,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch sessions (HTTP ${res.status})`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.msg || "Request failed");
  }

  return json as GetSessionsResponse;
}

export async function deleteSession(
  apiEndpoint: string,
  sessionId: string
): Promise<DeleteSessionResponse> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/delete_session`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });

  if (!res.ok) {
    throw new Error(`Failed to delete session (HTTP ${res.status})`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.msg || "Delete failed");
  }

  return json as DeleteSessionResponse;
}

export async function fetchAllSessionsData(
  apiEndpoint: string,
  topK: number = 50
): Promise<SessionsData> {
  try {
    const [sessionsResponse, statsResponse] = await Promise.all([
      fetchSessions(apiEndpoint, { top_k: topK }),
      fetchSessionStats(apiEndpoint),
    ]);
    return {
      sessions: sessionsResponse.sessions,
      hasMore: sessionsResponse.has_more,
      loading: false,
      error: null,
      stats: statsResponse,
    };
  } catch (err) {
    return {
      sessions: [],
      hasMore: false,
      loading: false,
      error: err instanceof Error ? err.message : "An unknown error occurred",
      stats: { total_sessions: 0, total_requests: 0, total_interactions: 0, unique_users: 0 },
    };
  }
}

export async function fetchSessionStats(
  apiEndpoint: string,
): Promise<SessionStats> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/get_session_stats`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch session stats (HTTP ${res.status})`);
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.msg || "Request failed");
  }
  return json as SessionStats;
}