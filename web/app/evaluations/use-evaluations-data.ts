"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type {
  EvaluationResultView,
  RetrievedLearningEvaluationResult,
  GetEvaluationOverviewResponse,
  ShadowComparisonVerdict,
} from "@/lib/types";
import {
  fetchAgentSuccessEvalResults,
  fetchRetrievedLearningEvalResults,
  fetchEvaluationOverview,
  fetchRecentShadowComparisons,
  startRegenerate,
  getRegenerateStatus,
  cancelRegenerate,
  gradeOnDemand,
  type RegenerateStatusResponse,
  type GradeOnDemandResponse,
  type RegenerateStartResponse,
} from "@/lib/evaluations-api";

export interface EvaluationsData {
  overview: GetEvaluationOverviewResponse | null;
  agentSuccessResults: EvaluationResultView[];
  retrievedLearningResults: RetrievedLearningEvaluationResult[];
  shadowComparisons: ShadowComparisonVerdict[];
  loading: boolean;
  error: string | null;
  overviewLoading: boolean;
  resultsLoading: boolean;
}

export interface RegenerateJobState {
  jobId: string;
  status: RegenerateStatusResponse["status"];
  total: number;
  completed: number;
  failed: number;
  failures: { session_id: string; reason: string }[];
  startedAt: number;
  finishedAt: number | null;
}

export function useEvaluationsData(apiEndpoint: string) {
  const [data, setData] = useState<EvaluationsData>({
    overview: null,
    agentSuccessResults: [],
    retrievedLearningResults: [],
    shadowComparisons: [],
    loading: true,
    error: null,
    overviewLoading: true,
    resultsLoading: true,
  });

  const [regenerateJob, setRegenerateJob] = useState<RegenerateJobState | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Default: last 30 days
  const defaultWindow = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return {
      fromTs: now - 30 * 24 * 60 * 60,
      toTs: now,
    };
  }, []);

  const loadOverview = useCallback(
    async (
      fromTs: number = defaultWindow.fromTs,
      toTs: number = defaultWindow.toTs
    ) => {
      setData((prev) => ({ ...prev, overviewLoading: true }));
      try {
        const overview = await fetchEvaluationOverview(apiEndpoint, fromTs, toTs);
        setData((prev) => ({ ...prev, overview, overviewLoading: false }));
      } catch (err) {
        setData((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to load overview",
          overviewLoading: false,
        }));
      }
    },
    [apiEndpoint, defaultWindow]
  );

  const loadResults = useCallback(async () => {
    setData((prev) => ({ ...prev, resultsLoading: true }));
    try {
      const [agentSuccessResults, retrievedLearningResults, shadowComparisons] =
        await Promise.all([
          fetchAgentSuccessEvalResults(apiEndpoint, 200),
          fetchRetrievedLearningEvalResults(apiEndpoint),
          fetchRecentShadowComparisons(apiEndpoint),
        ]);
      setData((prev) => ({
        ...prev,
        agentSuccessResults,
        retrievedLearningResults,
        shadowComparisons,
        resultsLoading: false,
        loading: false,
      }));
    } catch (err) {
      setData((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to load results",
        resultsLoading: false,
        loading: false,
      }));
    }
  }, [apiEndpoint]);

  const loadAll = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));
    await Promise.all([loadOverview(), loadResults()]);
  }, [loadOverview, loadResults]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ─── Regenerate Actions ─────────────────────────────────────

  const startRegenerateJob = useCallback(
    async (fromTs: number, toTs: number) => {
      try {
        const result: RegenerateStartResponse = await startRegenerate(
          apiEndpoint,
          fromTs,
          toTs
        );
        const jobState: RegenerateJobState = {
          jobId: result.job_id,
          status: "running",
          total: result.total,
          completed: 0,
          failed: 0,
          failures: [],
          startedAt: Math.floor(Date.now() / 1000),
          finishedAt: null,
        };
        setRegenerateJob(jobState);

        // Start polling every 2 seconds
        pollingRef.current = setInterval(async () => {
          try {
            const status = await getRegenerateStatus(apiEndpoint, result.job_id);
            setRegenerateJob((prev) => {
              if (!prev || prev.jobId !== status.job_id) return prev;
              return {
                ...prev,
                status: status.status,
                completed: status.completed,
                failed: status.failed,
                failures: status.failures,
                finishedAt: status.finished_at,
              };
            });
            if (
              status.status === "completed" ||
              status.status === "cancelled" ||
              status.status === "error"
            ) {
              if (pollingRef.current) clearInterval(pollingRef.current);
              pollingRef.current = null;
              // Refresh all evaluation data; regenerate affects both detail
              // rows and overview aggregations.
              loadAll();
            }
          } catch {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }, 2000);

        return result;
      } catch (err) {
        throw err;
      }
    },
    [apiEndpoint, loadAll]
  );

  const cancelRegenerateJob = useCallback(async () => {
    if (!regenerateJob) return;
    try {
      await cancelRegenerate(apiEndpoint, regenerateJob.jobId);
      setRegenerateJob((prev) =>
        prev ? { ...prev, status: "cancelled" } : prev
      );
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
    } catch (err) {
      throw err;
    }
  }, [apiEndpoint, regenerateJob]);

  // ─── Grade on Demand ───────────────────────────────────────

  const gradeSession = useCallback(
    async (sessionId: string, agentVersion: string): Promise<GradeOnDemandResponse> => {
      const result = await gradeOnDemand(apiEndpoint, sessionId, agentVersion);
      return result;
    },
    [apiEndpoint]
  );

  return {
    data,
    loading: data.loading,
    error: data.error,
    regenerateJob,
    startRegenerateJob,
    cancelRegenerateJob,
    gradeSession,
    refresh: loadAll,
  };
}
