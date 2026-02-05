// INSIGHTS-SPECIFIC: Report card component
"use client";

import type { InsightsReport } from "@/app/lib/insights/data";
import { useRouter, useSearchParams } from "next/navigation";
import { useInsightsUI } from "@/app/lib/insights/ui-store";
import { Sparkles, Download, MoreVertical, Users } from "lucide-react";

export function InsightsReportCard({ report }: { report: InsightsReport }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openAime } = useInsightsUI();

  const onCustomize = () => {
    openAime(); // ✅ auto-expand aime
    requestAnimationFrame(() => {
      // Get eventId from URL params and include it in navigation
      // Default to 5281 if not present
      const eventId = searchParams.get('eventId') || '5281';
      router.push(`/insights/attendee/${eventId}`); // ✅ switch to Attendee page
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        background: '#FFFFFF',
        padding: '12px 16px',
        width: '100%',
      }}
    >
      {/* Left Section - Tag and Title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        {report.tag && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              borderRadius: '9999px',
              background: '#F5F3FF',
              padding: '4px 8px',
              width: 'fit-content',
            }}
          >
            <Users
              size={12}
              style={{ flexShrink: 0 }}
            />
            <span
              style={{
                fontFamily: "'Open Sans', sans-serif",
                fontSize: '11px',
                fontWeight: 500,
                color: '#7C3AED',
              }}
            >
              {report.tag}
            </span>
          </div>
        )}
        <span
          style={{
            fontFamily: "'Open Sans', sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            color: '#111827',
          }}
        >
          {report.title}
        </span>
      </div>

      {/* Right Section - Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Customize Button */}
        <button
          onClick={onCustomize}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            background: '#FFFFFF',
            padding: '6px 12px',
            fontFamily: "'Open Sans', sans-serif",
            fontSize: '12px',
            fontWeight: 500,
            color: '#374151',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F9FAFB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#FFFFFF';
          }}
        >
          <Sparkles
            size={14}
            style={{ flexShrink: 0 }}
          />
          Customize
        </button>
        
        {/* Download Button */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            background: '#FFFFFF',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F9FAFB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#FFFFFF';
          }}
        >
          <Download
            size={16}
          />
        </button>
        
        {/* More Options Button */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            background: '#FFFFFF',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F9FAFB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#FFFFFF';
          }}
        >
          <MoreVertical
            size={16}
          />
        </button>
      </div>
    </div>
  );
}

