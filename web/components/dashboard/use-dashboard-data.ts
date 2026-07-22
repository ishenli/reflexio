"use client";

import { useState, useEffect, useCallback } from "react";
import type { DashboardData } from "@/lib/dashboard-api";
import { fetchAllDashboardData } from "@/lib/dashboard-api";

export function useDashboardData(apiEndpoint: string) {
  const [data, setData] = useState<DashboardData>({
    stats: null,
    playbookStats: [],
    loading: true,
    error: null,
  });
  const [daysBack, setDaysBack] = useState(30);

  const load = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));
    const result = await fetchAllDashboardData(apiEndpoint, daysBack);
    setData(result);
  }, [apiEndpoint, daysBack]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading: data.loading, error: data.error, daysBack, setDaysBack, refresh: load };
}