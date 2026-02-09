// INSIGHTS-SPECIFIC: Sidebar component for insights shell
"use client";

import { useState } from "react";
import { useInsightsUI } from "@/app/lib/insights/ui-store";
import { env } from "@/app/lib/env";

interface MenuItem {
  label: string;
  icon: string;
  hasSubmenu?: boolean; // Right chevron indicator
  badge?: "Beta" | "In Progress";
  active?: boolean;
  subItems?: string[]; // For Setup section
}

const setupSubItems = ["Dashboard", "Details", "Brief", "Internal Questions", "Collaborators"];

const mainItems: MenuItem[] = [
  { label: "Expenses", icon: "Wallet.svg", hasSubmenu: true },
  { label: "eBids", icon: "Handshake.svg", hasSubmenu: true },
  { label: "Attendees", icon: "Users.svg" },
  { label: "Registration", icon: "FilePenLine.svg", hasSubmenu: true },
  { label: "Website & App", icon: "AppWindow.svg", hasSubmenu: true },
  { label: "Travel", icon: "Plane.svg", hasSubmenu: true },
  { label: "Communications", icon: "MessagesSquare.svg", hasSubmenu: true },
  { label: "Reports", icon: "FileLineChart.svg" },
  { label: "Audit Logs", icon: "Search.svg" },
];

const betaItems: MenuItem[] = [
  { label: "Insights", icon: "Sparkles.svg", badge: "Beta" },
  { label: "Meetings Assistant", icon: "UserRoundSearch.svg", badge: "Beta" },
  { label: "SmartBids", icon: "Handshake.svg", badge: "Beta" },
  { label: "Scout", icon: "MapPinned.svg", badge: "Beta" },
];

function IconRenderer({ icon, label, active }: { icon: string; label: string; active?: boolean }) {
  // Special handling for Reports - use inline clock SVG
  if (label === "Reports") {
    return (
      <svg
        width={16}
        height={16}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        style={{
          opacity: active ? 1 : 0.7,
        }}
      >
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M8 4V8L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
    );
  }
  
  return (
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
  );
}

function NavRow({
  label,
  icon,
  collapsed,
  active,
  badge,
  hasSubmenu,
}: {
  label: string;
  icon: string;
  collapsed: boolean;
  active?: boolean;
  badge?: "Beta" | "In Progress";
  hasSubmenu?: boolean;
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
          "flex items-center rounded-lg cursor-pointer transition-colors",
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
          background: active ? '#f3f4f6' : 'transparent',
          width: '100%',
        }}
      >
        {collapsed ? (
          <IconRenderer icon={icon} label={label} active={active} />
        ) : (
          <>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <IconRenderer icon={icon} label={label} active={active} />
              <span 
                style={{
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: '11px',
                  fontWeight: 400,
                  color: active ? '#111827' : '#374151',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {label}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {badge && (
                <span
                  style={{
                    borderRadius: '9999px',
                    padding: '2px 8px',
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '10px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    backgroundColor: isProgress ? '#ede9fe' : '#9333EA',
                    color: isProgress ? '#7c3aed' : '#FFFFFF',
                  }}
                >
                  {badge}
                </span>
              )}
              {hasSubmenu && (
                <img
                  src={`${env.basePath}/ChevronRight.svg`}
                  alt="Submenu"
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

function SetupSection({ collapsed, setupExpanded, setSetupExpanded }: { 
  collapsed: boolean; 
  setupExpanded: boolean;
  setSetupExpanded: (expanded: boolean) => void;
}) {
  return (
    <div className="w-full">
      {/* Setup Header */}
      <div
        className="flex items-center rounded-lg cursor-pointer transition-colors text-[#374151] hover:bg-[#f3f4f6]"
        style={{
          display: 'flex',
          height: 'var(--height-h-9, 36px)',
          padding: 'var(--spacing-2, 8px) var(--spacing-4, 16px)',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--spacing-2, 8px)',
          borderRadius: 'var(--border-radius-rounded-md, 8px)',
          width: '100%',
        }}
        onClick={() => !collapsed && setSetupExpanded(!setupExpanded)}
      >
        {collapsed ? (
          <img
            src={`${env.basePath}/LayoutDashboard.svg`}
            alt="Setup"
            width={16}
            height={16}
            className="shrink-0"
            loading="eager"
            style={{ opacity: 0.7 }}
          />
        ) : (
          <>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img
                src={`${env.basePath}/LayoutDashboard.svg`}
                alt="Setup"
                width={16}
                height={16}
                className="shrink-0"
                loading="eager"
                style={{ opacity: 0.7 }}
              />
              <span 
                style={{
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: '11px',
                  fontWeight: 400,
                  color: '#374151',
                }}
              >
                Setup
              </span>
            </div>
            <img
              src={`${env.basePath}/ChevronDown.svg`}
              alt="Toggle"
              width={12}
              height={12}
              className="shrink-0 transition-transform"
              loading="eager"
              style={{ 
                opacity: 0.6,
                transform: setupExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              }}
            />
          </>
        )}
      </div>

      {/* Setup Sub-items */}
      {!collapsed && setupExpanded && (
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            paddingLeft: 'var(--spacing-4, 16px)',
            gap: '4px',
            marginTop: '4px',
          }}
        >
          {setupSubItems.map((subItem, index) => {
            const isActive = index === 0; // Dashboard is active
            return (
              <div
                key={subItem}
                className={`flex items-center rounded-lg cursor-pointer transition-colors ${
                  isActive ? 'bg-[#f3f4f6] text-[#111827]' : 'text-[#374151] hover:bg-[#f3f4f6]'
                }`}
                style={{
                  display: 'flex',
                  height: 'var(--height-h-9, 36px)',
                  padding: 'var(--spacing-2, 8px) var(--spacing-4, 16px)',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  borderRadius: 'var(--border-radius-rounded-md, 8px)',
                  background: isActive ? '#f3f4f6' : 'transparent',
                  width: '100%',
                }}
              >
                <span 
                  style={{
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '11px',
                    fontWeight: 400,
                    color: isActive ? '#111827' : '#374151',
                  }}
                >
                  {subItem}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function InsightsSidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useInsightsUI();
  const [setupExpanded, setSetupExpanded] = useState(true);

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
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            className="flex items-center gap-2 text-[11px] text-[#6b7280] hover:text-[#374151] transition-colors"
          >
            <img
              src={`${env.basePath}/CornerUpLeft.svg`}
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
          className="ml-auto rounded-full border border-[#e5e7eb] bg-white px-2 py-1 text-[11px] text-[#6b7280] hover:bg-[#f9fafb] transition-colors"
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
          flex: '1 1 0%',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
        className="pt-1"
      >
        {/* Setup Section */}
        <SetupSection 
          collapsed={sidebarCollapsed} 
          setupExpanded={setupExpanded}
          setSetupExpanded={setSetupExpanded}
        />

        {/* Main Navigation Items */}
        {mainItems.map((item) => (
          <NavRow
            key={item.label}
            label={item.label}
            icon={item.icon}
            collapsed={sidebarCollapsed}
            active={item.active}
            badge={item.badge}
            hasSubmenu={item.hasSubmenu}
          />
        ))}

        {/* Beta Features Section */}
        {betaItems.map((item) => (
          <NavRow
            key={item.label}
            label={item.label}
            icon={item.icon}
            collapsed={sidebarCollapsed}
            active={item.active}
            badge={item.badge}
            hasSubmenu={item.hasSubmenu}
          />
        ))}
      </div>

      {/* Bottom CTA Panel */}
      {!sidebarCollapsed && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '12px',
            margin: '8px',
            borderRadius: 'var(--border-radius-rounded-md, 8px)',
            border: '1px solid #9333EA',
            background: '#F9FAFB',
            gap: '12px',
            width: 'calc(100% - 16px)',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <img
              src={`${env.basePath}/Sparkles.svg`}
              alt="Beta"
              width={16}
              height={16}
              style={{
                width: '16px',
                height: '16px',
                flexShrink: 0,
              }}
              loading="eager"
            />
            <span
              style={{
                fontFamily: "'Open Sans', sans-serif",
                fontSize: '11px',
                fontWeight: 500,
                color: '#111827',
                lineHeight: '16px',
              }}
            >
              Try Beta Moduls
            </span>
          </div>
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: 'var(--border-radius-rounded-md, 8px)',
              border: '1px solid var(--base-input, #E6EAF0)',
              background: '#FFFFFF',
              cursor: 'pointer',
              fontFamily: "'Open Sans', sans-serif",
              fontSize: '11px',
              fontWeight: 400,
              color: '#111827',
              width: '100%',
              height: '36px',
            }}
            className="hover:bg-[#f9fafb] transition-colors"
          >
            <span>Request Access</span>
            <img
              src={`${env.basePath}/ChevronRight.svg`}
              alt="Arrow"
              width={12}
              height={12}
              style={{
                width: '12px',
                height: '12px',
                flexShrink: 0,
              }}
              loading="eager"
            />
          </button>
        </div>
      )}
    </aside>
  );
}
