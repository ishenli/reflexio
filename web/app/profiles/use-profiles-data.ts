"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProfilesData } from "@/lib/profiles-api";
import { fetchAllProfilesData } from "@/lib/profiles-api";

export function useProfilesData(apiEndpoint: string, limit: number = 500) {
  const [data, setData] = useState<ProfilesData>({
    allProfiles: [],
    changeLogs: [],
    statistics: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));
    const result = await fetchAllProfilesData(apiEndpoint, limit);
    setData(result);
  }, [apiEndpoint, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading: data.loading, error: data.error, refresh: load };
}