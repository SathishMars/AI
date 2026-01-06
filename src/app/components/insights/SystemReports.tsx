// INSIGHTS-SPECIFIC: System reports component
"use client";

import { insightsAttendanceReports } from "@/app/lib/insights/data";
import { InsightsReportCard } from "./ReportCard";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function InsightsSystemReports() {
  const [attendanceOpen, setAttendanceOpen] = useState(true);

  return (
    <div className="px-6 pb-4">
      <button
        onClick={() => setAttendanceOpen((v) => !v)}
        className="flex w-full items-center gap-2 py-3 text-left"
      >
        <ChevronDown 
          className={`h-4 w-4 text-[#6b7280] transition-transform ${attendanceOpen ? '' : '-rotate-90'}`} 
          strokeWidth={2}
        />
        <div className="text-[13px] font-semibold text-[#111827]">Attendance (8)</div>
        <div className="text-[12px] text-[#6b7280]">
          Reports about check-in, sessions, engagement.
        </div>
      </button>

      {attendanceOpen && (
        <div className="flex flex-col">
          {insightsAttendanceReports.map((r) => (
            <InsightsReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}

