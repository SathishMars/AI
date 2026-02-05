// INSIGHTS-SPECIFIC: Navbar component for insights pages (non-arrivals)
"use client";

import { useState, useRef, useEffect } from "react";
import { env } from "@/app/lib/env";
import { useInsightsUI } from "@/app/lib/insights/ui-store";

export function InsightsNavbar() {
  const { aimeOpen, pickColumnsOpen } = useInsightsUI();
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const requestsRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  
  // When AIME panel is minimized, navbar should stretch to cover the space
  const isMinimized = !aimeOpen && !pickColumnsOpen;

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (requestsRef.current && !requestsRef.current.contains(event.target as Node)) {
        setRequestsOpen(false);
      }
      if (previewRef.current && !previewRef.current.contains(event.target as Node)) {
        setPreviewOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <nav
      style={{
        display: 'flex',
        width: '100%',
        maxWidth: isMinimized ? '100%' : '1184px',
        padding: 'var(--spacing-3, 12px) var(--spacing-6, 24px)',
        alignItems: 'center',
        background: 'var(--White, #FFF)',
        boxShadow: '0 -1px 0 0 #E6EAF0 inset',
      }}
      className="w-full"
    >
      <div className="flex items-center justify-between w-full">
        {/* Left: Event name */}
        <div className="text-[14px] font-medium text-[#111827]" style={{ fontFamily: 'sans-serif' }}>
          Big event 2025 Groupize
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Ellipsis menu - first (leftmost) */}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f5f7] hover:bg-[#e5e7eb] transition-colors"
          >
            <img
              src={`${env.basePath}/EllipsisVertical.svg`}
              alt="More options"
              width={16}
              height={16}
              className="h-4 w-4"
              loading="eager"
            />
          </button>

          {/* Requests dropdown - middle */}
          <div className="relative" ref={requestsRef}>
            <button
              type="button"
              onClick={() => {
                setRequestsOpen(!requestsOpen);
                setPreviewOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-[14px] text-[#111827] bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#f9fafb] transition-colors"
            >
              Requests
              <img
                src={`${env.basePath}/ChevronDown.svg`}
                alt="Dropdown"
                width={12}
                height={12}
                className={`transition-transform ${requestsOpen ? 'rotate-180' : ''}`}
                loading="eager"
              />
            </button>
            {requestsOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#e5e7eb] rounded-lg shadow-lg z-10">
                <div className="py-1">
                  <button className="w-full text-left px-4 py-2 text-[14px] text-[#111827] hover:bg-[#f9fafb]">
                    All Requests
                  </button>
                  <button className="w-full text-left px-4 py-2 text-[14px] text-[#111827] hover:bg-[#f9fafb]">
                    Pending
                  </button>
                  <button className="w-full text-left px-4 py-2 text-[14px] text-[#111827] hover:bg-[#f9fafb]">
                    Approved
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Preview dropdown - rightmost */}
          <div className="relative" ref={previewRef}>
            <button
              type="button"
              onClick={() => {
                setPreviewOpen(!previewOpen);
                setRequestsOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-[14px] text-[#111827] bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#f9fafb] transition-colors"
            >
              Preview
              <img
                src={`${env.basePath}/ChevronDown.svg`}
                alt="Dropdown"
                width={12}
                height={12}
                className={`transition-transform ${previewOpen ? 'rotate-180' : ''}`}
                loading="eager"
              />
            </button>
            {previewOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#e5e7eb] rounded-lg shadow-lg z-10">
                <div className="py-1">
                  <button className="w-full text-left px-4 py-2 text-[14px] text-[#111827] hover:bg-[#f9fafb]">
                    Desktop View
                  </button>
                  <button className="w-full text-left px-4 py-2 text-[14px] text-[#111827] hover:bg-[#f9fafb]">
                    Mobile View
                  </button>
                  <button className="w-full text-left px-4 py-2 text-[14px] text-[#111827] hover:bg-[#f9fafb]">
                    Tablet View
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
