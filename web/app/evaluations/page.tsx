"use client";

import { useMemo, useState, useCallback } from "react";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Play,
  StopCircle,
  FileText,
  Activity,
  ChevronDown,
  ChevronRight,
  Zap,
  Loader2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSettings } from "@/hooks/use-settings";
import { useLocale } from "@/lib/i18n/context";
import { useEvaluationsData } from "./use-evaluations-data";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { JsonView } from "@/components/method/json-view";
import type {
  EvaluationResultView,
  RetrievedLearningEvaluationResult,
  ShadowComparisonVerdict,
  GetEvaluationOverviewResponse,
} from "@/lib/types";

export default function EvaluationsPage() {
  const { apiEndpoint } = useSettings();
  const { t } = useLocale();
  const {
    data,
    loading,
    error,
    regenerateJob,
    startRegenerateJob,
    cancelRegenerateJob,
    gradeSession,
    refresh,
  } = useEvaluationsData(apiEndpoint);

  const [regenerateFromHours, setRegenerateFromHours] = useState(48);
  const [gradeSessionId, setGradeSessionId] = useState("");
  const [gradeAgentVersion, setGradeAgentVersion] = useState("");
  const [gradingResult, setGradingResult] = useState<string | null>(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [selectedAgentVersion, setSelectedAgentVersion] = useState<string>("");
  const [regenError, setRegenError] = useState<string | null>(null);

  // Compute agent versions from results
  const agentVersions = useMemo(() => {
    const versions = new Set<string>();
    for (const r of data.agentSuccessResults) {
      if (r.agent_version) versions.add(r.agent_version);
    }
    return Array.from(versions).sort();
  }, [data.agentSuccessResults]);

  // Filter results by selected agent version
  const filteredResults = useMemo(() => {
    if (!selectedAgentVersion) return data.agentSuccessResults;
    return data.agentSuccessResults.filter(
      (r) => r.agent_version === selectedAgentVersion
    );
  }, [data.agentSuccessResults, selectedAgentVersion]);

  // Compute computed stats
  const stats = useMemo(() => {
    const total = filteredResults.length;
    const successes = filteredResults.filter((r) => r.is_success).length;
    const failures = total - successes;
    const escalations = filteredResults.filter((r) => r.is_escalated).length;
    const avgCorrections =
      total > 0
        ? filteredResults.reduce(
            (acc, r) => acc + r.number_of_correction_per_session,
            0
          ) / total
        : 0;
    const successRate = total > 0 ? (successes / total) * 100 : 0;

    return { total, successes, failures, escalations, avgCorrections, successRate };
  }, [filteredResults]);

  // ─── Handle Regenerate ──────────────────────────────────────

  const handleStartRegenerate = useCallback(async () => {
    setRegenError(null);
    const now = Math.floor(Date.now() / 1000);
    const fromTs = now - regenerateFromHours * 3600;
    try {
      await startRegenerateJob(fromTs, now);
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : "Failed to start regenerate");
    }
  }, [regenerateFromHours, startRegenerateJob]);

  // ─── Handle Grade on Demand ─────────────────────────────────

  const handleGradeSession = useCallback(async () => {
    if (!gradeSessionId || !gradeAgentVersion) {
      setGradeError("Session ID and Agent Version are required");
      return;
    }
    setGradingLoading(true);
    setGradeError(null);
    setGradingResult(null);
    try {
      const result = await gradeSession(gradeSessionId, gradeAgentVersion);
      setGradingResult(JSON.stringify(result, null, 2));
      await refresh();
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : "Grading failed");
    } finally {
      setGradingLoading(false);
    }
  }, [gradeSessionId, gradeAgentVersion, gradeSession, refresh]);

  if (loading) {
    return (
      <div className="flex-1 min-w-0 overflow-auto p-6 space-y-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.evaluations.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t.evaluations.desc}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.evaluations.evaluatedSessions}
          value={stats.total}
          description={t.evaluations.totalEvaluated}
          icon={FileText}
          iconClassName="bg-blue-500/10 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400"
        />
        <StatCard
          title={t.evaluations.successRate}
          value={stats.successRate}
          description={`${stats.successes} ${t.evaluations.successfulSessions}`}
          icon={TrendingUp}
          iconClassName="bg-emerald-500/10 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400"
          format="percent"
        />
        <StatCard
          title={t.evaluations.escalations}
          value={stats.escalations}
          description={t.evaluations.sessionsEscalated}
          icon={AlertTriangle}
          iconClassName="bg-amber-500/10 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
        />
        <StatCard
          title={t.evaluations.avgCorrections}
          value={stats.avgCorrections.toFixed(1)}
          description={t.evaluations.perSession}
          icon={Activity}
          iconClassName="bg-violet-500/10 [&>svg]:text-violet-600 dark:[&>svg]:text-violet-400"
        />
      </div>

      {/* Overview + Success Trend */}
      <OverviewSection overview={data.overview} loading={data.overviewLoading} />

      {/* Shadow Comparisons */}
      <ShadowComparisonsSection verdicts={data.shadowComparisons} />

      {/* Row: Regenerate + Grade on Demand */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RegenerateSection
          regenerateFromHours={regenerateFromHours}
          setRegenerateFromHours={setRegenerateFromHours}
          regenerateJob={regenerateJob}
          onStart={handleStartRegenerate}
          onCancel={cancelRegenerateJob}
          error={regenError}
        />
        <GradeOnDemandSection
          sessionId={gradeSessionId}
          setSessionId={setGradeSessionId}
          agentVersion={gradeAgentVersion}
          setAgentVersion={setGradeAgentVersion}
          onGrade={handleGradeSession}
          loading={gradingLoading}
          result={gradingResult}
          error={gradeError}
        />
      </div>

      {/* Agent Success Evaluation Results */}
      <AgentSuccessResultsTable
        results={filteredResults}
        agentVersions={agentVersions}
        selectedAgentVersion={selectedAgentVersion}
        onAgentVersionChange={setSelectedAgentVersion}
      />

      {/* Retrieved Learning Results */}
      <RetrievedLearningResultsTable results={data.retrievedLearningResults} />
    </div>
  );
}

// ─── Overview Section ──────────────────────────────────────────────

function OverviewSection({
  overview,
  loading,
}: {
  overview: GetEvaluationOverviewResponse | null;
  loading: boolean;
}) {
  const { t } = useLocale();

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">{t.common.loading}...</p>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">{t.evaluations.noOverviewData}</p>
      </div>
    );
  }

  // Destructure the properly typed overview
  const { hero } = overview;
  const buckets = hero.buckets ?? [];

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-semibold">{t.evaluations.evaluationOverview}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t.evaluations.overviewDesc}
        </p>
      </div>
      <div className="p-4">
        {buckets.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={buckets.map((b) => ({
                date: new Date(b.ts * 1000).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
                rate: b.regular_rate * 100,
                avgCorrections: b.avg_corrections,
              }))}
              margin={{ top: 4, right: 8, bottom: 4, left: -16 }}
            >
              <defs>
                <linearGradient id="hero-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={40}
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
                      <p className="font-medium text-foreground">{payload[0].payload.date}</p>
                      <p className="text-muted-foreground">
                        Success:{" "}
                        <span className="font-semibold text-foreground">
                          {Number(payload[0].value).toFixed(1)}%
                        </span>
                      </p>
                    </div>
                  ) : null
                }
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#hero-grad)"
                dot={false}
                activeDot={{ r: 4, stroke: "var(--chart-1)", strokeWidth: 2, fill: "var(--card)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            {hero.regular_success_rate_pp > 0
              ? t.evaluations.successRate + ": " + hero.regular_success_rate_pp.toFixed(1) + "% — " + t.evaluations.insufficientData
              : t.evaluations.noEvalData}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shadow Comparisons Section ─────────────────────────────────────

function ShadowComparisonsSection({ verdicts }: { verdicts: ShadowComparisonVerdict[] }) {
  const { t } = useLocale();
  const [hidden, setHidden] = useState(false);
  const [expandedVerdict, setExpandedVerdict] = useState<number | null>(null);

  // Compute aggregate stats
  const totals = useMemo(() => {
    let wins = 0, losses = 0, ties = 0, significant = 0;
    for (const v of verdicts) {
      const reflexioWon =
        (v.output.better_request === "1" && v.reflexio_is_request_1) ||
        (v.output.better_request === "2" && !v.reflexio_is_request_1);
      if (v.output.better_request === "tie") ties++;
      else if (reflexioWon) wins++;
      else losses++;
      if (v.output.is_significantly_better) significant++;
    }
    return { wins, losses, ties, significant, total: verdicts.length };
  }, [verdicts]);

  if (hidden) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold">{t.evaluations.shadowComparisons}</h3>
          <Button variant="ghost" size="xs" onClick={() => setHidden(false)}>{t.evaluations.show}</Button>
        </div>
        <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">{t.evaluations.hidden}</div>
      </div>
    );
  }

  if (!verdicts.length) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold">{t.evaluations.shadowComparisons}</h3>
        </div>
        <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">
          {t.evaluations.noShadowData}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-5 py-3.5 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{t.evaluations.shadowComparisons}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.evaluations.shadowComparisonsDesc}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {t.evaluations.wins}: {totals.wins}
            </span>
            <span className="text-red-600 dark:text-red-400 font-medium">
              {t.evaluations.losses}: {totals.losses}
            </span>
            <span className="text-muted-foreground">{t.evaluations.ties}: {totals.ties}</span>
            <Button variant="ghost" size="xs" onClick={() => setHidden(true)}>{t.evaluations.hide}</Button>
          </div>
        </div>
      </div>
      <div className="divide-y divide-border">
        {verdicts.slice(0, 10).map((verdict) => {
          const reflexioWon =
            (verdict.output.better_request === "1" && verdict.reflexio_is_request_1) ||
            (verdict.output.better_request === "2" && !verdict.reflexio_is_request_1);
          const isExpanded = expandedVerdict === verdict.verdict_id;
          return (
            <div key={verdict.verdict_id} className="px-5 py-2.5">
              <button
                onClick={() => setExpandedVerdict(isExpanded ? null : verdict.verdict_id)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium",
                    verdict.output.better_request === "tie"
                      ? "bg-muted text-muted-foreground"
                      : reflexioWon
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                  )}>
                    {verdict.output.better_request === "tie"
                      ? t.evaluations.tie
                      : reflexioWon
                        ? t.evaluations.win
                        : t.evaluations.loss}
                  </span>
                  <span className="text-xs font-mono truncate">{verdict.session_id}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(verdict.created_at).toLocaleDateString()}
                  </span>
                </div>
                {verdict.output.is_significantly_better && (
                  <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                )}
              </button>
              {isExpanded && verdict.output.comparison_reason && (
                <div className="mt-2 ml-6 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
                  {verdict.output.comparison_reason}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Regenerate Section ─────────────────────────────────────────────

function RegenerateSection({
  regenerateFromHours,
  setRegenerateFromHours,
  regenerateJob,
  onStart,
  onCancel,
  error,
}: {
  regenerateFromHours: number;
  setRegenerateFromHours: (v: number) => void;
  regenerateJob: {
    jobId: string;
    status: string;
    total: number;
    completed: number;
    failed: number;
    failures: { session_id: string; reason: string }[];
    startedAt: number;
    finishedAt: number | null;
  } | null;
  onStart: () => void;
  onCancel: () => void;
  error: string | null;
}) {
  const { t } = useLocale();
  const isRunning = regenerateJob?.status === "running";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isRunning && "animate-spin")} />
        <h3 className="text-sm font-semibold">{t.evaluations.regenerateTitle}</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        {t.evaluations.regenerateDesc}
      </p>
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground whitespace-nowrap">{t.evaluations.window}:</label>
        <Input
          type="number"
          value={regenerateFromHours}
          onChange={(e) => setRegenerateFromHours(Number(e.target.value))}
          className="h-8 w-20 text-xs"
          min={1}
          max={720}
          disabled={isRunning}
        />
        <span className="text-xs text-muted-foreground">hours ago → now</span>
      </div>

      {regenerateJob && (
        <div className="rounded-md bg-muted/40 px-3 py-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">
              Job: <span className="font-mono">{regenerateJob.jobId.slice(0, 12)}...</span>
            </span>
            <span className={cn(
              "text-xs font-medium",
              regenerateJob.status === "completed" && "text-emerald-600 dark:text-emerald-400",
              regenerateJob.status === "running" && "text-blue-600 dark:text-blue-400",
              regenerateJob.status === "cancelled" && "text-muted-foreground",
              regenerateJob.status === "error" && "text-red-600 dark:text-red-400",
            )}>
              {regenerateJob.status}
            </span>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{regenerateJob.completed} / {regenerateJob.total} completed</span>
            {regenerateJob.failed > 0 && (
              <span className="text-red-600 dark:text-red-400">{regenerateJob.failed} failed</span>
            )}
          </div>
          {isRunning && (
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{
                  width: `${regenerateJob.total > 0
                    ? ((regenerateJob.completed + regenerateJob.failed) / regenerateJob.total) * 100
                    : 0}%`
                }}
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400">{error}</div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onStart}
          disabled={isRunning}
        >
          <Play className="h-3.5 w-3.5 mr-1" />
          Start Regenerate
        </Button>
        {isRunning && (
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
          >
            <StopCircle className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Grade on Demand Section ────────────────────────────────────────

function GradeOnDemandSection({
  sessionId,
  setSessionId,
  agentVersion,
  setAgentVersion,
  onGrade,
  loading,
  result,
  error,
}: {
  sessionId: string;
  setSessionId: (v: string) => void;
  agentVersion: string;
  setAgentVersion: (v: string) => void;
  onGrade: () => void;
  loading: boolean;
  result: string | null;
  error: string | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Grade on Demand</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Grade a single session synchronously. Results are cached for 24 hours.
      </p>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-muted-foreground">Session ID</label>
          <Input
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="session_xxx"
            className="h-8 text-xs font-mono mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Agent Version</label>
          <Input
            value={agentVersion}
            onChange={(e) => setAgentVersion(e.target.value)}
            placeholder="e.g. 1.0.0"
            className="h-8 text-xs font-mono mt-1"
          />
        </div>
      </div>
      <Button size="sm" onClick={onGrade} disabled={loading}>
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
        ) : (
          <Play className="h-3.5 w-3.5 mr-1" />
        )}
        Grade Session
      </Button>
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400">{error}</div>
      )}
      {result && (
        <div className="rounded-md bg-muted/40 p-2 max-h-48 overflow-auto">
          <pre className="text-xs font-mono">{result}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Agent Success Results Table ─────────────────────────────────────

function AgentSuccessResultsTable({
  results,
  agentVersions,
  selectedAgentVersion,
  onAgentVersionChange,
}: {
  results: EvaluationResultView[];
  agentVersions: string[];
  selectedAgentVersion: string;
  onAgentVersionChange: (v: string) => void;
}) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  if (!results.length) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold">Agent Success Evaluation Results</h3>
        </div>
        <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
          No evaluation results found. Run a regenerate or grade a session to populate.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-5 py-3.5 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Agent Success Evaluation Results</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {results.length} result{results.length !== 1 ? "s" : ""}
              {selectedAgentVersion && ` — version ${selectedAgentVersion}`}
            </p>
          </div>
          {agentVersions.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedAgentVersion}
                onChange={(e) => onAgentVersionChange(e.target.value)}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="">All versions</option>
                {agentVersions.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/50 backdrop-blur z-10">
            <tr>
              <th className="w-8 px-2 py-2" />
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Result</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Session</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Version</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Date</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Corrections</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Escalated</th>
            </tr>
          </thead>
          <tbody>
            {results.slice(0, 50).map((result, i) => {
              const isExpanded = expandedRow === i;
              return (
                <FragmentWithResultRow
                  key={result.result_id}
                  result={result}
                  index={i}
                  expanded={isExpanded}
                  onToggle={() => setExpandedRow(isExpanded ? null : i)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentWithResultRow({
  result,
  index,
  expanded,
  onToggle,
}: {
  result: EvaluationResultView;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={cn(
          "border-b border-border hover:bg-muted/30 cursor-pointer transition-colors",
          index % 2 === 0 ? "bg-transparent" : "bg-muted/10",
          expanded && "bg-accent/30"
        )}
        onClick={onToggle}
      >
        <td className="px-2 py-1.5 text-muted-foreground">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </td>
        <td className="px-3 py-1.5">
          {result.is_success ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" />
              Success
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
              <XCircle className="h-3.5 w-3.5" />
              {result.failure_type || "Failure"}
            </span>
          )}
        </td>
        <td className="px-3 py-1.5 font-mono max-w-[120px] truncate">{result.session_id}</td>
        <td className="px-3 py-1.5">{result.agent_version}</td>
        <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
          {result.created_at > 0
            ? new Date(result.created_at * 1000).toLocaleString()
            : "-"}
        </td>
        <td className="px-3 py-1.5">{result.number_of_correction_per_session}</td>
        <td className="px-3 py-1.5">
          {result.is_escalated ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="bg-muted/20 border-b border-border max-h-80 overflow-auto">
              <JsonView json={JSON.stringify(result, null, 2)} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Retrieved Learning Results Table ───────────────────────────────

function RetrievedLearningResultsTable({
  results,
}: {
  results: RetrievedLearningEvaluationResult[];
}) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  if (!results.length) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold">Retrieved Learning Evaluation Results</h3>
        </div>
        <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
          No retrieved learning evaluation data available
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-semibold">Retrieved Learning Evaluation Results</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Per-learning relevance and impact verdicts from the retrieved-learning judge
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/50 backdrop-blur z-10">
            <tr>
              <th className="w-8 px-2 py-2" />
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Learning</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Kind</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Relevance</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Impact</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Interaction</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">Evaluated</th>
            </tr>
          </thead>
          <tbody>
            {results.slice(0, 30).map((r, i) => {
              const isExpanded = expandedRow === i;
              return (
                <FragmentWithLearningRow
                  key={r.result_id}
                  result={r}
                  index={i}
                  expanded={isExpanded}
                  onToggle={() => setExpandedRow(isExpanded ? null : i)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentWithLearningRow({
  result,
  index,
  expanded,
  onToggle,
}: {
  result: RetrievedLearningEvaluationResult;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const relevanceLabel =
    result.is_relevant === null ? "Unknown" : result.is_relevant ? "Relevant" : "Not relevant";
  const impactLabel = result.impact ?? "unknown";

  return (
    <>
      <tr
        className={cn(
          "border-b border-border hover:bg-muted/30 cursor-pointer transition-colors",
          index % 2 === 0 ? "bg-transparent" : "bg-muted/10",
          expanded && "bg-accent/30"
        )}
        onClick={onToggle}
      >
        <td className="px-2 py-1.5 text-muted-foreground">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </td>
        <td className="px-3 py-1.5 max-w-[200px] truncate font-mono">
          {result.learning_id}
        </td>
        <td className="px-3 py-1.5 text-muted-foreground">{result.kind}</td>
        <td className="px-3 py-1.5">
          <span className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
            result.is_relevant === true && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            result.is_relevant === false && "bg-muted text-muted-foreground",
            result.is_relevant === null && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          )}>
            {relevanceLabel}
          </span>
        </td>
        <td className="px-3 py-1.5">
          <span className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium capitalize",
            result.impact === "positive" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            result.impact === "negative" && "bg-red-500/10 text-red-600 dark:text-red-400",
            result.impact === "neutral" && "bg-muted text-muted-foreground",
            result.impact === null && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          )}>
            {impactLabel}
          </span>
        </td>
        <td className="px-3 py-1.5 font-mono text-muted-foreground">
          {result.interaction_id ?? "-"}
        </td>
        <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
          {result.created_at > 0
            ? new Date(result.created_at * 1000).toLocaleDateString()
            : "-"}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="bg-muted/20 border-b border-border max-h-80 overflow-auto">
              <JsonView json={JSON.stringify(result, null, 2)} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
