// INSIGHTS-SPECIFIC: Sidebar component for insights shell
"use client";

import { useInsightsUI } from "@/app/lib/insights/ui-store";

const mainItems = [
  "Setup",
  "Expenses",
  "eBids",
  "Attendees",
  "Registration",
  "Website & App",
  "Travel",
  "Communications",
  "Reports",
  "Insights",
  "Meetings Assistant",
  "SmartBids",
  "Scout",
  "Budget",
  "Support",
];

function NavRow({
  label,
  collapsed,
  active,
  badge,
}: {
  label: string;
  collapsed: boolean;
  active?: boolean;
  badge?: string;
}) {
  const isProgress = badge === "In Progress";
  return (
    <div
      className={[
        "flex items-center justify-between rounded-lg px-3 py-[5px] text-[11px]",
        active ? "bg-[#111827] text-white" : "text-[#374151] hover:bg-[#f3f4f6]",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div className={["h-4 w-4 rounded bg-[#d1d5db]", active ? "bg-white/30" : ""].join(" ")} />
        {!collapsed && <span>{label}</span>}
      </div>
      {!collapsed && badge && (
        <span
          className={[
            "rounded-full px-2 py-[2px] text-[10px] font-medium",
            isProgress ? "bg-[#f3f4f6] text-[#4b5563]" : "bg-[#ede9fe] text-[#7c3aed]",
          ].join(" ")}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

export function InsightsSidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useInsightsUI();

  return (
    <aside className="flex h-full flex-col border-r border-[#e5e7eb] bg-white">
      <div className="flex items-center justify-between px-3 py-2">
        {!sidebarCollapsed && (
          <button className="flex items-center gap-2 text-[11px] text-[#6b7280]">
            <span className="rounded-full border border-[#d1d5db] px-2 text-[10px]">←</span>
            Back to Events
          </button>
        )}

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="ml-auto rounded-full border border-[#e5e7eb] bg-white px-2 py-1 text-[11px] text-[#6b7280] hover:bg-[#f9fafb]"
          title="Collapse sidebar"
        >
          {sidebarCollapsed ? "»" : "«"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {!sidebarCollapsed && (
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9ca3af]">
            Setup
          </div>
        )}
        <div className="space-y-0.5">
          {/* first section like PNG */}
          <NavRow label="Dashboard" collapsed={sidebarCollapsed} active />
          <NavRow label="Details" collapsed={sidebarCollapsed} />
          <NavRow label="Collaborators" collapsed={sidebarCollapsed} />
        </div>

        <div className="mt-2 space-y-0.5">
          {!sidebarCollapsed && (
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9ca3af]">
              Navigation
            </div>
          )}
          {mainItems.map((i) => (
            <NavRow
              key={i}
              label={i}
              collapsed={sidebarCollapsed}
              badge={
                ["Insights", "Meetings Assistant", "SmartBids", "Scout"].includes(i)
                  ? "Beta"
                  : ["Budget", "Support"].includes(i)
                    ? "In Progress"
                    : undefined
              }
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

