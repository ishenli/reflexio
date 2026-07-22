"use client";

import { useState, useEffect, useCallback } from "react";
import type { InteractionsData } from "@/lib/interactions-api";
import { fetchAllInteractionsData } from "@/lib/interactions-api";

export function useInteractionsData(apiEndpoint: string, limit: number = 500) {
  const [data, setData] = useState<InteractionsData>({
    allInteractions: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));
    const result = await fetchAllInteractionsData(apiEndpoint, limit);
    setData(result);
  }, [apiEndpoint, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading: data.loading, error: data.error, refresh: load };
}