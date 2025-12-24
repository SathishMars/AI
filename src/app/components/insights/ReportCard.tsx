// INSIGHTS-SPECIFIC: Report card component
"use client";

import type { InsightsReport } from "@/app/lib/insights/data";
import { useRouter } from "next/navigation";
import { useInsightsUI } from "@/app/lib/insights/ui-store";

export function InsightsReportCard({ report }: { report: InsightsReport }) {
  const router = useRouter();
  const { openAime } = useInsightsUI();

  const onCustomize = () => {
    openAime();                 // ✅ auto-expand aime
    router.push("/arrivals");   // ✅ switch to Arrivals by Date page
  };

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-[0_2px_3px_rgba(15,23,42,0.03)]">
      {report.tag && (
        <div className="mb-2 inline-flex rounded-full bg-[#f5f3ff] px-2 py-[2px] text-[11px] font-medium text-[#7c3aed]">
          {report.tag}
        </div>
      )}

      {report.date && (
        <div className="mb-1 flex items-center gap-2 text-[11px] text-[#9ca3af]">
          <span className="h-[14px] w-[14px] rounded-full border border-[#9ca3af]" />
          <span>{report.date}</span>
        </div>
      )}

      <button
        onClick={() => router.push("/arrivals")}
        className="mb-3 text-left text-[13px] font-semibold text-[#111827] hover:underline"
      >
        {report.title}
      </button>

      <div className="mt-2 flex items-center justify-between">
        <button
          onClick={onCustomize}
          className="rounded-full border border-[#e5e7eb] bg-white px-3 py-2 text-[12px] text-[#374151] hover:bg-[#f9fafb]"
        >
          Customize
        </button>

        <div className="flex gap-2">
          <button className="h-8 w-8 rounded-full border border-[#e5e7eb] bg-white text-[#6b7280] hover:bg-[#f9fafb]">
            ↓
          </button>
          <button className="h-8 w-8 rounded-full border border-[#e5e7eb] bg-white text-[#6b7280] hover:bg-[#f9fafb]">
            ⋮
          </button>
        </div>
      </div>
    </div>
  );
}

