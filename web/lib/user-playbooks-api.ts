import type { UserPlaybookView } from "./types";

// ─── Get User Playbooks ────────────────────────────────────────

export async function fetchUserPlaybooks(
  apiEndpoint: string,
  params: {
    limit?: number;
    user_id?: string;
    playbook_name?: string;
    agent_version?: string;
    status_filter?: (string | null)[];
  } = {}
): Promise<UserPlaybookView[]> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/get_user_playbooks`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      limit: params.limit ?? 200,
      user_id: params.user_id,
      playbook_name: params.playbook_name,
      agent_version: params.agent_version,
      status_filter: params.status_filter,
    }),
  });
  if (!res.ok) throw new Error(`Failed to fetch user playbooks (HTTP ${res.status})`);
  const json = await res.json();
  if (!json.success) throw new Error(json.msg || "Request failed");
  return json.user_playbooks as UserPlaybookView[];
}

// ─── Search User Playbooks ──────────────────────────────────────

export interface SearchUserPlaybooksParams {
  query?: string;
  user_id?: string;
  agent_version?: string;
  playbook_name?: string;
  start_time?: string;
  end_time?: string;
  status_filter?: (string | null)[];
  top_k?: number;
  threshold?: number;
  enable_reformulation?: boolean;
  search_mode?: "vector" | "fts" | "hybrid";
}

export async function searchUserPlaybooks(
  apiEndpoint: string,
  params: SearchUserPlaybooksParams = {}
): Promise<UserPlaybookView[]> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/search_user_playbooks`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Failed to search user playbooks (HTTP ${res.status})`);
  const json = await res.json();
  if (!json.success) throw new Error(json.msg || "Request failed");
  return json.user_playbooks as UserPlaybookView[];
}

// ─── Add User Playbooks ─────────────────────────────────────────

export interface AddUserPlaybookPayload {
  agent_version: string;
  request_id: string;
  playbook_name: string;
  content?: string;
  trigger?: string;
  source?: string;
}

export async function addUserPlaybooks(
  apiEndpoint: string,
  playbooks: AddUserPlaybookPayload[]
): Promise<{ success: boolean; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/add_user_playbook`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_playbooks: playbooks }),
  });
  if (!res.ok) throw new Error(`Failed to add user playbooks (HTTP ${res.status})`);
  return res.json();
}

// ─── Update User Playbook ───────────────────────────────────────

export async function updateUserPlaybook(
  apiEndpoint: string,
  payload: {
    user_playbook_id: number;
    playbook_name?: string;
    content?: string;
    trigger?: string;
    rationale?: string;
  }
): Promise<{ success: boolean; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/update_user_playbook`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update user playbook (HTTP ${res.status})`);
  return res.json();
}

// ─── Delete User Playbook ───────────────────────────────────────

export async function deleteUserPlaybook(
  apiEndpoint: string,
  userPlaybookId: number
): Promise<{ success: boolean; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/delete_user_playbook`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_playbook_id: userPlaybookId }),
  });
  if (!res.ok) throw new Error(`Failed to delete user playbook (HTTP ${res.status})`);
  return res.json();
}

// ─── Delete User Playbooks By IDs ───────────────────────────────

export async function deleteUserPlaybooksByIds(
  apiEndpoint: string,
  ids: number[]
): Promise<{ success: boolean; deleted_count?: number; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/delete_user_playbooks_by_ids`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_playbook_ids: ids }),
  });
  if (!res.ok) throw new Error(`Failed to delete user playbooks (HTTP ${res.status})`);
  return res.json();
}

// ─── Delete All User Playbooks ──────────────────────────────────

export async function deleteAllUserPlaybooks(
  apiEndpoint: string
): Promise<{ success: boolean; deleted_count?: number; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/delete_all_user_playbooks`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete all user playbooks (HTTP ${res.status})`);
  return res.json();
}

// ─── Upgrade / Downgrade User Playbooks ─────────────────────────

export async function upgradeUserPlaybooks(
  apiEndpoint: string,
  agentVersion?: string,
  playbookName?: string
): Promise<{ success: boolean; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/upgrade_all_user_playbooks`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_version: agentVersion,
      playbook_name: playbookName,
    }),
  });
  if (!res.ok) throw new Error(`Failed to upgrade user playbooks (HTTP ${res.status})`);
  return res.json();
}

export async function downgradeUserPlaybooks(
  apiEndpoint: string,
  agentVersion?: string,
  playbookName?: string
): Promise<{ success: boolean; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/downgrade_all_user_playbooks`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_version: agentVersion,
      playbook_name: playbookName,
    }),
  });
  if (!res.ok) throw new Error(`Failed to downgrade user playbooks (HTTP ${res.status})`);
  return res.json();
}

// ─── Get Playbook Aggregation Change Logs ───────────────────────

export interface PlaybookAggregationChangeLogResponse {
  success: boolean;
  change_logs: Array<{
    id: number;
    user_id: string;
    agent_version: string;
    playbook_name: string;
    created_at: number;
    added_count: number;
    removed_count: number;
    aggregated_count: number;
  }>;
  msg?: string;
}

export async function fetchPlaybookAggregationChangeLogs(
  apiEndpoint: string,
  playbookName: string,
  agentVersion: string
): Promise<PlaybookAggregationChangeLogResponse> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/playbook_aggregation_change_logs?playbook_name=${encodeURIComponent(playbookName)}&agent_version=${encodeURIComponent(agentVersion)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch change logs (HTTP ${res.status})`);
  return res.json();
}