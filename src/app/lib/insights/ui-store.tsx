// INSIGHTS-SPECIFIC: UI state management for insights shell
// This is separate from workflow UI state

"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type PickColumnsData = {
  allColumns: string[];
  selectedColumns: string[];
  onApply: (columns: string[]) => void;
} | null;

type AimeAction =
  | { type: "reorder_column"; column: string; position: number; afterColumn?: string; beforeColumn?: string }
  | { type: "filter"; column: string; value: string }
  | { type: "clear_filter"; column?: string }
  | { type: "sort"; column: string; direction: "asc" | "desc" }
  | { type: "clear_sort" }
  | null;

type InsightsUIState = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;

  aimeOpen: boolean; // right panel open/closed
  setAimeOpen: (v: boolean) => void;

  pickColumnsOpen: boolean; // pick columns panel open/closed
  setPickColumnsOpen: (v: boolean) => void;
  pickColumnsData: PickColumnsData;
  setPickColumnsData: (data: PickColumnsData) => void;

  aimeAction: AimeAction;
  setAimeAction: (action: AimeAction) => void;

  eventId: number;
  setEventId: (id: number) => void;

  // when Customize is clicked anywhere -> ensure aime opens
  openAime: () => void;
};

const InsightsUICtx = createContext<InsightsUIState | null>(null);

export function InsightsUIProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aimeOpen, setAimeOpen] = useState(true);
  const [pickColumnsOpen, setPickColumnsOpen] = useState(false);
  const [pickColumnsData, setPickColumnsData] = useState<PickColumnsData>(null);
  const [aimeAction, setAimeAction] = useState<AimeAction>(null);
  const [eventId, setEventId] = useState(5281);

  const value = useMemo<InsightsUIState>(
    () => ({
      sidebarCollapsed,
      setSidebarCollapsed,
      aimeOpen,
      setAimeOpen,
      pickColumnsOpen,
      setPickColumnsOpen,
      pickColumnsData,
      setPickColumnsData,
      aimeAction,
      setAimeAction,
      eventId,
      setEventId,
      openAime: () => {
        setAimeOpen(true);
        // Don't close pick columns - let user manage both panels
      },
    }),
    [sidebarCollapsed, aimeOpen, pickColumnsOpen, pickColumnsData, aimeAction, eventId]
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

