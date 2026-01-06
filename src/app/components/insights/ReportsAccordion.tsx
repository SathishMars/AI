// INSIGHTS-SPECIFIC: Reports accordion component
"use client";

import { insightsMyReports, insightsSharedReports } from "@/app/lib/insights/data";
import { InsightsReportCard } from "./ReportCard";
import { useState } from "react";

function Section({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-xl border border-[#e5e7eb] bg-white px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#6b7280]">{open ? "▾" : "▸"}</span>
          <div className="text-[13px] font-semibold text-[#111827]">
            {title}
          </div>
        </div>
      </button>

      {open && <div className="mt-3 grid grid-cols-3 gap-3">{children}</div>}
    </div>
  );
}

export function InsightsReportsAccordion() {
  // ✅ both collapsible like PNG
  const [openMy, setOpenMy] = useState(true);
  const [openShared, setOpenShared] = useState(true);

  return (
    <div className="pb-4">
      <Section
        title="My Reports"
        count={3}
        open={openMy}
        onToggle={() => setOpenMy((v) => !v)}
      >
        {insightsMyReports.map((r) => (
          <InsightsReportCard key={r.id} report={r} />
        ))}
      </Section>

      <Section
        title="Shared With Me"
        count={4}
        open={openShared}
        onToggle={() => setOpenShared((v) => !v)}
      >
        {insightsSharedReports.map((r) => (
          <InsightsReportCard key={r.id} report={r} />
        ))}
      </Section>
    </div>
  );
}

