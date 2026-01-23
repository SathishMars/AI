// INSIGHTS-SPECIFIC: Topbar component for insights shell
"use client";

import { ChevronDown, HelpCircle, UserCircle, ChevronLeft, FileDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useInsightsUI } from "@/app/lib/insights/ui-store";

export function InsightsTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { exportState } = useInsightsUI();
  const isArrivalsPage = pathname?.includes('/arrivals');

  return (
    <header className="h-14 w-full border-b border-[#e5e7eb] bg-white">
      <div className="mx-auto flex h-full items-center justify-between px-6 w-full">
        {isArrivalsPage ? (
          <>
            {/* Left: Back Button */}
            <button
              onClick={() => router.back()}
              className="flex flex-row justify-center items-center flex-none rounded-lg"
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '8px 16px',
                gap: '8px',
                width: '89px',
                height: '36px',
                borderRadius: '8px',
                flex: 'none',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <ChevronLeft 
                className="flex-none" 
                style={{ 
                  width: '16px',
                  height: '16px',
                  flex: 'none',
                  color: '#161C24',
                  strokeWidth: 1.33
                }}
              />
              <span 
                className="flex-none flex items-center"
                style={{
                  width: '33px',
                  height: '20px',
                  fontFamily: "'Open Sans', sans-serif",
                  fontStyle: 'normal',
                  fontWeight: 600,
                  fontSize: '14px',
                  lineHeight: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#161C24',
                  flex: 'none'
                }}
              >
                Back
              </span>
            </button>

            {/* Right: Export buttons */}
            <div className="flex flex-row justify-end items-center flex-none gap-3">
              {exportState?.status === "exporting" ? (
                <div className="flex items-center gap-3 rounded-md bg-[#f3f4f6] px-3 py-1.5 border border-[#e5e7eb]">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a855f7] border-t-transparent"></div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#111827]">{exportState.progress}%</span>
                    <span className="text-[10px] text-[#6b7280] truncate max-w-[100px]">{exportState.message}</span>
                  </div>
                </div>
              ) : (
                <>
                  {exportState?.status === "error" && (
                    <div className="mr-2 flex items-center gap-2 text-xs text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100 shadow-sm">
                      <span className="max-w-[150px] truncate" title={exportState.message}>{exportState.message || "Export failed"}</span>
                      <div className="flex items-center gap-1 border-l border-red-200 pl-2 ml-1">
                        {exportState.onRetry && (
                          <button onClick={exportState.onRetry} className="font-semibold hover:underline">Retry</button>
                        )}
                        {exportState.onDismiss && (
                          <button onClick={exportState.onDismiss} className="text-red-400 hover:text-red-600">✕</button>
                        )}
                      </div>
                    </div>
                  )}
                  <button 
                    className="flex flex-row justify-center items-center flex-none rounded-lg"
                    style={{
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '8px 16px',
                      gap: '8px',
                      width: '162px',
                      height: '36px',
                      background: '#FFFFFF',
                      border: '1px solid #E6EAF0',
                      borderRadius: '8px',
                      flex: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <span 
                      className="flex-none flex items-center"
                      style={{
                        width: '130px',
                        height: '20px',
                        fontFamily: "'Open Sans', sans-serif",
                        fontStyle: 'normal',
                        fontWeight: 600,
                        fontSize: '14px',
                        lineHeight: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#161C24',
                        flex: 'none'
                      }}
                    >
                      Save to My Reports
                    </span>
                  </button>
                  <button
                    onClick={() => exportState?.onExport()}
                    className="flex flex-row justify-center items-center flex-none rounded-lg"
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '8px 16px',
                      gap: '8px',
                      width: '101px',
                      height: '36px',
                      background: '#9333EA',
                      borderRadius: '8px',
                      flex: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <FileDown 
                      className="flex-none" 
                      style={{ 
                        width: '16px',
                        height: '16px',
                        flex: 'none',
                        color: '#FBFCFE',
                        strokeWidth: 1.33
                      }}
                    />
                    <span 
                      className="flex-none flex items-center"
                      style={{
                        width: '45px',
                        height: '20px',
                        fontFamily: "'Open Sans', sans-serif",
                        fontStyle: 'normal',
                        fontWeight: 600,
                        fontSize: '14px',
                        lineHeight: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#FBFCFE',
                        flex: 'none'
                      }}
                    >
                      Export
                    </span>
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </header>
  );
}

