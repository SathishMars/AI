// INSIGHTS-SPECIFIC: Conditionally render TopNavigation based on route
'use client';

import { usePathname } from 'next/navigation';
import TopNavigation from './TopNavigation';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Hide TopNavigation for insights routes (they have their own shell)
  // Pathname includes basePath, so check for both /insights and /aime/insights
  const isInsightsRoute = 
    pathname?.startsWith('/insights') || 
    pathname?.startsWith('/arrivals') ||
    pathname?.includes('/insights/') ||
    pathname?.includes('/arrivals/');
  
  if (isInsightsRoute) {
    // Insights routes use their own full-screen shell
    return <div className="w-full h-screen">{children}</div>;
  }
  
  // Workflow routes use TopNavigation
  return (
    <>
      <TopNavigation />
      <div className="w-full h-[calc(100vh-64px)]">{children}</div>
    </>
  );
}

