// INSIGHTS-SPECIFIC: UI state management for insights shell
// This is separate from workflow UI state

"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type InsightsUIState = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;

  aimeOpen: boolean; // right panel open/closed
  setAimeOpen: (v: boolean) => void;

  // when Customize is clicked anywhere -> ensure aime opens
  openAime: () => void;
};

const InsightsUICtx = createContext<InsightsUIState | null>(null);

export function InsightsUIProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aimeOpen, setAimeOpen] = useState(true);

  const value = useMemo<InsightsUIState>(
    () => ({
      sidebarCollapsed,
      setSidebarCollapsed,
      aimeOpen,
      setAimeOpen,
      openAime: () => setAimeOpen(true),
    }),
    [sidebarCollapsed, aimeOpen]
  );

  return <InsightsUICtx.Provider value={value}>{children}</InsightsUICtx.Provider>;
}

export function useInsightsUI() {
  const ctx = useContext(InsightsUICtx);
  if (!ctx) throw new Error("useInsightsUI must be used inside InsightsUIProvider");
  return ctx;
}

// Legacy exports for backward compatibility
export const UIProvider = InsightsUIProvider;
export function useUI() {
  return useInsightsUI();
}

