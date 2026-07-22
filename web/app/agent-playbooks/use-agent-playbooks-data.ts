"use client";

import { useState, useEffect, useCallback } from "react";
import type { AgentPlaybookView, PlaybookStatus } from "@/lib/types";
import {
  fetchAgentPlaybooks,
  searchAgentPlaybooks,
  updateAgentPlaybookStatus,
  deleteAgentPlaybook,
  addAgentPlaybook,
  type AddAgentPlaybookPayload,
} from "@/lib/agent-playbooks-api";

export interface AgentPlaybooksData {
  playbooks: AgentPlaybookView[];
  loading: boolean;
  error: string | null;
}

export function useAgentPlaybooksData(apiEndpoint: string) {
  const [data, setData] = useState<AgentPlaybooksData>({
    playbooks: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const playbooks = await fetchAgentPlaybooks(apiEndpoint, { limit: 500 });
      setData({ playbooks, loading: false, error: null });
    } catch (err) {
      setData({
        playbooks: [],
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load agent playbooks",
      });
    }
  }, [apiEndpoint]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = useCallback(
    async (id: number, status: PlaybookStatus) => {
      const result = await updateAgentPlaybookStatus(apiEndpoint, id, status);
      if (result.success) {
        setData((prev) => ({
          ...prev,
          playbooks: prev.playbooks.map((p) =>
            p.agent_playbook_id === id ? { ...p, playbook_status: status } : p
          ),
        }));
      }
      return result;
    },
    [apiEndpoint]
  );

  const removePlaybook = useCallback(
    async (id: number) => {
      const result = await deleteAgentPlaybook(apiEndpoint, id);
      if (result.success) {
        setData((prev) => ({
          ...prev,
          playbooks: prev.playbooks.filter((p) => p.agent_playbook_id !== id),
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
        const playbooks = await searchAgentPlaybooks(apiEndpoint, {
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
    async (payload: AddAgentPlaybookPayload) => {
      const result = await addAgentPlaybook(apiEndpoint, [payload]);
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
    updateStatus,
    removePlaybook,
    search,
    createPlaybook,
  };
}