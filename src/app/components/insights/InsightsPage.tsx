// INSIGHTS-SPECIFIC: Main insights page component
"use client";

import { InsightsReportsAccordion } from "./ReportsAccordion";
import { InsightsSystemReports } from "./SystemReports";
import { useState } from "react";
import { Search } from "lucide-react";
import { useInsightsUI } from "@/app/lib/insights/ui-store";

export function InsightsPageComponent() {
  // My Reports vs System Reports tabs (like PNG)
  const [tab, setTab] = useState<"my" | "system">("my");
  const { aimeOpen, pickColumnsOpen, sidebarCollapsed } = useInsightsUI();
  
  // When AIME is minimized OR sidebar is collapsed, stretch to fill available space
  const shouldExpand = (!aimeOpen && !pickColumnsOpen) || sidebarCollapsed;

  return (
    <div
      style={{
        display: 'flex',
        width: shouldExpand ? '100%' : '754px',
        height: '878px',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '24px',
      }}
    >
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 'var(--spacing-6, 24px)',
          alignSelf: 'stretch',
        }}
      >
        {/* Left Section - Title and Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "'Instrument Sans', sans-serif",
              fontSize: '32px',
              fontWeight: 700,
              lineHeight: '40px',
              color: '#111827',
            }}
          >
            Insights
          </h1>
          <p
            style={{
              margin: 0,
              fontFamily: "'Open Sans', sans-serif",
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '20px',
              color: '#6b7280',
            }}
          >
            Realtime insights powered by aime Insights
          </p>

          {/* Tabs Component */}
          <div
            style={{
              display: 'flex',
              width: '300px',
              height: 'var(--height-h-9, 36px)',
              padding: '3px var(--spacing-2, 8px)',
              alignItems: 'center',
              flexShrink: 0,
              borderRadius: 'var(--border-radius-rounded-lg, 10px)',
              border: '1px solid var(--base-border, #E6EAF0)',
              background: 'var(--base-accent, #F1F3F7)',
              marginTop: '16px',
            }}
          >
            <button
              onClick={() => setTab("my")}
              style={{
                flex: 1,
                height: '30px',
                padding: '0 12px',
                borderRadius: '8px',
                border: 'none',
                background: tab === "my" ? '#FFFFFF' : 'transparent',
                color: tab === "my" ? '#111827' : '#374151',
                fontFamily: "'Open Sans', sans-serif",
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              My Reports
            </button>
            <button
              onClick={() => setTab("system")}
              style={{
                flex: 1,
                height: '30px',
                padding: '0 12px',
                borderRadius: '8px',
                border: 'none',
                background: tab === "system" ? '#FFFFFF' : 'transparent',
                color: tab === "system" ? '#111827' : '#374151',
                fontFamily: "'Open Sans', sans-serif",
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              System Reports
            </button>
          </div>
        </div>

        {/* Right Section - Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '296px',
              height: '36px',
              padding: '4px 12px',
              borderRadius: '8px',
              border: '1px solid var(--base-input, #E6EAF0)',
              background: '#FFFFFF',
            }}
          >
            <Search
              size={16}
              style={{ flexShrink: 0, color: '#637584' }}
            />
            <input
              type="text"
              placeholder="Search"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: "'Open Sans', sans-serif",
                fontSize: '14px',
                color: '#637584',
              }}
            />
          </div>
        </div>
      </div>

      {/* Content - scrollable area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          width: '100%',
        }}
      >
        {tab === "my" ? <InsightsReportsAccordion /> : <InsightsSystemReports />}
      </div>
    </div>
  );
}

