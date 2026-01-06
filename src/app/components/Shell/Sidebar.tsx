// INSIGHTS-SPECIFIC: Sidebar component for insights shell
"use client";

import { useInsightsUI } from "@/app/lib/insights/ui-store";
import {
  ChevronLeft,
  ChevronDown,
  Grid3x3,
  Wallet,
  Handshake,
  Users,
  FilePenLine,
  Monitor,
  Plane,
  MessageSquare,
  FileBarChart,
  UserCircle,
  MapPin,
  Headphones,
  LucideIcon,
} from "lucide-react";

interface MenuItem {
  label: string;
  icon: LucideIcon;
  hasDropdown?: boolean;
  badge?: "Beta" | "In Progress";
  active?: boolean;
}

const mainItems: MenuItem[] = [
  { label: "Setup", icon: Grid3x3 },
  { label: "Expenses", icon: Wallet, hasDropdown: true },
  { label: "eBids", icon: Handshake },
  { label: "Attendees", icon: Users },
  { label: "Registration", icon: FilePenLine, hasDropdown: true },
  { label: "Website & App", icon: Monitor, hasDropdown: true },
  { label: "Travel", icon: Plane, hasDropdown: true },
  { label: "Communications", icon: MessageSquare, hasDropdown: true },
  { label: "Reports", icon: FileBarChart },
  { label: "Insights", icon: FileBarChart, badge: "Beta", active: true },
  { label: "Meetings Assistant", icon: UserCircle, badge: "Beta" },
  { label: "SmartBids", icon: Handshake, badge: "Beta" },
  { label: "Scout", icon: MapPin, badge: "Beta" },
  { label: "Budget", icon: Wallet, badge: "In Progress" },
  { label: "Support", icon: Headphones, badge: "In Progress" },
];

function NavRow({
  label,
  icon: Icon,
  collapsed,
  active,
  badge,
  hasDropdown,
}: {
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
  active?: boolean;
  badge?: "Beta" | "In Progress";
  hasDropdown?: boolean;
}) {
  const isProgress = badge === "In Progress";
  return (
    <div
      className={[
        "flex items-center justify-between rounded-lg px-3 py-[5px] text-[11px] cursor-pointer",
        active ? "bg-[#f3f4f6] text-[#111827]" : "text-[#374151] hover:bg-[#f3f4f6]",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={[
            "h-4 w-4 shrink-0",
            active ? "text-[#111827]" : "text-[#374151]",
          ].join(" ")}
          strokeWidth={1.5}
        />
        {!collapsed && <span>{label}</span>}
      </div>
      {!collapsed && (
        <div className="flex items-center gap-2">
          {badge && (
            <span
              className={[
                "rounded-full px-2 py-[2px] text-[10px] font-medium whitespace-nowrap",
                isProgress
                  ? "bg-[#ede9fe] text-[#7c3aed]"
                  : "bg-[#7c3aed] text-white",
              ].join(" ")}
            >
              {badge}
            </span>
          )}
          {hasDropdown && (
            <ChevronDown
              className="h-3 w-3 text-[#9ca3af] shrink-0"
              strokeWidth={2}
            />
          )}
        </div>
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
          <button className="flex items-center gap-2 text-[11px] text-[#6b7280] hover:text-[#374151] transition-colors">
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
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
        <div className="space-y-0.5">
          {mainItems.map((item) => (
            <NavRow
              key={item.label}
              label={item.label}
              icon={item.icon}
              collapsed={sidebarCollapsed}
              active={item.active}
              badge={item.badge}
              hasDropdown={item.hasDropdown}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

