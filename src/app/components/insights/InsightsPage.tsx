// INSIGHTS-SPECIFIC: Main insights page component
"use client";

import { InsightsReportsAccordion } from "./ReportsAccordion";
import { InsightsSystemReports } from "./SystemReports";
import { useState } from "react";

export function InsightsPageComponent() {
  // My Reports vs System Reports tabs (like PNG)
  const [tab, setTab] = useState<"my" | "system">("my");

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0">
        <div className="text-[12px] text-[#9ca3af]">Big event 2025 Groupize</div>

        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="m-0 text-[32px] font-bold tracking-tight text-[#111827]">Insights</h1>
            <p className="mt-1 text-[14px] text-[#6b7280]">Realtime insights powered by aime Insights</p>

            {/* Tabs like PNG: My Reports | System Reports */}
            <div className="mt-4 inline-flex rounded-full border border-[#e5e7eb] bg-white p-1">
              <button
                onClick={() => setTab("my")}
                className={[
                  "rounded-full px-4 py-2 text-[13px]",
                  tab === "my" ? "bg-[#111827] text-white" : "text-[#374151]",
                ].join(" ")}
              >
                My Reports
              </button>
              <button
                onClick={() => setTab("system")}
                className={[
                  "rounded-full px-4 py-2 text-[13px]",
                  tab === "system" ? "bg-[#111827] text-white" : "text-[#374151]",
                ].join(" ")}
              >
                System Reports
              </button>
            </div>
          </div>

          {/* Search (top-right) */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center rounded-full border border-[#e5e7eb] bg-white px-4 py-2">
              <span className="mr-2 h-4 w-4 rounded-full border border-[#9ca3af]" />
              <input
                className="w-[220px] border-none text-[13px] outline-none"
                placeholder="Search reports"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content - scrollable area */}
      <div className="flex-1 overflow-y-auto">
        {tab === "my" ? <InsightsReportsAccordion /> : <InsightsSystemReports />}
      </div>
    </div>
  );
}

