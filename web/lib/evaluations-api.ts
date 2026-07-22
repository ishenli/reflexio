import type {
  EvaluationResultView,
  GetEvaluationOverviewResponse,
  RetrievedLearningEvaluationResult,
  ShadowComparisonVerdict,
} from "./types";

// ─── Evaluation Overview ─────────────────────────────────────────

export async function fetchEvaluationOverview(
  apiEndpoint: string,
  fromTs: number,
  toTs: number,
  bucket: "day" | "week" = "week",
  includeShadow: boolean = true,
  sourceSets?: { label: string; sources: string[] }[]
): Promise<GetEvaluationOverviewResponse> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/get_evaluation_overview`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from_ts: fromTs,
      to_ts: toTs,
      bucket,
      include_shadow: includeShadow,
      source_sets: sourceSets ?? [],
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch overview (HTTP ${res.status})`);
  }
  return res.json();
}

// ─── Agent Success Evaluation Results ────────────────────────────

export async function fetchAgentSuccessEvalResults(
  apiEndpoint: string,
  limit: number = 100,
  agentVersion?: string
): Promise<EvaluationResultView[]> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/get_agent_success_evaluation_results`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      limit,
      agent_version: agentVersion,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch eval results (HTTP ${res.status})`);
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.msg || "Request failed");
  }
  return json.agent_success_evaluation_results;
}

// ─── Retrieved Learning Evaluation Results ───────────────────────

export async function fetchRetrievedLearningEvalResults(
  apiEndpoint: string,
  params: {
    user_id?: string;
    session_id?: string;
    limit?: number;
  } = {}
): Promise<RetrievedLearningEvaluationResult[]> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/get_retrieved_learning_evaluation_results`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: params.user_id,
      session_id: params.session_id,
      limit: params.limit ?? 100,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch retrieved eval results (HTTP ${res.status})`);
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.msg || "Request failed");
  }
  return json.results;
}

// ─── Regenerate ──────────────────────────────────────────────────

export interface RegenerateStartResponse {
  job_id: string;
  total: number;
}

export interface RegenerateStatusResponse {
  job_id: string;
  status: "running" | "completed" | "cancelled" | "error";
  total: number;
  completed: number;
  failed: number;
  failures: { session_id: string; reason: string }[];
  started_at: number;
  finished_at: number | null;
  total_candidates: number;
  sampled_count: number;
  concurrency_limit: number;
}

export async function startRegenerate(
  apiEndpoint: string,
  fromTs: number,
  toTs: number
): Promise<RegenerateStartResponse> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/evaluations/regenerate`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from_ts: fromTs, to_ts: toTs }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || `Regenerate failed (HTTP ${res.status})`);
  }
  return res.json();
}

export async function getRegenerateStatus(
  apiEndpoint: string,
  jobId: string
): Promise<RegenerateStatusResponse> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/evaluations/regenerate/${encodeURIComponent(jobId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to get regenerate status (HTTP ${res.status})`);
  }
  return res.json();
}

export async function cancelRegenerate(
  apiEndpoint: string,
  jobId: string
): Promise<void> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/evaluations/regenerate/${encodeURIComponent(jobId)}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(`Failed to cancel regenerate (HTTP ${res.status})`);
  }
}

// ─── Grade on Demand ──────────────────────────────────────────────

export interface GradeOnDemandResponse {
  session_id: string;
  result_id: number | null;
  cached: boolean;
  skipped_reason: string | null;
  retrieved_learning_status: string | null;
}

export async function gradeOnDemand(
  apiEndpoint: string,
  sessionId: string,
  agentVersion: string
): Promise<GradeOnDemandResponse> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/evaluations/grade_on_demand`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      agent_version: agentVersion,
    }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || `Grade on demand failed (HTTP ${res.status})`);
  }
  return res.json();
}

// ─── Shadow Comparisons ──────────────────────────────────────────

export async function fetchRecentShadowComparisons(
  apiEndpoint: string,
  limit: number = 10
): Promise<ShadowComparisonVerdict[]> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/evaluations/shadow_comparisons/recent?limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch shadow comparisons (HTTP ${res.status})`);
  }
  const json = await res.json();
  return json.verdicts;
}