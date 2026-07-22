import type { InteractionView } from "./types";

export interface InteractionsData {
  allInteractions: InteractionView[];
  loading: boolean;
  error: string | null;
}

export async function fetchAllInteractions(
  apiEndpoint: string,
  limit: number = 200
): Promise<InteractionView[]> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/get_all_interactions?limit=${limit}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch interactions (HTTP ${res.status})`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.msg || "Request failed");
  }

  return json.interactions as InteractionView[];
}

export async function fetchInteractions(
  apiEndpoint: string,
  userId: string,
  topK: number = 50
): Promise<InteractionView[]> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/get_interactions`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, top_k: topK }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch interactions (HTTP ${res.status})`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.msg || "Request failed");
  }

  return json.interactions as InteractionView[];
}

export async function fetchAllInteractionsData(
  apiEndpoint: string,
  limit: number = 200
): Promise<InteractionsData> {
  try {
    const allInteractions = await fetchAllInteractions(apiEndpoint, limit);
    return { allInteractions, loading: false, error: null };
  } catch (err) {
    return {
      allInteractions: [],
      loading: false,
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}