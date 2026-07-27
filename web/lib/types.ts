export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type ParamType =
  | "string"
  | "number"
  | "boolean"
  | "datetime"
  | "string[]"
  | "enum"
  | "json";

export interface ParamDef {
  name: string;
  type: ParamType;
  required: boolean;
  default?: unknown;
  description: string;
  enumValues?: string[];
}

export interface MethodDef {
  id: string;
  pythonName: string;
  displayName: string;
  group: string;
  description: string;
  httpMethod: HttpMethod;
  endpoint: string;
  requestStyle: "json_body" | "query_params" | "no_body";
  params: ParamDef[];
  // When set, the body is the JSON value of the named param (sent "as-is"),
  // not an object of {param: value}. Used for endpoints like /api/set_config
  // where FastAPI expects the top-level model directly.
  bodyFromParam?: string;
}

export interface ResourceGroup {
  id: string;
  name: string;
  icon: string;
  methods: MethodDef[];
}

// =============================
// Dashboard Types
// =============================

export interface TimeSeriesDataPoint {
  timestamp: number;
  value: number;
  count?: number;
}

export interface PeriodStats {
  total_profiles: number;
  total_interactions: number;
  total_playbooks: number;
  success_rate: number;
}

export interface DashboardStats {
  current_period: PeriodStats;
  previous_period: PeriodStats;
  interactions_time_series: TimeSeriesDataPoint[];
  profiles_time_series: TimeSeriesDataPoint[];
  playbooks_time_series: TimeSeriesDataPoint[];
  evaluations_time_series: TimeSeriesDataPoint[];
}

export interface PlaybookApplicationStat {
  real_id: string;
  kind: string;
  title: string;
  applied_count: number;
  last_applied_at: number | null;
  last_interaction_id: number | null;
}

// =============================
// Search Analytics Types
// =============================

export interface SearchAnalyticsSummary {
  total_searches: number;
  avg_results_per_search: number;
  zero_result_rate: number;
  avg_latency_ms: number;
}

export interface TopQueryEntry {
  query: string;
  count: number;
}

export interface ModeDistributionEntry {
  mode: string;
  count: number;
}

export interface SearchAnalyticsData {
  searches_time_series: TimeSeriesDataPoint[];
  results_time_series: TimeSeriesDataPoint[];
  latency_time_series: TimeSeriesDataPoint[];
  summary: SearchAnalyticsSummary | null;
  top_queries: TopQueryEntry[];
  mode_distribution: ModeDistributionEntry[];
}

// =============================
// View Types (API responses)
// =============================

export interface RetrievedLearning {
  request_id: string;
  interaction_id: number;
  target_kind: string;
  target_id: string;
  target_content: string;
  score: number;
}

export interface ToolUsed {
  name: string;
  input: string;
  output: string;
}

export interface InteractionView {
  interaction_id: number;
  user_id: string;
  request_id: string;
  created_at: number;
  role: string;
  content: string;
  user_action: string;
  user_action_description: string;
  shadow_content: string;
  expert_content: string;
  tools_used: ToolUsed[];
  retrieved_learnings: RetrievedLearning[];
}

export interface ProfileView {
  profile_id: string;
  user_id: string;
  content: string;
  last_modified_timestamp: number;
  generated_from_request_id: string;
  profile_time_to_live: string;
  expiration_timestamp: number;
  custom_features: Record<string, unknown> | null;
  source: string | null;
  status: string | null;
  extractor_names: string[] | null;
  source_span: string | null;
  source_interaction_ids: number[];
  tags: string[];
}

export interface ProfileChangeLogView {
  id: number;
  user_id: string;
  request_id: string;
  created_at: number;
  added_profiles: ProfileView[];
  removed_profiles: ProfileView[];
}

// =============================
// Session & Request Types
// =============================

export interface RequestView {
  request_id: string;
  user_id: string;
  created_at: number;
  source: string;
  agent_version: string;
  session_id: string;
  evaluation_only: boolean;
}

export interface RequestDataView {
  request: RequestView;
  interactions: InteractionView[];
}

export interface SessionView {
  session_id: string;
  requests: RequestDataView[];
}

export interface GetSessionsResponse {
  success: boolean;
  sessions: SessionView[];
  has_more: boolean;
  msg?: string;
}

export interface DeleteSessionResponse {
  success: boolean;
  message: string;
  deleted_requests_count: number;
}

export interface DeleteRequestResponse {
  success: boolean;
  message: string;
}

// =============================
// Evaluation Types
// =============================

export type RegularVsShadow = "regular" | "shadow" | "both" | "unknown";

export interface EvaluationResultView {
  result_id: number;
  user_id: string;
  agent_version: string;
  session_id: string;
  is_success: boolean;
  failure_type: string | null;
  failure_reason: string | null;
  evaluation_name: string | null;
  created_at: number;
  regular_vs_shadow: RegularVsShadow | null;
  number_of_correction_per_session: number;
  user_turns_to_resolution: number | null;
  is_escalated: boolean;
}

export interface RetrievedLearningEvaluationResult {
  result_id: number;
  user_id: string;
  session_id: string;
  agent_version: string;
  interaction_id: number | null;
  interaction_created_at: number | null;
  kind: "profile" | "user_playbook" | "agent_playbook";
  learning_id: string;
  is_relevant: boolean | null;
  relevance_reason: string;
  impact: "positive" | "negative" | "neutral" | null;
  impact_reason: string;
  created_at: number;
}

export interface HeroBucket {
  ts: number;
  regular_rate: number;
  shadow_rate: number | null;
  regular_n: number;
  shadow_n: number;
  avg_corrections: number;
  escalation_rate: number;
}

export interface NumberWithDelta {
  current: number;
  delta: number;
}

export interface PercentWithDelta {
  current: number;
  delta_pp: number;
}

export interface ContextTile {
  success: PercentWithDelta;
  corrections: NumberWithDelta;
  turns: NumberWithDelta;
  escalation: PercentWithDelta;
}

export interface HeroBlock {
  state: string;
  regular_success_rate_pp: number;
  shadow_success_rate_pp: number | null;
  delta_pp: number | null;
  buckets: HeroBucket[];
}

export interface RuleAttributionRow {
  rule_id: string;
  kind: string;
  title: string;
  successes_with: number;
  failures_with: number;
  net_sessions: number;
  cited_session_ids: string[];
}

export interface ScoreDistribution {
  current_bins: number[];
  baseline_bins: number[];
  labels: string[];
}

export interface BraintrustTileRow {
  scorer_name: string;
  current: number;
  n: number;
  delta: number;
}

export interface ShadowWinRateTrendPoint {
  date: string;
  n: number;
  wins: number;
  losses: number;
  ties: number;
}

export interface ShadowWinRateTrendWindowTotal {
  n: number;
  wins: number;
  losses: number;
  ties: number;
  win_rate: number;
  net_win: number;
}

export interface ShadowWinRateTrend {
  daily: ShadowWinRateTrendPoint[];
  window_total: ShadowWinRateTrendWindowTotal;
  judge_prompt_version: string;
}

export interface SourceSetEvaluationMetrics {
  label: string;
  sources: string[];
  session_count: number;
  session_ids: string[];
  success_rate_pp: number;
  buckets: HeroBucket[];
  context_tiles: ContextTile;
  score_distribution: ScoreDistribution;
  rule_attribution: RuleAttributionRow[];
  braintrust_tiles: BraintrustTileRow[];
}

export interface SourceSetComparison {
  available_sources: string[];
  sets: SourceSetEvaluationMetrics[];
  unmatched_session_count: number;
}

export interface GetEvaluationOverviewResponse {
  hero: HeroBlock;
  context_tiles: ContextTile;
  rule_attribution: RuleAttributionRow[];
  score_distribution: ScoreDistribution;
  braintrust_tiles: BraintrustTileRow[];
  shadow_win_rate_trend: ShadowWinRateTrend;
  source_set_comparison: SourceSetComparison;
}

export interface ShadowComparisonOutput {
  better_request: "1" | "2" | "tie";
  is_significantly_better: boolean;
  comparison_reason: string | null;
}

export interface ShadowComparisonVerdict {
  verdict_id: number;
  interaction_id: string;
  session_id: string;
  agent_version: string;
  reflexio_is_request_1: boolean;
  output: ShadowComparisonOutput;
  judge_prompt_version: string;
  created_at: string;
}

export interface GetRecentShadowComparisonsResponse {
  verdicts: ShadowComparisonVerdict[];
}

// =============================
// Agent Playbook Types
// =============================

export type PlaybookStatus = "pending" | "approved" | "rejected";

export interface AgentPlaybookView {
  agent_playbook_id: number;
  playbook_name: string;
  agent_version: string;
  created_at: number;
  content: string;
  trigger: string | null;
  rationale: string | null;
  playbook_status: PlaybookStatus;
  playbook_metadata: string;
  status: string | null;
  tags: string[];
}

export interface UserPlaybookView {
  user_playbook_id: number;
  user_id: string | null;
  agent_version: string;
  request_id: string;
  playbook_name: string;
  created_at: number;
  content: string;
  trigger: string | null;
  rationale: string | null;
  status: string | null;
  source: string | null;
  source_interaction_ids: number[];
  source_span: string | null;
  tags: string[];
}

// =============================
// Unified Search Types
// =============================

export interface UnifiedSearchViewResponse {
  success: boolean;
  profiles: ProfileView[];
  agent_playbooks: AgentPlaybookView[];
  user_playbooks: UserPlaybookView[];
  reformulated_query: string | null;
  msg: string | null;
  agent_trace: string | null;
  rehydrated_text: string | null;
}
