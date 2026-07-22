import { MethodDef } from "../types";

const STATUS_ENUM = ["running", "completed", "cancelled", "error"];

export const agentEvaluationMethods: MethodDef[] = [
  {
    id: "get-agent-success-evaluation-results",
    pythonName: "get_agent_success_evaluation_results",
    displayName: "Get Agent Success Evaluation Results",
    group: "agent-evaluation",
    description: "Get agent success evaluation results with optional filtering by limit, agent_version, and time range.",
    httpMethod: "POST",
    endpoint: "/api/get_agent_success_evaluation_results",
    requestStyle: "json_body",
    params: [
      {
        name: "limit",
        type: "number",
        required: false,
        default: 100,
        description: "Maximum number of results to return",
      },
      {
        name: "agent_version",
        type: "string",
        required: false,
        description: "Filter by agent version",
      },
      {
        name: "start_time",
        type: "datetime",
        required: false,
        description: "Filter by start time (ISO 8601)",
      },
      {
        name: "end_time",
        type: "datetime",
        required: false,
        description: "Filter by end time (ISO 8601)",
      },
    ],
  },
  {
    id: "get-retrieved-learning-evaluation-results",
    pythonName: "get_retrieved_learning_evaluation_results",
    displayName: "Get Retrieved Learning Evaluation Results",
    group: "agent-evaluation",
    description:
      "Get per-learning retrieved-learning evaluation verdicts with optional filtering by user/session and time range.",
    httpMethod: "POST",
    endpoint: "/api/get_retrieved_learning_evaluation_results",
    requestStyle: "json_body",
    params: [
      {
        name: "user_id",
        type: "string",
        required: false,
        description: "Filter by session owner",
      },
      {
        name: "session_id",
        type: "string",
        required: false,
        description: "Filter by session",
      },
      {
        name: "limit",
        type: "number",
        required: false,
        default: 100,
        description: "Maximum number of results (max 1000)",
      },
      {
        name: "start_time",
        type: "datetime",
        required: false,
        description: "Filter by target interaction start time (ISO 8601)",
      },
      {
        name: "end_time",
        type: "datetime",
        required: false,
        description: "Filter by target interaction end time (ISO 8601)",
      },
    ],
  },
  {
    id: "get-evaluation-overview",
    pythonName: "get_evaluation_overview",
    displayName: "Get Evaluation Overview",
    group: "agent-evaluation",
    description:
      "Return the full evaluation overview payload — hero block with trend, context tiles, rule attribution, and score distribution.",
    httpMethod: "POST",
    endpoint: "/api/get_evaluation_overview",
    requestStyle: "json_body",
    params: [
      {
        name: "from_ts",
        type: "number",
        required: true,
        description: "Window start (Unix epoch seconds)",
      },
      {
        name: "to_ts",
        type: "number",
        required: true,
        description: "Window end (Unix epoch seconds)",
      },
      {
        name: "bucket",
        type: "enum",
        required: false,
        default: "week",
        description: "Granularity of hero trend buckets",
        enumValues: ["day", "week"],
      },
      {
        name: "include_shadow",
        type: "boolean",
        required: false,
        default: true,
        description: "Include shadow-side aggregations",
      },
      {
        name: "source_sets",
        type: "json",
        required: false,
        description: 'Optional labeled request-source cohorts, e.g. [{"label":"API","sources":["api"]}]',
      },
    ],
  },
  {
    id: "evaluations-regenerate",
    pythonName: "start_regenerate",
    displayName: "Start Evaluation Regenerate",
    group: "agent-evaluation",
    description:
      "Start a new evaluation regenerate job over a time window. Returns a job_id for polling.",
    httpMethod: "POST",
    endpoint: "/api/evaluations/regenerate",
    requestStyle: "json_body",
    params: [
      {
        name: "from_ts",
        type: "number",
        required: true,
        description: "Inclusive window start (Unix epoch seconds)",
      },
      {
        name: "to_ts",
        type: "number",
        required: true,
        description: "Inclusive window end (Unix epoch seconds, > from_ts)",
      },
    ],
  },
  {
    id: "get-regenerate-status",
    pythonName: "get_regenerate_status",
    displayName: "Get Regenerate Job Status",
    group: "agent-evaluation",
    description:
      "Poll the status of an evaluation regenerate job by job_id.",
    httpMethod: "GET",
    endpoint: "/api/evaluations/regenerate/{job_id}",
    requestStyle: "query_params",
    params: [
      {
        name: "job_id",
        type: "string",
        required: true,
        description: "Job ID returned by POST /api/evaluations/regenerate",
      },
    ],
  },
  {
    id: "cancel-regenerate",
    pythonName: "cancel_regenerate",
    displayName: "Cancel Regenerate Job",
    group: "agent-evaluation",
    description: "Cancel a running evaluation regenerate job.",
    httpMethod: "DELETE",
    endpoint: "/api/evaluations/regenerate/{job_id}",
    requestStyle: "no_body",
    params: [
      {
        name: "job_id",
        type: "string",
        required: true,
        description: "Job ID to cancel",
      },
    ],
  },
  {
    id: "grade-on-demand",
    pythonName: "grade_on_demand",
    displayName: "Grade Session On Demand",
    group: "agent-evaluation",
    description:
      "Grade a single session synchronously. Returns cached result within 24h or triggers a fresh evaluation.",
    httpMethod: "POST",
    endpoint: "/api/evaluations/grade_on_demand",
    requestStyle: "json_body",
    params: [
      {
        name: "session_id",
        type: "string",
        required: true,
        description: "Target session to grade",
      },
      {
        name: "agent_version",
        type: "string",
        required: true,
        description: "Agent version filter",
      },
      {
        name: "evaluation_name",
        type: "string",
        required: false,
        description: "Deprecated compatibility field (optional)",
      },
    ],
  },
  {
    id: "get-recent-shadow-comparisons",
    pythonName: "get_recent_shadow_comparisons",
    displayName: "Get Recent Shadow Comparisons",
    group: "agent-evaluation",
    description:
      "Return the N most recent shadow comparison verdicts for the pinned rubric.",
    httpMethod: "GET",
    endpoint: "/api/evaluations/shadow_comparisons/recent",
    requestStyle: "query_params",
    params: [
      {
        name: "limit",
        type: "number",
        required: false,
        default: 10,
        description: "Maximum number of verdicts to return (max 100)",
      },
    ],
  },
];