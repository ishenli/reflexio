"use client";

import { useState, useCallback } from "react";
import {
  fetchSearchData,
  type SearchData,
} from "@/lib/search-api";

export function useSearchData(apiEndpoint: string) {
  const [data, setData] = useState<SearchData>({
    results: null,
    loading: false,
    error: null,
  });

  const search = useCallback(
    async (query: string, userId?: string) => {
      if (!query.trim()) return;
      setData({ results: null, loading: true, error: null });
      const result = await fetchSearchData(apiEndpoint, query, userId);
      setData(result);
    },
    [apiEndpoint]
  );

  const clear = useCallback(() => {
    setData({ results: null, loading: false, error: null });
  }, []);

  return { data, search, clear };
}
