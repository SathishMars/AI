// INSIGHTS-SPECIFIC: Topbar component for insights shell
"use client";

import { ChevronDown, HelpCircle, UserCircle } from "lucide-react";

export function InsightsTopbar() {
  return (
    <header className="h-14 w-full border-b border-[#e5e7eb] bg-white">
      <div className="mx-auto flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-3">
          {/* Logo icon: square with vertical divider and right arrow */}
          <div className="relative h-5 w-5">
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
              {/* Outer square with dark outline */}
              <rect x="0.5" y="0.5" width="19" height="19" rx="2" stroke="#111827" strokeWidth="1" fill="none" />
              {/* Thin vertical bar on the left */}
              <line x1="5" y1="3" x2="5" y2="17" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" />
              {/* Smaller square on the right */}
              <rect x="7" y="6" width="10" height="8" rx="1" stroke="#111827" strokeWidth="1.5" fill="none" />
              {/* Right-pointing arrow inside the square */}
              <path d="M11 9L14 10L11 11" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <line x1="14" y1="10" x2="15.5" y2="10" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          
          {/* Brand name with purple .ai */}
          <div className="flex items-center gap-0 text-[14px] font-medium">
            <span className="text-[#111827]">groupize</span>
            <span className="text-[#7c3aed]">.ai</span>
          </div>
          
          {/* Demo dropdown */}
          <button className="flex items-center gap-1 rounded-lg border border-[#e5e7eb] bg-[#f5f5f7] px-3 py-1.5 text-[12px] text-[#111827] hover:bg-[#e5e7eb] transition-colors">
            Demo
            <ChevronDown className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* US Flag icon */}
          <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] transition-colors">
            <svg
              viewBox="0 0 20 15"
              className="h-5 w-5 rounded-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Red and white stripes */}
              <rect width="20" height="1.15" fill="#B22234" />
              <rect y="1.15" width="20" height="1.15" fill="white" />
              <rect y="2.3" width="20" height="1.15" fill="#B22234" />
              <rect y="3.45" width="20" height="1.15" fill="white" />
              <rect y="4.6" width="20" height="1.15" fill="#B22234" />
              <rect y="5.75" width="20" height="1.15" fill="white" />
              <rect y="6.9" width="20" height="1.15" fill="#B22234" />
              {/* Blue canton */}
              <rect width="8" height="6.9" fill="#3C3B6E" />
              {/* Stars (simplified as small circles) */}
              <circle cx="1.5" cy="1.2" r="0.4" fill="white" />
              <circle cx="3" cy="1.2" r="0.4" fill="white" />
              <circle cx="4.5" cy="1.2" r="0.4" fill="white" />
              <circle cx="6" cy="1.2" r="0.4" fill="white" />
              <circle cx="7.5" cy="1.2" r="0.4" fill="white" />
              <circle cx="2.25" cy="2.4" r="0.4" fill="white" />
              <circle cx="3.75" cy="2.4" r="0.4" fill="white" />
              <circle cx="5.25" cy="2.4" r="0.4" fill="white" />
              <circle cx="6.75" cy="2.4" r="0.4" fill="white" />
            </svg>
          </button>
          
          {/* Question mark icon */}
          <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] transition-colors">
            <HelpCircle className="h-4 w-4 text-[#111827]" strokeWidth={2} />
          </button>
          
          {/* User profile icon */}
          <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5e7eb] bg-[#f3f4f6] hover:bg-[#e5e7eb] transition-colors">
            <UserCircle className="h-5 w-5 text-[#6b7280]" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}

