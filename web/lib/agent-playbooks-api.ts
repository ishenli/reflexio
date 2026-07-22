import type { AgentPlaybookView, PlaybookStatus } from "./types";

// ─── Get Agent Playbooks ───────────────────────────────────────

export async function fetchAgentPlaybooks(
  apiEndpoint: string,
  params: {
    limit?: number;
    playbook_name?: string;
    agent_version?: string;
    status_filter?: (string | null)[];
    playbook_status_filter?: PlaybookStatus;
  } = {}
): Promise<AgentPlaybookView[]> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/get_agent_playbooks`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      limit: params.limit ?? 200,
      playbook_name: params.playbook_name,
      agent_version: params.agent_version,
      status_filter: params.status_filter,
      playbook_status_filter: params.playbook_status_filter,
    }),
  });
  if (!res.ok) throw new Error(`Failed to fetch agent playbooks (HTTP ${res.status})`);
  const json = await res.json();
  if (!json.success) throw new Error(json.msg || "Request failed");
  return json.agent_playbooks as AgentPlaybookView[];
}

// ─── Search Agent Playbooks ────────────────────────────────────

export interface SearchAgentPlaybooksParams {
  query?: string;
  agent_version?: string;
  playbook_name?: string;
  start_time?: string;
  end_time?: string;
  status_filter?: (string | null)[];
  playbook_status_filter?: PlaybookStatus;
  top_k?: number;
  threshold?: number;
  enable_reformulation?: boolean;
  search_mode?: "vector" | "fts" | "hybrid";
}

export async function searchAgentPlaybooks(
  apiEndpoint: string,
  params: SearchAgentPlaybooksParams = {}
): Promise<AgentPlaybookView[]> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/search_agent_playbooks`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Failed to search agent playbooks (HTTP ${res.status})`);
  const json = await res.json();
  if (!json.success) throw new Error(json.msg || "Request failed");
  return json.agent_playbooks as AgentPlaybookView[];
}

// ─── Add Agent Playbook ────────────────────────────────────────

export interface AddAgentPlaybookPayload {
  agent_version: string;
  playbook_name: string;
  content: string;
  playbook_status?: PlaybookStatus;
  playbook_metadata?: string;
}

export async function addAgentPlaybook(
  apiEndpoint: string,
  playbooks: AddAgentPlaybookPayload[]
): Promise<{ success: boolean; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/add_agent_playbook`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_playbooks: playbooks }),
  });
  if (!res.ok) throw new Error(`Failed to add agent playbook (HTTP ${res.status})`);
  return res.json();
}

// ─── Update Agent Playbook ─────────────────────────────────────

export interface UpdateAgentPlaybookPayload {
  agent_playbook_id: number;
  playbook_name?: string;
  content?: string;
  trigger?: string;
  rationale?: string;
  playbook_status?: PlaybookStatus;
}

export async function updateAgentPlaybook(
  apiEndpoint: string,
  payload: UpdateAgentPlaybookPayload
): Promise<{ success: boolean; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/update_agent_playbook`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update agent playbook (HTTP ${res.status})`);
  return res.json();
}

// ─── Update Agent Playbook Status ──────────────────────────────

export async function updateAgentPlaybookStatus(
  apiEndpoint: string,
  agentPlaybookId: number,
  playbookStatus: PlaybookStatus
): Promise<{ success: boolean; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/update_agent_playbook_status`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_playbook_id: agentPlaybookId,
      playbook_status: playbookStatus,
    }),
  });
  if (!res.ok) throw new Error(`Failed to update status (HTTP ${res.status})`);
  return res.json();
}

// ─── Delete Agent Playbook ─────────────────────────────────────

export async function deleteAgentPlaybook(
  apiEndpoint: string,
  agentPlaybookId: number
): Promise<{ success: boolean; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/delete_agent_playbook`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_playbook_id: agentPlaybookId }),
  });
  if (!res.ok) throw new Error(`Failed to delete agent playbook (HTTP ${res.status})`);
  return res.json();
}

// ─── Delete Agent Playbooks By IDs ─────────────────────────────

export async function deleteAgentPlaybooksByIds(
  apiEndpoint: string,
  ids: number[]
): Promise<{ success: boolean; deleted_count?: number; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/delete_agent_playbooks_by_ids`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_playbook_ids: ids }),
  });
  if (!res.ok) throw new Error(`Failed to delete agent playbooks (HTTP ${res.status})`);
  return res.json();
}

// ─── Delete All Agent Playbooks ────────────────────────────────

export async function deleteAllAgentPlaybooks(
  apiEndpoint: string
): Promise<{ success: boolean; deleted_count?: number; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/delete_all_agent_playbooks`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete all agent playbooks (HTTP ${res.status})`);
  return res.json();
}

// ─── Run Aggregation ───────────────────────────────────────────

export async function runPlaybookAggregation(
  apiEndpoint: string,
  agentVersion?: string,
  playbookName?: string
): Promise<{ success: boolean; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/run_playbook_aggregation`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_version: agentVersion,
      playbook_name: playbookName,
    }),
  });
  if (!res.ok) throw new Error(`Failed to start aggregation (HTTP ${res.status})`);
  return res.json();
}