// INSIGHTS-SPECIFIC: Topbar component for insights shell
"use client";

export function InsightsTopbar() {
  return (
    <header className="h-14 w-full border-b border-[#e5e7eb] bg-white">
      <div className="mx-auto flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#111827] px-3 py-1 text-[12px] font-semibold uppercase text-white">
            groupize.ai
          </div>
          <div className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-[12px] text-[#374151]">
            Demo <span className="ml-1 text-[10px]">▾</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-[12px] text-[#374151] hover:bg-[#f9fafb]">
            Requests <span className="ml-1 text-[10px]">▾</span>
          </button>
          <button className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-[12px] text-[#374151] hover:bg-[#f9fafb]">
            Preview <span className="ml-1 text-[10px]">▾</span>
          </button>
          <div className="h-8 w-8 rounded-full bg-[#d1d5db]" />
        </div>
      </div>
    </header>
  );
}

