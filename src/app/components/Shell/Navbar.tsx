// INSIGHTS-SPECIFIC: Navbar component for insights pages (non-attendee)
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
        padding: 'var(--spacing-3, 12px) var(--spacing-6, 24px)',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--White, #FFF)',
        borderBottom: '1px solid var(--base-border, #E6EAF0)',
      }}
      className="w-full"
    >
      {/* Left Section: Back button and Event name */}
      <div className="flex items-center gap-4">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => window.history.back()}
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
            src={`${env.basePath}/CornerUpLeft.svg`}
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

        {/* Event Name */}
        <div 
          style={{ 
            fontFamily: "'Open Sans', sans-serif",
            fontSize: '14px',
            fontWeight: 600,
            color: '#111827',
          }}
        >
          Event Name
        </div>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-2">
        {/* Ellipsis menu button */}
        <button
          type="button"
          style={{
            display: 'flex',
            width: '36px',
            height: '36px',
            minWidth: '36px',
            maxWidth: '36px',
            minHeight: '36px',
            maxHeight: '36px',
            padding: 'var(--spacing-2, 8px)',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 'var(--border-radius-rounded-md, 8px)',
            border: '1px solid var(--base-input, #E6EAF0)',
            background: 'var(--White, #FFF)',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
          className="hover:bg-[#f9fafb] transition-colors"
        >
          <img
            src={`${env.basePath}/EllipsisVertical.svg`}
            alt="More options"
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

        {/* Requests dropdown */}
        <div className="relative" ref={requestsRef}>
          <button
            type="button"
            onClick={() => {
              setRequestsOpen(!requestsOpen);
              setPreviewOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-2, 8px)',
              padding: 'var(--spacing-2, 8px) var(--spacing-3, 12px)',
              borderRadius: 'var(--border-radius-rounded-md, 8px)',
              border: '1px solid var(--base-input, #E6EAF0)',
              background: 'var(--White, #FFF)',
              cursor: 'pointer',
              fontFamily: "'Open Sans', sans-serif",
              fontSize: '14px',
              fontWeight: 400,
              color: '#111827',
            }}
            className="hover:bg-[#f9fafb] transition-colors"
          >
            <span>Requests</span>
            <img
              src={`${env.basePath}/ChevronDown.svg`}
              alt="Dropdown"
              width={12}
              height={12}
              style={{
                width: '12px',
                height: '12px',
                display: 'block',
                flexShrink: 0,
                transform: requestsOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
              loading="eager"
            />
          </button>
          {requestsOpen && (
            <div 
              style={{
                position: 'absolute',
                right: 0,
                marginTop: 'var(--spacing-2, 8px)',
                width: '192px',
                background: 'var(--White, #FFF)',
                border: '1px solid var(--base-input, #E6EAF0)',
                borderRadius: 'var(--border-radius-rounded-md, 8px)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                zIndex: 10,
              }}
            >
              <div style={{ padding: '4px 0' }}>
                <button 
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: 'var(--spacing-2, 8px) var(--spacing-4, 16px)',
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#111827',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  className="hover:bg-[#f9fafb]"
                >
                  All Requests
                </button>
                <button 
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: 'var(--spacing-2, 8px) var(--spacing-4, 16px)',
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#111827',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  className="hover:bg-[#f9fafb]"
                >
                  Pending
                </button>
                <button 
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: 'var(--spacing-2, 8px) var(--spacing-4, 16px)',
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#111827',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  className="hover:bg-[#f9fafb]"
                >
                  Approved
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Preview dropdown */}
        <div className="relative" ref={previewRef}>
          <button
            type="button"
            onClick={() => {
              setPreviewOpen(!previewOpen);
              setRequestsOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-2, 8px)',
              padding: 'var(--spacing-2, 8px) var(--spacing-3, 12px)',
              borderRadius: 'var(--border-radius-rounded-md, 8px)',
              border: '1px solid var(--base-input, #E6EAF0)',
              background: 'var(--White, #FFF)',
              cursor: 'pointer',
              fontFamily: "'Open Sans', sans-serif",
              fontSize: '14px',
              fontWeight: 400,
              color: '#111827',
            }}
            className="hover:bg-[#f9fafb] transition-colors"
          >
            <span>Preview</span>
            <img
              src={`${env.basePath}/ChevronDown.svg`}
              alt="Dropdown"
              width={12}
              height={12}
              style={{
                width: '12px',
                height: '12px',
                display: 'block',
                flexShrink: 0,
                transform: previewOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
              loading="eager"
            />
          </button>
          {previewOpen && (
            <div 
              style={{
                position: 'absolute',
                right: 0,
                marginTop: 'var(--spacing-2, 8px)',
                width: '192px',
                background: 'var(--White, #FFF)',
                border: '1px solid var(--base-input, #E6EAF0)',
                borderRadius: 'var(--border-radius-rounded-md, 8px)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                zIndex: 10,
              }}
            >
              <div style={{ padding: '4px 0' }}>
                <button 
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: 'var(--spacing-2, 8px) var(--spacing-4, 16px)',
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#111827',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  className="hover:bg-[#f9fafb]"
                >
                  Desktop View
                </button>
                <button 
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: 'var(--spacing-2, 8px) var(--spacing-4, 16px)',
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#111827',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  className="hover:bg-[#f9fafb]"
                >
                  Mobile View
                </button>
                <button 
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: 'var(--spacing-2, 8px) var(--spacing-4, 16px)',
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#111827',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  className="hover:bg-[#f9fafb]"
                >
                  Tablet View
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--spacing-2, 8px) var(--spacing-4, 16px)',
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
          Save
        </button>
      </div>
    </nav>
  );
}
