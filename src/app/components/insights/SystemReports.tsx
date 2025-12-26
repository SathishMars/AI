// INSIGHTS-SPECIFIC: System reports component
"use client";

import { insightsAttendanceReports } from "@/app/lib/insights/data";
import { InsightsReportCard } from "./ReportCard";
import { useState } from "react";

export function InsightsSystemReports() {
  const [attendanceOpen, setAttendanceOpen] = useState(true);

  return (
    <div className="pb-4">
      <button
        onClick={() => setAttendanceOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-[#e5e7eb] bg-white px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#6b7280]">{attendanceOpen ? "▾" : "▸"}</span>
          <div className="text-[13px] font-semibold text-[#111827]">Attendance (8)</div>
          <div className="ml-2 text-[12px] text-[#6b7280]">
            Reports about check-in, sessions, engagement.
          </div>
        </div>
      </button>

      {attendanceOpen && (
        <div className="mt-3 flex flex-col space-y-3">
          {insightsAttendanceReports.map((r) => (
            <InsightsReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}

