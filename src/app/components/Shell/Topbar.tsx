// INSIGHTS-SPECIFIC: Topbar component for insights shell
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useInsightsUI } from "@/app/lib/insights/ui-store";
import { env } from "@/app/lib/env";
import Image from "next/image";

export function InsightsTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { exportState } = useInsightsUI();
  const isArrivalsPage = pathname?.includes('/arrivals');

  return (
    <header 
      style={{
        display: 'flex',
        width: '100%',
        maxWidth: '1440px',
        height: isArrivalsPage ? 'var(--height-h-16, 64px)' : 'var(--width-w-16, 64px)',
        padding: isArrivalsPage ? '0 var(--spacing-10, 40px)' : '0 var(--spacing-6, 24px) 0 var(--spacing-4, 16px)',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: 'var(--border-width-border, 1px) solid var(--base-border, #E6EAF0)',
        background: 'var(--base-background, #FFF)',
        margin: '0 auto',
      }}
      className="w-full"
    >
      <div className="flex h-full items-center justify-between w-full">
        {isArrivalsPage ? (
          <>
            {/* Left: Back Button */}
            <button
              onClick={() => router.back()}
              type="button"
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
              <img
                src={`${env.basePath}/ArrowLeft.svg`}
                alt="Back"
                width={16}
                height={16}
                className="flex-none"
                loading="eager"
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
                    type="button"
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
                    type="button"
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
                    <img
                      src={`${env.basePath}/Download.svg`}
                      alt="Download"
                      width={16}
                      height={16}
                      className="flex-none"
                      loading="eager"
                      style={{ filter: 'brightness(0) invert(1)' }}
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
              {/* Left toggle/menu icon */}
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#f9fafb] transition-colors"
              >
                <img
                  src={`${env.basePath}/PanelLeftClose.svg`}
                  alt="Toggle menu"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                  loading="eager"
                />
              </button>
              
              {/* Brand name with purple .ai */}
              <div className="flex items-center gap-0 text-[14px] font-medium">
                <span className="text-[#111827]">groupize</span>
                <span className="text-[#7c3aed]">.ai</span>
              </div>
              
              {/* Demo dropdown */}
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg border border-[#e5e7eb] bg-[#f5f5f7] px-3 py-1.5 text-[12px] text-[#111827] hover:bg-[#e5e7eb] transition-colors"
              >
                Demo
                <img
                  src={`${env.basePath}/ChevronDown.svg`}
                  alt="Dropdown"
                  width={12}
                  height={12}
                  className="h-3 w-3"
                  loading="eager"
                />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Flag icon */}
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] transition-colors"
              >
                <img
                  src={`${env.basePath}/Flag.svg`}
                  alt="Language"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                  loading="eager"
                />
              </button>
              
              {/* Help icon */}
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] transition-colors"
              >
                <img
                  src={`${env.basePath}/CircleHelp.svg`}
                  alt="Help"
                  width={16}
                  height={16}
                  className="h-4 w-4"
                  loading="eager"
                />
              </button>
              
              {/* User profile avatar */}
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] transition-colors overflow-hidden"
              >
                <Image
                  src={`${env.basePath}/Avatar.png`}
                  alt="User avatar"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                  unoptimized
                />
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

