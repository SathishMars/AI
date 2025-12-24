// INSIGHTS-SPECIFIC: App shell component for insights pages
"use client";

import { InsightsUIProvider, useInsightsUI } from "@/app/lib/insights/ui-store";
import { InsightsSidebar } from "./Sidebar";
import { InsightsTopbar } from "./Topbar";
import { InsightsAimePanel } from "./AimePanel";

function InsightsShellInner({ children }: { children: React.ReactNode }) {
  const { aimeOpen, sidebarCollapsed } = useInsightsUI();

  // Exact 3-column behavior like PNG:
  // - Sidebar fixed
  // - Main fills
  // - Aime panel appears/disappears, with floating pill when hidden
  return (
    <div className="h-screen w-full overflow-hidden bg-[#f5f5f7]">
      <InsightsTopbar />

      <div
        className="grid h-[calc(100vh-56px)]"
        style={{
          gridTemplateColumns: `${sidebarCollapsed ? 72 : 260}px 1fr ${aimeOpen ? 360 : 0}px`,
        }}
      >
        <InsightsSidebar />

        <main className="h-full overflow-hidden">
          {/* Main scroll area (like PNG center area) */}
          <div className="h-full overflow-y-auto px-4 py-4">{children}</div>
        </main>

        {/* Right panel */}
        <div className="h-full overflow-hidden">
          <InsightsAimePanel />
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

