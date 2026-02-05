// INSIGHTS-SPECIFIC: System reports component
"use client";

import { insightsAttendanceReports } from "@/app/lib/insights/data";
import { InsightsReportCard } from "./ReportCard";
import { useState } from "react";
import { ChevronDown, Users } from "lucide-react";

export function InsightsSystemReports() {
  const [attendanceOpen, setAttendanceOpen] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', width: '100%' }}>
      {/* Category Header */}
      <button
        onClick={() => setAttendanceOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 0',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
        }}
      >
        {/* Chevron Icon */}
        <ChevronDown
          size={16}
          style={{
            transform: attendanceOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
            color: '#6b7280',
          }}
        />
        
        {/* User Icon */}
        <Users
          size={16}
          style={{ flexShrink: 0, color: '#6b7280' }}
        />
        
        {/* Category Title */}
        <span
          style={{
            fontFamily: "'Open Sans', sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            color: '#111827',
            flexShrink: 0,
          }}
        >
          Attendance (8)
        </span>
        
        {/* Description */}
        <span
          style={{
            fontFamily: "'Open Sans', sans-serif",
            fontSize: '12px',
            fontWeight: 400,
            color: '#6b7280',
            marginLeft: '8px',
          }}
        >
          Reports about check-in, sessions, engagement.
        </span>
      </button>

      {/* Report Cards List */}
      {attendanceOpen && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            marginTop: '8px',
          }}
        >
          {insightsAttendanceReports.map((r) => (
            <InsightsReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}

