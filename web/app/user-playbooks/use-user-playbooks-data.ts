"use client";

import { useState, useEffect, useCallback } from "react";
import type { UserPlaybookView } from "@/lib/types";
import {
  fetchUserPlaybooks,
  searchUserPlaybooks,
  deleteUserPlaybook,
  addUserPlaybooks,
  type AddUserPlaybookPayload,
} from "@/lib/user-playbooks-api";

export interface UserPlaybooksData {
  playbooks: UserPlaybookView[];
  loading: boolean;
  error: string | null;
}

export function useUserPlaybooksData(apiEndpoint: string) {
  const [data, setData] = useState<UserPlaybooksData>({
    playbooks: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const playbooks = await fetchUserPlaybooks(apiEndpoint, { limit: 500 });
      setData({ playbooks, loading: false, error: null });
    } catch (err) {
      setData({
        playbooks: [],
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load user playbooks",
      });
    }
  }, [apiEndpoint]);

  useEffect(() => {
    load();
  }, [load]);

  const removePlaybook = useCallback(
    async (id: number) => {
      const result = await deleteUserPlaybook(apiEndpoint, id);
      if (result.success) {
        setData((prev) => ({
          ...prev,
          playbooks: prev.playbooks.filter((p) => p.user_playbook_id !== id),
        }));
      }
      return result;
    },
    [apiEndpoint]
  );

  const search = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        await load();
        return;
      }
      setData((prev) => ({ ...prev, loading: true }));
      try {
        const playbooks = await searchUserPlaybooks(apiEndpoint, {
          query,
          top_k: 50,
        });
        setData({ playbooks, loading: false, error: null });
      } catch (err) {
        setData((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Search failed",
        }));
      }
    },
    [apiEndpoint, load]
  );

  const createPlaybook = useCallback(
    async (payload: AddUserPlaybookPayload) => {
      const result = await addUserPlaybooks(apiEndpoint, [payload]);
      if (result.success) {
        await load();
      }
      return result;
    },
    [apiEndpoint, load]
  );

  return {
    data,
    loading: data.loading,
    error: data.error,
    refresh: load,
    removePlaybook,
    search,
    createPlaybook,
  };
}