"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAllSessionsData, type SessionsData } from "@/lib/sessions-api";

export function useSessionsData(apiEndpoint: string) {
  const [data, setData] = useState<SessionsData>({
    sessions: [],
    hasMore: false,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));
    const result = await fetchAllSessionsData(apiEndpoint);
    setData(result);
  }, [apiEndpoint]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading: data.loading, error: data.error, refresh: load };
}