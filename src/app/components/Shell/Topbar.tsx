// INSIGHTS-SPECIFIC: Topbar component for insights shell (NavigationMenu -Desktop)
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useInsightsUI } from "@/app/lib/insights/ui-store";
import { env } from "@/app/lib/env";
import Image from "next/image";
import { useState } from "react";

export function InsightsTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { exportState } = useInsightsUI();
  const isArrivalsPage = pathname?.includes('/insights/attendee');
  const [activeTab, setActiveTab] = useState<'portal' | 'events' | 'multi-event'>('events');

  // Attendee page layout
  if (isArrivalsPage) {
    return (
      <header 
        style={{
          display: 'flex',
          width: '100%',
          height: '64px',
          padding: '0 var(--spacing-6, 24px)',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--base-border, #E6EAF0)',
          background: 'var(--base-background, #FFF)',
        }}
        className="w-full"
      >
        {/* Left Section - Back Button */}
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2, 8px)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontFamily: "'Open Sans', sans-serif",
            fontSize: '14px',
            fontWeight: 400,
            color: '#111827',
          }}
          className="hover:opacity-80 transition-opacity"
        >
          <img
            src={`${env.basePath}/ArrowLeft.svg`}
            alt="Back"
            width={16}
            height={16}
            style={{
              width: '16px',
              height: '16px',
              display: 'block',
              flexShrink: 0,
            }}
            loading="eager"
          />
          <span>Back</span>
        </button>

        {/* Right Section - Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 'var(--spacing-2, 8px)',
          }}
        >
          {/* Share Button */}
          <button
            type="button"
            style={{
              display: 'flex',
              height: '36px',
              padding: '8px 16px',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 'var(--border-radius-rounded-md, 8px)',
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              cursor: 'pointer',
              fontFamily: "'Open Sans', sans-serif",
              fontSize: '14px',
              fontWeight: 400,
              color: '#111827',
            }}
            className="hover:bg-[#F9FAFB] transition-colors"
          >
            Share
          </button>

          {/* Export Button */}
          <button
            type="button"
            onClick={() => {
              if (exportState?.onExport) {
                exportState.onExport();
              }
            }}
            disabled={exportState?.status === "exporting" || !exportState?.onExport}
            style={{
              display: 'flex',
              height: '36px',
              padding: '8px 16px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              borderRadius: 'var(--border-radius-rounded-md, 8px)',
              border: '1px solid #E5E7EB',
              background: exportState?.status === "exporting" ? '#F3F4F6' : '#FFFFFF',
              cursor: exportState?.status === "exporting" || !exportState?.onExport ? 'not-allowed' : 'pointer',
              fontFamily: "'Open Sans', sans-serif",
              fontSize: '14px',
              fontWeight: 400,
              color: exportState?.status === "exporting" ? '#9CA3AF' : '#111827',
              opacity: exportState?.status === "exporting" || !exportState?.onExport ? 0.6 : 1,
            }}
            className="hover:bg-[#F9FAFB] transition-colors"
          >
            <img
              src={`${env.basePath}/Download.svg`}
              alt="Export"
              width={16}
              height={16}
              style={{
                width: '16px',
                height: '16px',
                display: 'block',
                flexShrink: 0,
              }}
              loading="eager"
            />
            <span>{exportState?.status === "exporting" ? "Exporting..." : "Export"}</span>
          </button>

          {/* Save changes Button */}
          <button
            type="button"
            style={{
              display: 'flex',
              height: '36px',
              padding: '8px 16px',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 'var(--border-radius-rounded-md, 8px)',
              border: 'none',
              background: '#9333EA',
              cursor: 'pointer',
              fontFamily: "'Open Sans', sans-serif",
              fontSize: '14px',
              fontWeight: 500,
              color: '#FFFFFF',
            }}
            className="hover:opacity-90 transition-opacity"
          >
            Save changes
          </button>
        </div>
      </header>
    );
  }

  // Default layout for other pages
  return (
    <header 
      style={{
        display: 'flex',
        width: '1440px',
        height: 'var(--width-w-16, 64px)',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: 'var(--border-width-border, 1px) solid var(--base-border, #E6EAF0)',
        background: 'var(--base-background, #FFF)',
      }}
      className="w-full"
    >
      {/* Left Section */}
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '10px',
          flex: '1 0 0',
        }}
      >
        {/* Logo Container */}
        <div 
          style={{
            display: 'flex',
            width: '256px',
            height: '64px',
            padding: '0 var(--spacing-2-5, 10px)',
            alignItems: 'center',
            gap: 'var(--spacing-2, 8px)',
            borderRight: 'var(--border-width-border, 1px) solid var(--base-border, #E6EAF0)',
            background: 'var(--base-sidebar, #FFF)',
            position: 'relative',
          }}
        >
          {/* Button */}
          <button
            type="button"
            style={{
              display: 'flex',
              width: 'var(--width-w-10, 40px)',
              height: '40px',
              minWidth: '40px',
              maxWidth: '40px',
              minHeight: '40px',
              maxHeight: '40px',
              padding: 'var(--spacing-2, 8px)',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 'var(--spacing-2, 8px)',
              flexShrink: 0,
              aspectRatio: '1/1',
              borderRadius: 'var(--border-radius-rounded-md, 8px)',
              background: 'var(--tailwind-colors-base-transparent, rgba(255, 255, 255, 0.00))',
              border: 'none',
              cursor: 'pointer',
              boxSizing: 'border-box',
            }}
          >
            <img
              src={`${env.basePath}/PanelLeftClose.svg`}
              alt="Menu"
              width={16}
              height={16}
              style={{
                width: '16px',
                height: '16px',
                display: 'block',
                flexShrink: 0,
                objectFit: 'contain',
              }}
              loading="eager"
            />
          </button>
          
          {/* groupize Logo */}
          <div 
            style={{
              width: '182px',
              height: '40px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ 
              fontFamily: "'Open Sans', sans-serif",
              fontSize: '16px',
              fontWeight: 600,
              color: '#111827',
              display: 'inline-flex',
              alignItems: 'center',
            }}>
              group
              <span style={{ 
                color: '#9333EA',
                position: 'relative',
                display: 'inline-block',
              }}>
                i
                {/* Purple star above the 'i' */}
                <img
                  src={`${env.basePath}/aime-star.png`}
                  alt=""
                  style={{
                    position: 'absolute',
                    width: '12px',
                    height: '12px',
                    top: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    pointerEvents: 'none',
                  }}
                  loading="eager"
                />
              </span>
              ze
            </span>
          </div>
          
          {/* Separator */}
          <div 
            style={{
              display: 'flex',
              width: '201px',
              height: '0',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '10px',
              position: 'absolute',
              right: 0,
              bottom: 0,
            }}
          />
        </div>
      </div>

      {/* Tabs Section (Middle) */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-4, 16px)',
        }}
      >
        {/* Logo + Dropdown */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-4, 16px)',
          }}
        >
          {/* Tabs */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-3, 12px)',
            }}
          >
            {/* Portal Tab */}
            <button
              onClick={() => setActiveTab('portal')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: activeTab === 'portal' ? '#F3F4F6' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: activeTab === 'portal' ? '#9333EA' : '#6B7280',
                fontFamily: "'Open Sans', sans-serif",
                fontSize: '14px',
                fontWeight: activeTab === 'portal' ? 600 : 400,
              }}
            >
              <img
                src={`${env.basePath}/LayoutDashboard.svg`}
                alt="Portal"
                width={16}
                height={16}
                style={{ 
                  width: '16px', 
                  height: '16px',
                  flexShrink: 0,
                  filter: activeTab === 'portal' ? 'none' : 'opacity(0.6)',
                }}
                loading="eager"
              />
              <span>Portal</span>
            </button>

            {/* Events Tab */}
            <button
              onClick={() => setActiveTab('events')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: activeTab === 'events' ? '#F3F4F6' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: activeTab === 'events' ? '#9333EA' : '#6B7280',
                fontFamily: "'Open Sans', sans-serif",
                fontSize: '14px',
                fontWeight: activeTab === 'events' ? 600 : 400,
              }}
            >
              <img
                src={`${env.basePath}/BriefcaseBusiness.svg`}
                alt="Events"
                width={16}
                height={16}
                style={{ 
                  width: '16px', 
                  height: '16px',
                  flexShrink: 0,
                  filter: activeTab === 'events' ? 'none' : 'opacity(0.6)',
                }}
                loading="eager"
              />
              <span>Events</span>
            </button>

            {/* Multi Event Reports Tab */}
            <button
              onClick={() => setActiveTab('multi-event')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: activeTab === 'multi-event' ? '#F3F4F6' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: activeTab === 'multi-event' ? '#9333EA' : '#6B7280',
                fontFamily: "'Open Sans', sans-serif",
                fontSize: '14px',
                fontWeight: activeTab === 'multi-event' ? 600 : 400,
              }}
            >
              {/* Clock icon SVG */}
              <svg
                width={16}
                height={16}
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ 
                  width: '16px', 
                  height: '16px',
                  flexShrink: 0,
                  opacity: activeTab === 'multi-event' ? 1 : 0.6,
                }}
              >
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M8 4V8L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
              <span>Multi Event Reports</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div 
        style={{
          display: 'flex',
          paddingRight: 'var(--spacing-6, 24px)',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 'var(--spacing-3, 12px)',
          flex: '1 0 0',
          alignSelf: 'stretch',
        }}
      >
        {/* Dropdown Menu */}
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <button
            style={{
              display: 'flex',
              height: 'var(--height-h-9, 36px)',
              padding: 'var(--spacing-2, 8px) var(--spacing-4, 16px)',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 'var(--spacing-2, 8px)',
              borderRadius: 'var(--border-radius-rounded-md, 8px)',
              border: 'var(--border-width-border, 1px) solid var(--base-input, #E6EAF0)',
              background: 'var(--custom-background-dark-input-30, #FFF)',
              cursor: 'pointer',
              fontFamily: "'Open Sans', sans-serif",
              fontSize: '14px',
              color: '#111827',
            }}
          >
            Newest MRF
            <img
              src={`${env.basePath}/ChevronDown.svg`}
              alt="Dropdown"
              width={12}
              height={12}
              loading="eager"
            />
          </button>
        </div>

        {/* Flag Button */}
        <button
          style={{
            display: 'flex',
            width: 'var(--width-w-10, 40px)',
            height: '40px',
            minWidth: '40px',
            maxWidth: '40px',
            minHeight: '40px',
            maxHeight: '40px',
            padding: 'var(--spacing-2, 8px)',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 'var(--spacing-2, 8px)',
            aspectRatio: '1/1',
            borderRadius: 'var(--border-radius-rounded-md, 8px)',
            background: 'var(--tailwind-colors-base-transparent, rgba(255, 255, 255, 0.00))',
            border: 'none',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          <img
            src={`${env.basePath}/Flag.svg`}
            alt="Flag"
            width={16}
            height={16}
            style={{ 
              width: '16px', 
              height: '16px', 
              flexShrink: 0,
              display: 'block',
              objectFit: 'contain',
            }}
            loading="eager"
          />
        </button>

        {/* AI Button Container */}
        <button
          style={{
            display: 'flex',
            width: 'var(--width-w-10, 40px)',
            height: '40px',
            minWidth: '40px',
            maxWidth: '40px',
            minHeight: '40px',
            maxHeight: '40px',
            padding: 'var(--spacing-2, 8px)',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 'var(--spacing-2, 8px)',
            flexShrink: 0,
            aspectRatio: '1/1',
            borderRadius: 'var(--border-radius-rounded-md, 8px)',
            background: 'var(--tailwind-colors-base-transparent, rgba(255, 255, 255, 0.00))',
            border: 'none',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          <img
            src={`${env.basePath}/Headset.svg`}
            alt="AI"
            width={16}
            height={16}
            style={{
              width: '16px',
              height: '16px',
              display: 'block',
              flexShrink: 0,
              objectFit: 'contain',
            }}
            loading="eager"
          />
        </button>

        {/* Avatar */}
        <div
          style={{
            display: 'flex',
            width: '40px',
            height: 'var(--height-h-10, 40px)',
            justifyContent: 'center',
            alignItems: 'center',
            aspectRatio: '1/1',
            borderRadius: 'var(--border-radius-rounded-full, 9999px)',
            background: 'var(--base-muted, #F1F3F7)',
            cursor: 'pointer',
          }}
        >
          <span style={{
            fontFamily: "'Open Sans', sans-serif",
            fontSize: '14px',
            fontWeight: 600,
            color: '#111827',
          }}>CN</span>
        </div>
      </div>
    </header>
  );
}

