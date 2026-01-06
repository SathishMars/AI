// INSIGHTS-SPECIFIC: Report card component
"use client";

import type { InsightsReport } from "@/app/lib/insights/data";
import { useRouter } from "next/navigation";
import { useInsightsUI } from "@/app/lib/insights/ui-store";
import { Sparkles, Download, MoreVertical, User } from "lucide-react";

export function InsightsReportCard({ report }: { report: InsightsReport }) {
  const router = useRouter();
  const { openAime } = useInsightsUI();

  const onCustomize = () => {
    openAime(); // ✅ auto-expand aime
    requestAnimationFrame(() => {
      router.push("/arrivals"); // ✅ switch to Arrivals by Date page
    });
  };

  return (
    <div className="mb-3 flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
      <div className="flex flex-col gap-1.5">
        {report.tag && (
          <div className="inline-flex items-center gap-1 rounded-full bg-[#f5f3ff] px-2 py-1 text-[11px] font-medium text-[#7c3aed]">
            <User className="h-3 w-3" strokeWidth={2} />
            {report.tag}
          </div>
        )}
        <span className="text-[13px] font-semibold text-[#111827]">{report.title}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onCustomize}
          className="flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] text-[#374151] hover:bg-[#f9fafb] transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#111827]" strokeWidth={2} />
          Customize
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white text-[#6b7280] hover:bg-[#f9fafb] transition-colors">
          <Download className="h-4 w-4" strokeWidth={2} />
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white text-[#6b7280] hover:bg-[#f9fafb] transition-colors">
          <MoreVertical className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

