"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchSessions, fetchSessionStats, type SessionsData, type SessionStats } from "@/lib/sessions-api";

const PAGE_SIZE = 20;

const EMPTY_STATS: SessionStats = {
  total_sessions: 0,
  total_requests: 0,
  total_interactions: 0,
  unique_users: 0,
};

export function useSessionsData(apiEndpoint: string) {
  const [data, setData] = useState<SessionsData>({
    sessions: [],
    hasMore: false,
    loading: true,
    error: null,
    stats: EMPTY_STATS,
  });
  const [offset, setOffset] = useState(0);

  const load = useCallback(async (pageOffset: number) => {
    setData((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [sessionsResponse, stats] = await Promise.all([
        fetchSessions(apiEndpoint, {
          top_k: PAGE_SIZE,
          offset: pageOffset,
        }),
        fetchSessionStats(apiEndpoint).catch(() => EMPTY_STATS),
      ]);
      setData({
        sessions: sessionsResponse.sessions,
        hasMore: sessionsResponse.has_more,
        loading: false,
        error: null,
        stats,
      });
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "An unknown error occurred",
      }));
    }
  }, [apiEndpoint]);

  useEffect(() => {
    load(offset);
  }, [load, offset]);

  const refresh = useCallback(() => {
    setOffset(0);
    load(0);
  }, [load]);

  const goNext = useCallback(() => {
    setOffset((prev) => prev + PAGE_SIZE);
  }, []);

  const goPrev = useCallback(() => {
    setOffset((prev) => Math.max(0, prev - PAGE_SIZE));
  }, []);

  return {
    data,
    loading: data.loading,
    error: data.error,
    refresh,
    offset,
    pageSize: PAGE_SIZE,
    hasMore: data.hasMore,
    goNext,
    goPrev,
    stats: data.stats,
  };
}