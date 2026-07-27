"use client";

import { useState, useEffect, useCallback } from "react";
import type { SearchAnalyticsData } from "@/lib/types";
import { fetchSearchAnalytics } from "@/lib/search-analytics-api";
import type { SearchAnalyticsLoadedData } from "@/lib/search-analytics-api";

export function useSearchAnalyticsData(apiEndpoint: string) {
  const [data, setData] = useState<SearchAnalyticsLoadedData>({
    data: null,
    loading: true,
    error: null,
  });
  const [daysBack, setDaysBack] = useState(30);

  const load = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetchSearchAnalytics(apiEndpoint, daysBack);
      setData({ data: result, loading: false, error: null });
    } catch (err) {
      setData({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "An unknown error occurred",
      });
    }
  }, [apiEndpoint, daysBack]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data: data.data,
    loading: data.loading,
    error: data.error,
    daysBack,
    setDaysBack,
    refresh: load,
  };
}