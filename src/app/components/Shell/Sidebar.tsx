// INSIGHTS-SPECIFIC: Sidebar component for insights shell
"use client";

import { useInsightsUI } from "@/app/lib/insights/ui-store";
import { env } from "@/app/lib/env";

interface MenuItem {
  label: string;
  icon: string; // SVG filename
  hasDropdown?: boolean;
  badge?: "Beta" | "In Progress";
  active?: boolean;
}

const mainItems: MenuItem[] = [
  { label: "Setup", icon: "LayoutDashboard.svg" },
  { label: "Expenses", icon: "Wallet.svg", hasDropdown: true },
  { label: "eBids", icon: "Handshake.svg" },
  { label: "Attendees", icon: "Users.svg" },
  { label: "Registration", icon: "FilePenLine.svg", hasDropdown: true },
  { label: "Website & App", icon: "AppWindow.svg", hasDropdown: true },
  { label: "Travel", icon: "Plane.svg", hasDropdown: true },
  { label: "Communications", icon: "MessagesSquare.svg", hasDropdown: true },
  { label: "Reports", icon: "FileLineChart.svg" },
  { label: "Insights", icon: "FilePieChart.svg", badge: "Beta", active: true },
  { label: "Meetings Assistant", icon: "UserRoundSearch.svg", badge: "Beta" },
  { label: "SmartBids", icon: "Handshake.svg", badge: "Beta" },
  { label: "Scout", icon: "MapPinned.svg", badge: "Beta" },
  { label: "Budget", icon: "Wallet.svg", badge: "In Progress" },
  { label: "Support", icon: "Headset.svg", badge: "In Progress" },
];

function NavRow({
  label,
  icon,
  collapsed,
  active,
  badge,
  hasDropdown,
}: {
  label: string;
  icon: string;
  collapsed: boolean;
  active?: boolean;
  badge?: "Beta" | "In Progress";
  hasDropdown?: boolean;
}) {
  const isProgress = badge === "In Progress";
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        alignSelf: 'stretch',
      }}
      className="w-full"
    >
      <div
        className={[
          "flex items-center rounded-lg cursor-pointer",
          active ? "bg-[#f3f4f6] text-[#111827]" : "text-[#374151] hover:bg-[#f3f4f6]",
        ].join(" ")}
        style={{
          display: 'flex',
          height: 'var(--height-h-9, 36px)',
          padding: 'var(--spacing-2, 8px) var(--spacing-4, 16px)',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--spacing-2, 8px)',
          borderRadius: 'var(--border-radius-rounded-md, 8px)',
          background: 'var(--tailwind-colors-base-transparent, rgba(255, 255, 255, 0.00))',
          width: '100%',
        }}
      >
        {collapsed ? (
          // Collapsed: Just show icon centered
          <img
            src={`${env.basePath}/${icon}`}
            alt={label}
            width={16}
            height={16}
            className="shrink-0"
            loading="eager"
            style={{
              filter: active ? 'none' : 'opacity(0.7)',
            }}
          />
        ) : (
          // Expanded: Show icon, label, badge/dropdown
          <>
            <div className="flex items-center gap-3">
              <img
                src={`${env.basePath}/${icon}`}
                alt={label}
                width={16}
                height={16}
                className="shrink-0"
                loading="eager"
                style={{
                  filter: active ? 'none' : 'opacity(0.7)',
                }}
              />
              <span className="text-[11px]">{label}</span>
            </div>
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
                <img
                  src={`${env.basePath}/ChevronDown.svg`}
                  alt="Dropdown"
                  width={12}
                  height={12}
                  className="shrink-0"
                  loading="eager"
                  style={{ opacity: 0.6 }}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function InsightsSidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useInsightsUI();

  return (
    <aside
      style={{
        display: 'flex',
        width: sidebarCollapsed ? '72px' : '256px',
        height: '958px',
        flexDirection: 'column',
        alignItems: 'flex-start',
        borderRight: '1px solid var(--base-border, #E6EAF0)',
        background: 'var(--base-sidebar, #FFF)',
      }}
      className="flex flex-col overflow-hidden"
    >
      {/* Header with Back button and Collapse button */}
      <div className="flex items-center justify-between px-3 py-2 w-full">
        {!sidebarCollapsed && (
          <button
            type="button"
            style={{
              display: 'flex',
              height: 'var(--height-h-9, 36px)',
              padding: 'var(--spacing-2, 8px) var(--spacing-4, 16px)',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 'var(--spacing-2, 8px)',
              borderRadius: 'var(--border-radius-rounded-md, 8px)',
              background: 'var(--tailwind-colors-base-transparent, rgba(255, 255, 255, 0.00))',
            }}
            className="flex items-center gap-2 text-[11px] text-[#6b7280] hover:text-[#374151] transition-colors"
          >
            <img
              src={`${env.basePath}/ArrowLeft.svg`}
              alt="Back"
              width={16}
              height={16}
              loading="eager"
            />
            Back to Events
          </button>
        )}

        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="ml-auto rounded-full border border-[#e5e7eb] bg-white px-2 py-1 text-[11px] text-[#6b7280] hover:bg-[#f9fafb]"
          title="Collapse sidebar"
        >
          {sidebarCollapsed ? "»" : "«"}
        </button>
      </div>

      {/* Sidebar items container */}
      <div
        style={{
          display: 'flex',
          padding: '0 var(--spacing-2, 8px)',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '4px',
          alignSelf: 'stretch',
        }}
        className="flex-1 overflow-y-auto overflow-x-hidden w-full min-h-0 pt-1"
      >
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
    </aside>
  );
}

