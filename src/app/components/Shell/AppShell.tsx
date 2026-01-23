// INSIGHTS-SPECIFIC: App shell component for insights pages
"use client";

import { InsightsUIProvider, useInsightsUI } from "@/app/lib/insights/ui-store";
import { InsightsSidebar } from "./Sidebar";
import { InsightsTopbar } from "./Topbar";
import { InsightsAimePanel } from "./AimePanel";
import { InsightsPickColumnsPanel } from "../arrivals/PickColumnsPanel";
import { usePathname } from "next/navigation";

function InsightsShellInner({ children }: { children: React.ReactNode }) {
  const { aimeOpen, pickColumnsOpen, pickColumnsData, sidebarCollapsed } = useInsightsUI();
  const pathname = usePathname();
  const isArrivalsPage = pathname?.includes('/arrivals');

  // Calculate right panel width based on which panels are open
  // If both are open, show Pick Columns (it overlays or replaces AIME temporarily)
  // Otherwise show whichever is open
  const rightPanelWidth = (aimeOpen || pickColumnsOpen) ? 360 : 0;

  // Exact 3-column behavior like PNG:
  // - Sidebar fixed
  // - Main fills
  // - Right panel (AIME or Pick Columns) appears/disappears
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white">
      <InsightsTopbar />

      <div
        className="grid flex-1 overflow-hidden"
        style={{
          gridTemplateColumns: `${sidebarCollapsed ? 72 : 260}px 1fr ${rightPanelWidth}px`,
        }}
      >
        <InsightsSidebar />

        <main className="flex h-full flex-col overflow-hidden">
          {/* Main scroll area (like PNG center area) */}
          <div className={`flex-1 px-4 py-4 ${isArrivalsPage ? 'overflow-hidden' : 'overflow-y-auto'}`}>{children}</div>
        </main>

        {/* Right panel */}
        <div className="h-full overflow-hidden">
          {/* Show Pick Columns if open, otherwise show AIME */}
          {pickColumnsOpen && pickColumnsData ? (
            <InsightsPickColumnsPanel
              allColumns={pickColumnsData.allColumns}
              selectedColumns={pickColumnsData.selectedColumns}
              onApply={pickColumnsData.onApply}
            />
          ) : (
            <InsightsAimePanel />
          )}
        </div>
      </div>
    </div>
  );
}

export function InsightsAppShell({ children }: { children: React.ReactNode }) {
  return (
    <InsightsUIProvider>
      <InsightsShellInner>{children}</InsightsShellInner>
    </InsightsUIProvider>
  );
}

// Legacy export for backward compatibility
export const AppShell = InsightsAppShell;

