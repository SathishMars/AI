// INSIGHTS-SPECIFIC: App shell component for insights pages
"use client";

import { InsightsUIProvider, useInsightsUI } from "@/app/lib/insights/ui-store";
import { InsightsSidebar } from "./Sidebar";
import { InsightsTopbar } from "./Topbar";
import { InsightsNavbar } from "./Navbar";
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
  const rightPanelWidth = (aimeOpen || pickColumnsOpen) ? 382 : 0;

  // Sidebar width based on collapse state (only used on non-arrivals pages)
  const sidebarWidth = sidebarCollapsed ? 72 : 256;

  // Grid layout: 2 columns on arrivals page (no sidebar), 3 columns on other pages
  const gridTemplateColumns = isArrivalsPage 
    ? `1fr ${rightPanelWidth}px`
    : `${sidebarWidth}px 1fr ${rightPanelWidth}px`;
  
  return (
    <div 
      style={{
        width: '1440px',
        height: '1024px',
        background: 'var(--base-background-secondary, #F8FAFC)',
      }}
      className="flex flex-col overflow-hidden mx-auto"
    >
      <InsightsTopbar />

      <div
        className="grid flex-1 overflow-hidden min-h-0"
        style={{
          gridTemplateColumns: gridTemplateColumns,
        }}
      >
        {/* Sidebar - only show on non-arrivals pages */}
        {!isArrivalsPage && <InsightsSidebar />}

        <main className="flex h-full flex-col overflow-hidden">
          {/* Navbar - only show on non-arrivals pages */}
          {!isArrivalsPage && <InsightsNavbar />}
          
          {/* Main scroll area (like PNG center area) */}
          <div className={`flex-1 px-4 py-4 ${isArrivalsPage ? 'overflow-hidden' : 'overflow-y-auto'}`}>{children}</div>
        </main>

        {/* Right panel - render when panels are open */}
        {(aimeOpen || pickColumnsOpen) && (
          <div className="h-full overflow-hidden w-full">
            {/* Show Pick Columns if open, otherwise show AIME */}
            {pickColumnsOpen && pickColumnsData ? (
              <InsightsPickColumnsPanel
                allColumns={pickColumnsData.allColumns}
                selectedColumns={pickColumnsData.selectedColumns}
                columnTypes={pickColumnsData.columnTypes}
                onApply={pickColumnsData.onApply}
              />
            ) : (
              <InsightsAimePanel />
            )}
          </div>
        )}
      </div>
      
      {/* Always render AIME panel for minimized button (positioned fixed, outside grid) */}
      {!aimeOpen && !pickColumnsOpen && <InsightsAimePanel />}
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

