"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAllProfiles } from "@/lib/profiles-api";
import { extractUserIdsFromProfiles } from "@/lib/search-api";
import type { ProfileView } from "@/lib/types";

export interface UserListData {
  userIds: string[];
  loading: boolean;
  error: string | null;
}

export function useUserListFromProfiles(apiEndpoint: string): UserListData {
  const [data, setData] = useState<UserListData>({
    userIds: [],
    loading: true,
    error: null,
  });

  const loadUsers = useCallback(async () => {
    try {
      setData((prev) => ({ ...prev, loading: true }));
      // Fetch all profiles and extract unique user_ids
      const profiles: ProfileView[] = await fetchAllProfiles(apiEndpoint, 1000);
      const userIds = extractUserIdsFromProfiles(profiles);
      setData({ userIds, loading: false, error: null });
    } catch (err) {
      setData({
        userIds: [],
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load users",
      });
    }
  }, [apiEndpoint]);

  useEffect(() => {
    if (apiEndpoint) {
      loadUsers();
    }
  }, [apiEndpoint, loadUsers]);

  return data;
}
