"use client";

import { useEffect, useState, useCallback } from "react";

const SIDEBAR_STORAGE_KEY = "reflexio-sidebar-collapsed";

export function useSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === "true") {
      setCollapsed(true);
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return { collapsed, toggle };
}