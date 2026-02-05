// INSIGHTS-SPECIFIC: Reports accordion component
"use client";

import { insightsMyReports, insightsSharedReports } from "@/app/lib/insights/data";
import { InsightsReportCard } from "./ReportCard";
import { useState } from "react";
import { ChevronDown, Users } from "lucide-react";

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', width: '100%', marginTop: '16px' }}>
      <button
        onClick={onToggle}
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
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
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
          {title} ({count})
        </span>
      </button>

      {open && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            marginTop: '8px',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function InsightsReportsAccordion() {
  // ✅ both collapsible like PNG
  const [openMy, setOpenMy] = useState(true);
  const [openShared, setOpenShared] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '16px', width: '100%' }}>
      <Section
        title="My Reports"
        count={insightsMyReports.length}
        open={openMy}
        onToggle={() => setOpenMy((v) => !v)}
      >
        {insightsMyReports.map((r) => (
          <InsightsReportCard key={r.id} report={r} />
        ))}
      </Section>

      <Section
        title="Shared With Me"
        count={insightsSharedReports.length}
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

